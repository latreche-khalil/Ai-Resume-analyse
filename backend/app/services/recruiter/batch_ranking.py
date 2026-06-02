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
        """Calculate semantic similarity using ChromaDB + keyword fallback."""
        scores = {}
        jd_text = job_description.description[:1000]

        for cv in cv_documents:
            try:
                chunks = await rag_pipeline.semantic_search(
                    query=jd_text,
                    document_ids=[cv.id],
                    top_k=5
                )
                if chunks:
                    avg_similarity = sum(chunk['similarity'] for chunk in chunks) / len(chunks)
                    # Only trust if meaningfully above random (>0.3)
                    if avg_similarity > 0.3:
                        scores[cv.id] = avg_similarity
                        continue

                # Fallback: keyword overlap between CV and JD
                scores[cv.id] = self._keyword_similarity(
                    cv.masked_text or cv.extracted_text or "",
                    job_description.description
                )
            except Exception as e:
                logger.warning(f"Semantic search failed for CV {cv.id}: {e}")
                scores[cv.id] = self._keyword_similarity(
                    cv.masked_text or cv.extracted_text or "",
                    job_description.description
                )

        logger.info(f"Semantic similarity calculated for {len(scores)} CVs")
        return scores

    def _keyword_similarity(self, cv_text: str, jd_text: str) -> float:
        """Keyword-based similarity as fallback for semantic search."""
        import re
        def keywords(text: str):
            words = set(re.findall(r'\b[a-zA-Z][a-zA-Z0-9+#.]{2,}\b', text.lower()))
            stopwords = {'the','and','for','with','you','are','our','have','will',
                         'must','can','this','that','from','your','their','they',
                         'has','was','not','but','all','any','its','been','more'}
            return {w for w in words if w not in stopwords}

        cv_kw  = keywords(cv_text)
        jd_kw  = keywords(jd_text)
        if not jd_kw:
            return 0.5
        overlap = len(cv_kw & jd_kw) / len(jd_kw)
        return round(min(1.0, overlap * 2), 3)  # scale up since overlap is usually small
    
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
        """Analyze experience level alignment using skill report + text heuristics."""
        import re
        scores = {}

        # Extract required years from JD text
        jd_text = job_description.description.lower()
        required_years = 0
        year_match = re.search(r'(\d+)\+?\s*years?', jd_text)
        if year_match:
            required_years = int(year_match.group(1))
        elif any(w in jd_text for w in ['staff', 'principal', 'architect', 'lead']):
            required_years = 8
        elif 'senior' in jd_text:
            required_years = 5
        elif 'mid' in jd_text or 'intermediate' in jd_text:
            required_years = 3
        elif 'junior' in jd_text or 'entry' in jd_text:
            required_years = 1

        for cv in cv_documents:
            try:
                skill_result = await db.execute(
                    select(SkillReport).where(SkillReport.document_id == cv.id)
                )
                skill_report = skill_result.scalar_one_or_none()

                cv_years = 0
                if skill_report and skill_report.total_experience_months:
                    cv_years = skill_report.total_experience_months / 12
                else:
                    # Heuristic: count year mentions in CV text
                    cv_text = (cv.masked_text or cv.extracted_text or "").lower()
                    year_mentions = re.findall(r'(\d+)\+?\s*years?', cv_text)
                    if year_mentions:
                        cv_years = max(int(y) for y in year_mentions)

                if required_years == 0:
                    score = 0.75
                elif cv_years == 0:
                    score = 0.5  # Unknown experience
                elif cv_years >= required_years * 1.5:
                    score = 0.95  # Significantly over-qualified
                elif cv_years >= required_years:
                    score = 0.85  # Meets requirement
                elif cv_years >= required_years * 0.7:
                    score = 0.65  # Slightly under
                else:
                    score = max(0.3, cv_years / required_years * 0.7)

                scores[cv.id] = round(score, 3)

            except Exception as e:
                logger.warning(f"Experience analysis failed for CV {cv.id}: {e}")
                scores[cv.id] = 0.5

        logger.info(f"Experience level analyzed for {len(scores)} CVs")
        return scores
    
    async def _analyze_cultural_fit(
        self,
        cv_documents: List[CVDocument],
        job_description: JobDescription
    ) -> Dict[UUID, float]:
        """Analyze cultural fit using expanded keyword matching."""
        scores = {}
        jd_text = job_description.description.lower()

        # Expanded cultural/soft-skill keywords
        cultural_keywords = {
            'agile', 'scrum', 'remote', 'collaborative', 'team player',
            'innovation', 'startup', 'fast-paced', 'flexible', 'autonomous',
            'leadership', 'mentoring', 'cross-functional', 'stakeholder',
            'communication', 'problem-solving', 'ownership', 'proactive',
            'open source', 'community', 'research', 'publications', 'kaggle',
            'speaker', 'contributor', 'driven', 'passionate', 'initiative'
        }

        jd_keywords = {kw for kw in cultural_keywords if kw in jd_text}

        for cv in cv_documents:
            cv_text = (cv.masked_text or cv.extracted_text or "").lower()

            if not jd_keywords:
                # No cultural indicators — use generic soft-skill presence
                generic = {'team', 'lead', 'manage', 'collaborate', 'deliver', 'drive'}
                matches = sum(1 for kw in generic if kw in cv_text)
                scores[cv.id] = round(min(1.0, 0.5 + matches * 0.08), 3)
            else:
                matches = sum(1 for kw in jd_keywords if kw in cv_text)
                score = 0.4 + (matches / len(jd_keywords)) * 0.6
                scores[cv.id] = round(min(1.0, score), 3)

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
            
            # Clean summary — remove any raw score mentions like "0.82" or "82%"
            import re
            raw_summary = skills_data.get('summary', '')
            clean_summary = re.sub(r'\b0\.\d{2,3}\b', '', raw_summary)  # remove 0.XX
            clean_summary = re.sub(r'\b\d{1,3}%\b', '', clean_summary)  # remove XX%
            clean_summary = re.sub(r'\s{2,}', ' ', clean_summary).strip()

            candidates.append({
                'cv_id': str(cv_id),
                'filename': cv.original_filename,
                'composite_score': round(composite_score, 3),
                'rank_category': rank_category,
                'scores_breakdown': {
                    'semantic_similarity': round(semantic, 3),
                    'skills_match': round(skills, 3),
                    'experience_level': round(experience, 3),
                    'cultural_fit': round(cultural, 3)
                },
                'matching_skills': skills_data.get('matching_skills', [])[:8],
                'missing_skills': skills_data.get('missing_skills', [])[:8],
                'transferable_skills': skills_data.get('transferable_skills', [])[:5],
                'red_flags': skills_data.get('red_flags', [])[:5],
                'recommendation': skills_data.get('recommendation', 'consider'),
                'summary': clean_summary,
                'confidence': skills_data.get('confidence', 'medium'),
                # New recruiter intelligence fields
                'evidence_for_hire':     skills_data.get('evidence_for_hire', [])[:6],
                'evidence_against_hire': skills_data.get('evidence_against_hire', [])[:6],
                'interview_questions':   skills_data.get('interview_questions', [])[:5],
                'hiring_recommendation': skills_data.get('hiring_recommendation', ''),
                'seniority_alignment':   skills_data.get('seniority_alignment', {}),
                'hiring_urgency':        skills_data.get('hiring_urgency', 'medium'),
                'evidence_for_match': [f"✓ {s}" for s in skills_data.get('matching_skills', [])[:6]],
                'evidence_against_match': [f"✗ Missing: {s}" for s in skills_data.get('missing_skills', [])[:4]],
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
