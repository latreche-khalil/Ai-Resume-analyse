"""
Multi-Agent Orchestrator.

Coordinates all AI agents for CV processing and matching.

Requirements: 4.1, 6.1, 7.1, 8.1, 9.1, 10.1
"""
import asyncio
from typing import Dict, Any, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.cv_document import CVDocument
from app.models.job_description import JobDescription
from app.models.analysis_record import AnalysisRecord
from app.services.privacy.privacy_gateway import privacy_gateway
from app.services.agents.extraction_agent import extraction_agent
from app.services.nlp.rag_pipeline import rag_pipeline
from app.services.agents.matching_agent import matching_agent
from app.services.agents.gap_agent import gap_agent
from app.services.agents.xai_agent import xai_agent
from app.utils.logger import logger


class MultiAgentOrchestrator:
    """
    Multi-Agent Orchestrator coordinating all AI agents.
    
    Workflows:
    1. CV Processing: Privacy Gateway → Extraction Agent → RAG Pipeline
    2. CV-JD Matching: RAG Retrieval → Matching Agent → Gap Agent → XAI Agent
    
    Requirements: 4.1, 6.1, 7.1, 8.1, 9.1, 10.1
    """
    
    async def process_cv_document(
        self,
        document_id: UUID,
        db: AsyncSession,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process CV document through Privacy Gateway, Extraction, and RAG.
        
        Workflow:
        1. Get document from database
        2. Privacy Gateway: Detect and mask PII
        3. Extraction Agent: Extract structured data
        4. RAG Pipeline: Generate embeddings
        
        Args:
            document_id: CV document ID
            db: Database session
            ip_address: IP address for audit logging
            
        Returns:
            Processing results
            
        Requirements: 4.1, 6.1, 7.1
        """
        try:
            logger.info(f"Starting CV processing for document: {document_id}")
            
            # Step 1: Get document
            result = await db.execute(
                select(CVDocument).where(CVDocument.id == document_id)
            )
            document = result.scalar_one_or_none()
            
            if not document:
                raise ValueError(f"Document not found: {document_id}")
            
            if not document.extracted_text:
                raise ValueError("Document has no extracted text")
            
            # Step 2: Privacy Gateway - Mask PII
            logger.info("Step 1/3: Privacy Gateway - Masking PII")
            masked_text, pii_mappings = await privacy_gateway.mask_pii(
                text=document.extracted_text,
                user_id=document.user_id,
                document_id=document_id,
                language=document.detected_language or 'en',
                db=db,
                ip_address=ip_address
            )
            
            # Update document with masked text
            document.masked_text = masked_text
            await db.commit()
            
            # Step 3: Extraction Agent - Extract structured data
            logger.info("Step 2/3: Extraction Agent - Extracting skills")
            extracted_data = await extraction_agent.extract_structured_data(
                masked_text=masked_text,
                language=document.detected_language or 'en',
                db=db
            )
            
            # Store extraction results
            skill_report = await extraction_agent.store_extraction_results(
                document_id=str(document_id),
                extracted_data=extracted_data,
                db=db
            )
            
            # Step 4: RAG Pipeline - Generate embeddings
            logger.info("Step 3/3: RAG Pipeline - Generating embeddings")
            chunks, embeddings = await rag_pipeline.chunk_and_embed(
                document_id=document_id,
                text=masked_text,
                language=document.detected_language or 'en'
            )
            
            logger.info(f"CV processing completed for document: {document_id}")
            
            return {
                'document_id': str(document_id),
                'pii_entities_masked': len(pii_mappings),
                'skills_extracted': len(extracted_data['skills']),
                'chunks_created': len(chunks),
                'extraction_confidence': extracted_data['extraction_confidence'],
                'flagged_for_review': extracted_data['flagged_for_review']
            }
            
        except Exception as e:
            logger.error(f"CV processing error: {str(e)}")
            raise
    
    async def match_cv_to_jd(
        self,
        analysis_id: UUID,
        cv_document_id: UUID,
        job_description_id: UUID,
        user_id: UUID,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Match CV to job description through all agents.
        
        Workflow:
        1. Get existing analysis record
        2. Get CV and JD from database
        3. RAG Retrieval: Get relevant CV chunks
        4. Matching Agent: Calculate match score
        5. Gap Agent: Analyze skill gaps
        6. XAI Agent: Generate explanations
        7. Update analysis record
        
        Args:
            analysis_id: Analysis record ID
            cv_document_id: CV document ID
            job_description_id: Job description ID
            user_id: User ID
            db: Database session
            
        Returns:
            Complete analysis results
            
        Requirements: 7.1, 8.1, 9.1, 10.1
        """
        try:
            logger.info(
                f"Starting CV-JD matching: Analysis={analysis_id}, CV={cv_document_id}, JD={job_description_id}"
            )
            
            # Step 1: Get existing analysis record
            analysis_result = await db.execute(
                select(AnalysisRecord).where(AnalysisRecord.id == analysis_id)
            )
            analysis_record = analysis_result.scalar_one_or_none()
            
            if not analysis_record:
                raise ValueError(f"Analysis record {analysis_id} not found")
            
            # Step 2: Get CV document
            cv_result = await db.execute(
                select(CVDocument).where(CVDocument.id == cv_document_id)
            )
            cv_document = cv_result.scalar_one_or_none()
            
            if not cv_document or not cv_document.masked_text:
                raise ValueError("CV document not found or not processed")
            
            # Get skill report
            from app.models.skill_report import SkillReport
            skill_result = await db.execute(
                select(SkillReport).where(SkillReport.document_id == cv_document_id)
            )
            skill_report = skill_result.scalar_one_or_none()
            
            # Step 3: Get job description
            jd_result = await db.execute(
                select(JobDescription).where(JobDescription.id == job_description_id)
            )
            job_description = jd_result.scalar_one_or_none()
            
            if not job_description:
                raise ValueError("Job description not found")
            
            # Match CV to JD using Matching Agent
            logger.info(f"Step 2/3: Matching Agent for analysis {analysis_id}")
            try:
                match_result = await matching_agent.match(
                    masked_cv=cv_document.masked_text,
                    job_description=job_description.description,
                    cv_document_id=cv_document_id,
                    jd_id=job_description_id,
                    db=db
                )
            except Exception as match_err:
                logger.warning(f"Matching agent failed ({match_err}), using local fallback")
                match_result = self._local_match_fallback(
                    cv_text=cv_document.masked_text,
                    jd_text=job_description.description,
                    skill_report=skill_report
                )
            
            # Update analysis record with match results
            logger.info(f"Matching Agent returned score: {match_result.get('match_score')} for analysis {analysis_id}")
            analysis_record.match_score = match_result.get('match_score', 0.0)
            
            # Deduplicate: Ensure matching and missing skills are mutually exclusive
            matching_set = {s.lower() for s in match_result['matching_skills']}
            filtered_missing = [s for s in match_result['missing_skills'] if s.lower() not in matching_set]
            match_result['missing_skills'] = filtered_missing
            
            analysis_record.matching_skills = match_result['matching_skills']
            analysis_record.missing_skills = match_result['missing_skills']
            analysis_record.transferable_skills = match_result['transferable_skills']
            analysis_record.seniority_alignment = match_result.get('seniority_alignment')
            analysis_record.red_flags = match_result.get('red_flags')
            analysis_record.hiring_urgency = match_result.get('hiring_urgency')
            analysis_record.processing_status = 'processing'

            # ── Human-in-the-Loop: always non-binding ──────────────────────
            from app.models.analysis_record import HUMAN_REVIEW_CONFIDENCE_THRESHOLD
            
            # Convert string confidence (high/medium/low) to float
            conf_raw = match_result.get('confidence', match_result['match_score'])
            if isinstance(conf_raw, str):
                conf_map = {'high': 0.95, 'medium': 0.75, 'low': 0.45}
                confidence = conf_map.get(conf_raw.lower(), 0.70) # Default to threshold if unknown
            else:
                confidence = float(conf_raw)

            analysis_record.is_binding = False          # NEVER binding
            analysis_record.confidence_score = round(confidence, 2)
            analysis_record.requires_human_review = confidence < HUMAN_REVIEW_CONFIDENCE_THRESHOLD
            if analysis_record.requires_human_review:
                analysis_record.human_review_status = 'pending_review'
                logger.info(
                    f"Analysis {analysis_id} flagged for human review "
                    f"(confidence={confidence:.2f} < {HUMAN_REVIEW_CONFIDENCE_THRESHOLD})"
                )

            await db.commit()
            
            # Step 5 & 6: Gap and XAI Agents in parallel
            logger.info("Step 2/3: Running Gap and XAI Agents in parallel")
            
            async def run_gap():
                try:
                    return await gap_agent.analyze_gaps(
                        match_result=match_result,
                        cv_skills=[],  
                        jd_text=job_description.description,
                        analysis_record_id=analysis_record.id,
                        db=db,
                        cv_document_id=cv_document_id,
                    )
                except Exception as gap_err:
                    logger.warning(f"Gap agent failed ({gap_err}), using empty result")
                    return {'critical_gaps': [], 'important_gaps': [], 'nice_to_have_gaps': [], 'learning_roadmap': [], 'quick_wins': []}

            async def run_xai():
                try:
                    return await xai_agent.explain(
                        match_result=match_result,
                        cv_text=cv_document.masked_text,
                        jd_text=job_description.description,
                        analysis_record_id=analysis_record.id,
                        language=cv_document.detected_language or 'en',
                        db=db,
                        cv_document_id=cv_document_id
                    )
                except Exception as xai_err:
                    logger.warning(f"XAI agent failed ({xai_err}), returning empty results.")
                    return {
                        'summary': 'AI Explanation unavailable.',
                        'overall_explanation': 'Could not generate AI explanation at this time.',
                        'evidence_for_match': [],
                        'evidence_against_match': [],
                        'counterfactuals': []
                    }

            # Run agents sequentially to avoid free tier rate limits/concurrency issues
            gap_result = await run_gap()
            xai_result = await run_xai()

            # Flush to ensure everything is saved
            await db.commit()
            await db.refresh(analysis_record)

            xai_failed = xai_result.get('summary') == 'AI Explanation unavailable.'
            gap_data_found = any([
                gap_result.get('critical_gaps'),
                gap_result.get('important_gaps'),
                gap_result.get('nice_to_have_gaps'),
                gap_result.get('learning_roadmap')
            ])
            gap_failed = not gap_data_found

            # Update analysis status — partial_done if any agent failed
            gap_data_found = any([
                gap_result.get('critical_gaps'),
                gap_result.get('important_gaps'),
                gap_result.get('nice_to_have_gaps'),
                gap_result.get('learning_roadmap')
            ])
            gap_failed = not gap_data_found
            
            if xai_failed or gap_failed:
                analysis_record.processing_status = 'partial_done'
                analysis_record.is_partial = True
            else:
                analysis_record.processing_status = 'completed'
                analysis_record.is_partial = False
                
            await db.commit()
            await db.refresh(analysis_record)
            
            logger.info(f"Final analysis status: {analysis_record.processing_status} (id: {analysis_record.id})")
            
            logger.info(f"CV-JD matching completed: {analysis_record.id}")
            
            return {
                'analysis_id': str(analysis_record.id),
                'match_score': match_result['match_score'],
                'matching_skills': match_result['matching_skills'],
                'missing_skills': match_result['missing_skills'],
                'transferable_skills': match_result['transferable_skills'],
                'gap_analysis': gap_result,
                'xai_explanation': xai_result,
                'status': 'completed'
            }
            
        except Exception as e:
            logger.error(f"CV-JD matching error: {str(e)}")

            # Update analysis status to failed
            if 'analysis_record' in locals() and analysis_record:
                analysis_record.processing_status = 'failed'
                analysis_record.error_message = str(e)
                await db.commit()
            
            raise

    def _local_match_fallback(
        self,
        cv_text: str,
        jd_text: str,
        skill_report=None
    ) -> Dict[str, Any]:
        """
        Local keyword-based matching when OpenRouter is unavailable.
        Compares CV skills against JD keywords.
        """
        import re

        def extract_keywords(text: str):
            words = set(re.findall(r'\b[a-zA-Z][a-zA-Z0-9+#.]*\b', text.lower()))
            # Filter short/common words
            stopwords = {'the', 'and', 'for', 'with', 'you', 'are', 'our', 'have',
                         'will', 'must', 'can', 'this', 'that', 'from', 'your'}
            return {w for w in words if len(w) > 2 and w not in stopwords}

        cv_keywords  = extract_keywords(cv_text)
        jd_keywords  = extract_keywords(jd_text)

        # Get CV skills from skill_report if available
        cv_skills = []
        if skill_report and skill_report.skills:
            cv_skills = [s.get('name', '').lower() for s in skill_report.skills if isinstance(s, dict)]
            cv_keywords.update(cv_skills)

        matching = list(cv_keywords & jd_keywords)
        missing  = list(jd_keywords - cv_keywords)

        # Score = intersection / JD keywords
        score = len(matching) / max(len(jd_keywords), 1)
        score = min(round(score, 2), 1.0)

        logger.info(f"Local match fallback: score={score}, matching={len(matching)}, missing={len(missing)}")

        return {
            'match_score':         score,
            'matching_skills':     matching[:20],
            'missing_skills':      missing[:20],
            'transferable_skills': [],
            'summary':             f'Local keyword match: {score*100:.0f}% overlap'
        }


# Global multi-agent orchestrator instance
multi_agent_orchestrator = MultiAgentOrchestrator()
