"""
Batch Ranking Service - Talent Leaderboard Generation.

This service ranks multiple CVs against a job description using:
1. Semantic Search (ChromaDB + Vector Embeddings)
2. Multi-dimensional scoring
3. Intelligent ranking algorithms

Requirements: Recruiter Tools, ATS Integration
"""
import asyncio
from typing import List, Dict, Any, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.cv_document import CVDocument
from app.models.job_description import JobDescription
from app.models.skill_report import SkillReport
from app.services.nlp.rag_pipeline import rag_pipeline
from app.services.agents.matching_agent import matching_agent
from app.utils.logger import logger


class BatchRankingService:
    """
    Batch Ranking Service for comparing multiple candidates.
    
    Features:
    - Semantic similarity using ChromaDB
    - Multi-dimensional scoring (skills, experience, cultural fit)
    - Intelligent ranking with tie-breaking
    - Batch processing with concurrency control
    """
    
    # Concurrency limit for batch processing
    MAX_CONCURRENT_ANALYSES = 5
    
    async def rank_candidates(
        self,
        cv_ids: List[UUID],
        job_description_id: UUID,
        db: AsyncSession,
        ranking_criteria: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Rank multiple candidates against a job description.
        
        Args:
            cv_ids: List of CV document IDs to rank
            job_description_id: Job description to match against
            db: Database session
            ranking_criteria: Optional weights for ranking dimensions
                {
                    'semantic_similarity': 0.3,
                    'skills_match': 0.4,
                    'experience_level': 0.2,
                    'cultural_fit': 0.1
                }
        
        Returns:
            Ranked leaderboard with detailed scores
        """
        try:
            logger.info(f"Starting batch ranking for {len(cv_ids)} candidates")
            
            # Default ranking criteria
            if not ranking_criteria:
                ranking_criteria = {
                    'semantic_similarity': 0.30,
                    'skills_match': 0.40,
                    'experience_level': 0.20,
                    'cultural_fit': 0.10
                }
            
            # Get job description
            jd_result = await db.execute(
                select(JobDescription).where(JobDescription.id == job_description_id)
            )
            job_description = jd_result.scalar_one_or_none()
            
            if not job_description:
                raise ValueError("Job description not found")
            
            # Get all CV documents
            cv_result = await db.execute(
                select(CVDocument).where(CVDocument.id.in_(cv_ids))
            )
            cv_documents = cv_result.scalars().all()
            
            if not cv_documents:
                raise ValueError("No CV documents found")
            
            # Step 1: Semantic Similarity (using ChromaDB)
            semantic_scores = await self._calculate_semantic_similarity(
                cv_documents=cv_documents,
                job_description=job_description
            )
            
            # Step 2: Skills Match (using Matching Agent)
            skills_scores = await self._calculate_skills_match(
                cv_documents=cv_documents,
                job_description=job_description,
                db=db
            )
            
            # Step 3: Experience Level Analysis
            experience_scores = await self._analyze_experience_level(
                cv_documents=cv_documents,
                job_description=job_description,
                db=db
            )
            
            # Step 4: Cultural Fit Indicators
            cultural_scores = await self._analyze_cultural_fit(
                cv_documents=cv_documents,
                job_description=job_description
            )
            
            # Step 5: Calculate composite scores and rank
            ranked_candidates = self._calculate_composite_ranking(
                cv_documents=cv_documents,
                semantic_scores=semantic_scores,
                skills_scores=skills_scores,
                experience_scores=experience_scores,
                cultural_scores=cultural_scores,
                ranking_criteria=ranking_criteria
            )
            
            logger.info(f"Batch ranking completed for {len(ranked_candidates)} candidates")
            
            return {
                'job_description_id': str(job_description_id),
                'job_title': job_description.title,
                'total_candidates': len(ranked_candidates),
                'ranking_criteria': ranking_criteria,
                'leaderboard': ranked_candidates,
                'statistics': self._calculate_statistics(ranked_candidates)
            }
            
        except Exception as e:
            logger.error(f"Batch ranking error: {str(e)}")
            raise
    
    async def _calculate_semantic_similarity(
        self,
        cv_documents: List[CVDocument],
        job_description: JobDescription
    ) -> Dict[UUID, float]:
        """
        Calculate semantic similarity using ChromaDB vector search.
        
        Returns:
            Dict mapping CV ID to similarity score (0.0-1.0)
        """
        scores = {}
        
        try:
            # Use job description as query
            jd_text = job_description.description[:1000]
            
            for cv in cv_documents:
                try:
                    # Search for relevant chunks in this CV
                    chunks = await rag_pipeline.semantic_search(
                        query=jd_text,
                        document_ids=[cv.id],
                        top_k=5
                    )
                    
                    if chunks:
                        # Average similarity of top chunks
                        avg_similarity = sum(chunk['similarity'] for chunk in chunks) / len(chunks)
                        scores[cv.id] = avg_similarity
                    else:
                        # No embeddings found, use fallback
                        scores[cv.id] = 0.5
                        
                except Exception as e:
                    logger.warning(f"Semantic search failed for CV {cv.id}: {e}")
                    scores[cv.id] = 0.5
            
            logger.info(f"Semantic similarity calculated for {len(scores)} CVs")
            return scores
            
        except Exception as e:
            logger.error(f"Semantic similarity calculation error: {e}")
            # Return default scores
            return {cv.id: 0.5 for cv in cv_documents}
    
    async def _calculate_skills_match(
        self,
        cv_documents: List[CVDocument],
        job_description: JobDescription,
        db: AsyncSession
    ) -> Dict[UUID, Dict[str, Any]]:
        """
        Calculate skills match using Matching Agent (with concurrency control).
        
        Returns:
            Dict mapping CV ID to match details
        """
        scores = {}
        
        # Process in batches to avoid overwhelming the system
        semaphore = asyncio.Semaphore(self.MAX_CONCURRENT_ANALYSES)
        
        async def process_cv(cv: CVDocument):
            async with semaphore:
                try:
                    match_result = await matching_agent.match(
                        masked_cv=cv.masked_text or cv.extracted_text or "",
                        job_description=job_description.description,
                        cv_document_id=cv.id,
                        jd_id=job_description.id,
                        db=db
                    )
                    return cv.id, match_result
                except Exception as e:
                    logger.warning(f"Matching failed for CV {cv.id}: {e}")
                    return cv.id, {'match_score': 0.5, 'matching_skills': [], 'missing_skills': []}
        
        # Process all CVs concurrently (with limit)
        tasks = [process_cv(cv) for cv in cv_documents]
        results = await asyncio.gather(*tasks)
        
        for cv_id, match_result in results:
            scores[cv_id] = match_result
        
        logger.info(f"Skills match calculated for {len(scores)} CVs")
        return scores
    
    async def _analyze_experience_level(
        self,
        cv_documents: List[CVDocument],
        job_description: JobDescription,
        db: AsyncSession
    ) -> Dict[UUID, float]:
        """
        Analyze experience level alignment.
        
        Returns:
            Dict mapping CV ID to experience score (0.0-1.0)
        """
        scores = {}
        
        # Extract required experience from JD (simple heuristic)
        jd_text = job_description.description.lower()
        required_years = 0
        
        if 'senior' in jd_text or '5+ years' in jd_text or '5 years' in jd_text:
            required_years = 5
        elif 'mid-level' in jd_text or '3+ years' in jd_text or '3 years' in jd_text:
            required_years = 3
        elif 'junior' in jd_text or '1+ year' in jd_text or '1 year' in jd_text:
            required_years = 1
        
        for cv in cv_documents:
            try:
                # Get skill report for experience data
                skill_result = await db.execute(
                    select(SkillReport).where(SkillReport.document_id == cv.id)
                )
                skill_report = skill_result.scalar_one_or_none()
                
                if skill_report and skill_report.total_experience_months:
                    cv_years = skill_report.total_experience_months / 12
                    
                    # Score based on alignment
                    if required_years == 0:
                        score = 0.7  # No specific requirement
                    elif cv_years >= required_years:
                        # Perfect or over-qualified
                        score = min(1.0, 0.8 + (cv_years - required_years) * 0.05)
                    else:
                        # Under-qualified
                        score = max(0.3, cv_years / required_years)
                    
                    scores[cv.id] = score
                else:
                    scores[cv.id] = 0.6  # Default if no data
                    
            except Exception as e:
                logger.warning(f"Experience analysis failed for CV {cv.id}: {e}")
                scores[cv.id] = 0.6
        
        logger.info(f"Experience level analyzed for {len(scores)} CVs")
        return scores
    
    async def _analyze_cultural_fit(
        self,
        cv_documents: List[CVDocument],
        job_description: JobDescription
    ) -> Dict[UUID, float]:
        """
        Analyze cultural fit based on keywords.
        
        Returns:
            Dict mapping CV ID to cultural fit score (0.0-1.0)
        """
        scores = {}
        
        # Extract cultural keywords from JD
        jd_text = job_description.description.lower()
        cultural_keywords = {
            'agile', 'scrum', 'remote', 'collaborative', 'team player',
            'innovation', 'startup', 'fast-paced', 'flexible', 'autonomous'
        }
        
        jd_keywords = {kw for kw in cultural_keywords if kw in jd_text}
        
        if not jd_keywords:
            # No cultural indicators in JD
            return {cv.id: 0.7 for cv in cv_documents}
        
        for cv in cv_documents:
            cv_text = (cv.masked_text or cv.extracted_text or "").lower()
            
            # Count matching keywords
            matches = sum(1 for kw in jd_keywords if kw in cv_text)
            score = min(1.0, 0.5 + (matches / len(jd_keywords)) * 0.5)
            
            scores[cv.id] = score
        
        logger.info(f"Cultural fit analyzed for {len(scores)} CVs")
        return scores
    
    def _calculate_composite_ranking(
        self,
        cv_documents: List[CVDocument],
        semantic_scores: Dict[UUID, float],
        skills_scores: Dict[UUID, Dict[str, Any]],
        experience_scores: Dict[UUID, float],
        cultural_scores: Dict[UUID, float],
        ranking_criteria: Dict[str, float]
    ) -> List[Dict[str, Any]]:
        """
        Calculate composite scores and rank candidates.
        
        Returns:
            Sorted list of candidates with detailed scores
        """
        candidates = []
        
        for cv in cv_documents:
            cv_id = cv.id
            
            # Get individual scores
            semantic = semantic_scores.get(cv_id, 0.5)
            skills_data = skills_scores.get(cv_id, {})
            skills = skills_data.get('match_score', 0.5)
            experience = experience_scores.get(cv_id, 0.6)
            cultural = cultural_scores.get(cv_id, 0.7)
            
            # Calculate composite score
            composite_score = (
                semantic * ranking_criteria['semantic_similarity'] +
                skills * ranking_criteria['skills_match'] +
                experience * ranking_criteria['experience_level'] +
                cultural * ranking_criteria['cultural_fit']
            )
            
            # Determine rank category
            if composite_score >= 0.85:
                rank_category = "Excellent"
            elif composite_score >= 0.70:
                rank_category = "Good"
            elif composite_score >= 0.55:
                rank_category = "Moderate"
            else:
                rank_category = "Weak"
            
            candidates.append({
                'cv_id': str(cv_id),
                'filename': cv.filename,
                'composite_score': round(composite_score, 3),
                'rank_category': rank_category,
                'scores_breakdown': {
                    'semantic_similarity': round(semantic, 3),
                    'skills_match': round(skills, 3),
                    'experience_level': round(experience, 3),
                    'cultural_fit': round(cultural, 3)
                },
                'matching_skills': skills_data.get('matching_skills', [])[:5],
                'missing_skills': skills_data.get('missing_skills', [])[:5],
                'recommendation': skills_data.get('recommendation', 'consider'),
                'seniority_alignment': skills_data.get('seniority_alignment', {}),
                'competitive_advantage': skills_data.get('competitive_advantage', {})
            })
        
        # Sort by composite score (descending)
        candidates.sort(key=lambda x: x['composite_score'], reverse=True)
        
        # Add rank position
        for i, candidate in enumerate(candidates, 1):
            candidate['rank'] = i
        
        return candidates
    
    def _calculate_statistics(self, ranked_candidates: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate statistics for the leaderboard."""
        if not ranked_candidates:
            return {}
        
        scores = [c['composite_score'] for c in ranked_candidates]
        
        return {
            'average_score': round(sum(scores) / len(scores), 3),
            'highest_score': round(max(scores), 3),
            'lowest_score': round(min(scores), 3),
            'excellent_count': sum(1 for c in ranked_candidates if c['rank_category'] == 'Excellent'),
            'good_count': sum(1 for c in ranked_candidates if c['rank_category'] == 'Good'),
            'moderate_count': sum(1 for c in ranked_candidates if c['rank_category'] == 'Moderate'),
            'weak_count': sum(1 for c in ranked_candidates if c['rank_category'] == 'Weak')
        }


# Global instance
batch_ranking_service = BatchRankingService()
