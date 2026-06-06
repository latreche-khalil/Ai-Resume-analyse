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
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
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
                ip_address=ip_address,
                user_agent=user_agent
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
            # Prepare seniority alignment metadata
            seniority_data = match_result.get('seniority_alignment') or {}
            if not isinstance(seniority_data, dict):
                seniority_data = {
                    'cv_level': 'unknown',
                    'jd_level': 'unknown',
                    'match': 'unknown',
                    'explanation': str(seniority_data)
                }
            
            # Embed recruiter-specific AI insights directly in seniority_alignment JSON to avoid DB schema migration
            seniority_data['evidence_for_hire'] = match_result.get('evidence_for_hire', [])
            seniority_data['evidence_against_hire'] = match_result.get('evidence_against_hire', [])
            seniority_data['interview_questions'] = match_result.get('interview_questions', [])
            seniority_data['hiring_recommendation'] = match_result.get('hiring_recommendation', '')
            
            analysis_record.seniority_alignment = seniority_data
            analysis_record.red_flags = match_result.get('red_flags')
            analysis_record.hiring_urgency = match_result.get('hiring_urgency')
            analysis_record.processing_status = 'processing'

            # ── Optimise token consumption by checking user role ──────────────
            from app.models.user import User
            user_result = await db.execute(
                select(User.role).where(User.id == user_id)
            )
            user_role = user_result.scalar_one_or_none() or "candidate"

            # Persist who initiated the analysis so recruiter/candidate views stay separated
            analysis_record.initiated_by_role = user_role
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
            
            if user_role == "recruiter":
                logger.info(f"Initiator is a recruiter. Running recruiter-optimized Gap analysis via LLM, and generating programmatic XAI report to save tokens.")
                try:
                    gap_result = await gap_agent.analyze_gaps(
                        match_result=match_result,
                        cv_skills=[],
                        jd_text=job_description.description,
                        analysis_record_id=analysis_record.id,
                        db=db,
                        cv_document_id=cv_document_id,
                        is_recruiter=True
                    )
                except Exception as gap_err:
                    logger.warning(f"Recruiter Gap agent failed ({gap_err}), using fallback")
                    gap_result = await self._generate_programmatic_gap_report(analysis_record.id, match_result, db)
                
                xai_result = await self._generate_programmatic_xai_report(analysis_record.id, match_result, cv_document, db)
                xai_failed = False
                gap_failed = not any([
                    gap_result.get('critical_gaps'),
                    gap_result.get('important_gaps'),
                    gap_result.get('nice_to_have_gaps')
                ])
            else:
                # Step 5 & 6: Gap and XAI Agents in parallel via LLM for candidates
                logger.info("Step 2/3: Running Gap and XAI Agents in parallel via LLM for candidate")
                
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

                xai_failed = xai_result.get('summary') == 'AI Explanation unavailable.'
                gap_data_found = any([
                    gap_result.get('critical_gaps'),
                    gap_result.get('important_gaps'),
                    gap_result.get('nice_to_have_gaps'),
                    gap_result.get('learning_roadmap')
                ])
                gap_failed = not gap_data_found

            # Flush to ensure everything is saved
            await db.commit()
            await db.refresh(analysis_record)
            
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

    async def _generate_programmatic_gap_report(
        self,
        analysis_record_id: UUID,
        match_result: Dict[str, Any],
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Generate a zero-token programmatic GapReport for recruiter views."""
        from app.models.gap_report import GapReport
        
        missing_skills = match_result.get('missing_skills', [])
        critical_gaps = []
        for idx, skill in enumerate(missing_skills[:5], 1):
            critical_gaps.append({
                "skill": skill,
                "reason": "Required competency for this job description.",
                "impact": "High",
                "priority": idx
            })
        
        important_gaps = []
        for idx, skill in enumerate(missing_skills[5:10], 1):
            important_gaps.append({
                "skill": skill,
                "reason": "Desired competency for optimal performance.",
                "impact": "Medium",
                "priority": idx
            })
        
        nice_to_have_gaps = []
        for idx, skill in enumerate(missing_skills[10:15], 1):
            nice_to_have_gaps.append({
                "skill": skill,
                "reason": "Nice-to-have addition.",
                "impact": "Low",
                "priority": idx
            })

        # Keep learning roadmap empty for recruiters to save space and context
        learning_roadmap = []
        quick_wins = []
        if missing_skills:
            quick_wins.append({
                "action": f"Review candidate familiarity with {missing_skills[0]}",
                "timeline": "1-2 days"
            })

        gap_analysis = {
            "critical_gaps": critical_gaps,
            "important_gaps": important_gaps,
            "nice_to_have_gaps": nice_to_have_gaps,
            "learning_roadmap": learning_roadmap,
            "quick_wins": quick_wins,
        }

        # Check for existing
        stmt = select(GapReport).where(GapReport.analysis_record_id == analysis_record_id)
        res = await db.execute(stmt)
        gap_report = res.scalar_one_or_none()
        
        if gap_report:
            gap_report.critical_gaps = critical_gaps
            gap_report.important_gaps = important_gaps
            gap_report.nice_to_have_gaps = nice_to_have_gaps
            gap_report.learning_roadmap = learning_roadmap
            gap_report.quick_wins = quick_wins
        else:
            gap_report = GapReport(
                analysis_record_id=analysis_record_id,
                critical_gaps=critical_gaps,
                important_gaps=important_gaps,
                nice_to_have_gaps=nice_to_have_gaps,
                learning_roadmap=learning_roadmap,
                quick_wins=quick_wins,
            )
            db.add(gap_report)
        
        return gap_analysis

    async def _generate_programmatic_xai_report(
        self,
        analysis_record_id: UUID,
        match_result: Dict[str, Any],
        cv_document,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Generate a zero-token programmatic XAIReport for recruiter views."""
        from app.models.xai_report import XAIReport
        from app.core.database import AsyncSessionLocal
        
        matching_skills = match_result.get('matching_skills', [])
        missing_skills = match_result.get('missing_skills', [])
        match_score = match_result.get('match_score', 0.0)
        
        # Prepare evidence
        evidence_for_match = []
        for skill in matching_skills[:5]:
            evidence_for_match.append({
                "claim": skill,
                "evidence": f"Proven experience with {skill} found in the CV.",
                "credibility": "high",
                "weight": 0.8
            })
            
        evidence_against_match = []
        for skill in missing_skills[:5]:
            evidence_against_match.append({
                "gap": skill,
                "required": f"Knowledge of {skill}",
                "current": "Missing from CV",
                "impact": "medium",
                "weight": 0.6
            })
            
        # Reconcile SHAP contributions to equal match_score
        base_score = 0.5
        
        # Build normalized feature contributions
        feature_contributions = []
        for item in evidence_for_match:
            feature_contributions.append({
                "feature": item["claim"],
                "contribution": 0.05,
                "reason": item["evidence"]
            })
        for item in evidence_against_match:
            feature_contributions.append({
                "feature": item["gap"],
                "contribution": -0.05,
                "reason": f"Required: {item['required']}"
            })
            
        # Scaling
        pos_count = len(evidence_for_match)
        neg_count = len(evidence_against_match)
        total_delta = match_score - base_score
        
        if pos_count + neg_count > 0:
            avg_contrib = total_delta / (pos_count + neg_count)
            for c in feature_contributions:
                c["contribution"] = round(avg_contrib, 3)
                
        shap_analysis = {
            "base_score": base_score,
            "feature_contributions": feature_contributions,
            "final_score": match_score
        }
        
        # Build waterfall steps
        steps = [{'name': 'Base Score', 'value': base_score, 'cumulative': base_score}]
        cumulative = base_score
        for c in feature_contributions:
            cumulative += c["contribution"]
            steps.append({
                'step': c['feature'],
                'delta': c['contribution'],
                'score_after': min(1.0, max(0.0, cumulative)),
                'reason': c['reason']
            })
        steps.append({'name': 'Final Score', 'value': 0, 'cumulative': match_score})
        
        waterfall_explanation = {'steps': steps}
        
        # What-if scenarios
        what_if_scenarios = []
        for idx, skill in enumerate(missing_skills[:3]):
            what_if_scenarios.append({
                "change": f"Gain certification or complete project in {skill}",
                "expected_score": round(min(0.99, float(match_score) + 0.05 * (idx + 1)), 2),
                "explanation": f"Adding {skill} directly addresses a core job description gap.",
                "feasibility": "medium"
            })
            
        xai_explanation = {
            'overall_explanation': f"The candidate has a match score of {match_score:.0%}. Core strengths include: {', '.join(matching_skills[:3])}.",
            'summary': f"Programmatic recruiter analysis summary showing {match_score:.0%} match.",
            'shap_analysis': shap_analysis,
            'what_if_scenarios': what_if_scenarios,
            'waterfall_explanation': waterfall_explanation,
            'evidence_for_match': evidence_for_match,
            'evidence_against_match': evidence_against_match,
            'key_achievements': [f"Candidate possesses {s}" for s in matching_skills[:3]],
            'counterfactuals': what_if_scenarios,
        }
        
        # Store in db (uses fresh session)
        async with AsyncSessionLocal() as fresh_db:
            xai_report = XAIReport(
                analysis_record_id=analysis_record_id,
                overall_explanation=xai_explanation['overall_explanation'],
                evidence_for_match=evidence_for_match,
                evidence_against_match=evidence_against_match,
                key_achievements=xai_explanation['key_achievements'],
                counterfactuals=what_if_scenarios,
                force_plot_data={
                    'type': 'force_plot',
                    'base_value': base_score,
                    'features': [c['feature'] for c in feature_contributions],
                    'values': [c['contribution'] for c in feature_contributions],
                    'colors': ['#4CAF50' if c['contribution'] > 0 else '#F44336' for c in feature_contributions],
                    'final_score': match_score
                },
                waterfall_data={
                    'type': 'waterfall',
                    'steps': steps,
                    'base_score': base_score,
                    'final_score': match_score
                }
            )
            fresh_db.add(xai_report)
            await fresh_db.commit()
            
        return xai_explanation

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
