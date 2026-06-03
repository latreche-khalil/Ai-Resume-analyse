"""
Batch Ranking Service - Talent Leaderboard Generation.

This service ranks multiple CVs against a job description using:
1. Semantic Search (ChromaDB + Vector Embeddings) — via RAG Pipeline
2. Multi-dimensional scoring (skills, experience, cultural fit)
3. Sequential LLM calls (respects Groq free-tier rate limits)
4. Keyword fallback when RAG embeddings are missing

Requirements: Recruiter Tools, ATS Integration
"""
import asyncio
import re
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
    - Semantic similarity via RAG Pipeline (ChromaDB embeddings)
    - Sequential LLM matching (avoids Groq free-tier rate limits)
    - Keyword fallback when embeddings are missing
    - Multi-dimensional composite scoring
    """

    # Sequential processing — 1 at a time to respect free-tier LLM limits
    MAX_CONCURRENT_ANALYSES = 1

    # Delay between LLM calls (seconds) to avoid rate-limit errors on Groq
    LLM_CALL_DELAY_SECONDS = 1.5

    async def rank_candidates(
        self,
        cv_ids: List[UUID],
        job_description_id: UUID,
        db: AsyncSession,
        ranking_criteria: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Rank multiple candidates against a job description.

        Pipeline:
        1. Semantic similarity  → RAG (ChromaDB) with keyword fallback
        2. Skills match         → Matching Agent (sequential LLM calls)
        3. Experience level     → SkillReport + regex heuristic
        4. Cultural fit         → keyword matching
        5. Composite score      → weighted sum → sorted leaderboard

        Args:
            cv_ids:            List of CV document IDs to rank
            job_description_id: Job description to match against
            db:                Database session
            ranking_criteria:  Optional dimension weights (must sum to 1.0)

        Returns:
            Ranked leaderboard with detailed scores and statistics
        """
        try:
            logger.info(f"Starting batch ranking for {len(cv_ids)} candidates")

            # Default ranking criteria weights (must sum to 1.0)
            if not ranking_criteria:
                ranking_criteria = {
                    'semantic_similarity': 0.30,
                    'skills_match':        0.40,
                    'experience_level':    0.20,
                    'cultural_fit':        0.10,
                }

            # ── Fetch Job Description ─────────────────────────────────────────
            jd_result = await db.execute(
                select(JobDescription).where(JobDescription.id == job_description_id)
            )
            job_description = jd_result.scalar_one_or_none()
            if not job_description:
                raise ValueError("Job description not found")

            # ── Fetch CV Documents ────────────────────────────────────────────
            cv_result = await db.execute(
                select(CVDocument).where(CVDocument.id.in_(cv_ids))
            )
            cv_documents = cv_result.scalars().all()
            if not cv_documents:
                raise ValueError("No CV documents found")

            # ── Step 1: Semantic Similarity via RAG Pipeline ──────────────────
            semantic_scores = await self._calculate_semantic_similarity(
                cv_documents=cv_documents,
                job_description=job_description
            )

            # ── Step 2: Skills Match via Matching Agent (sequential) ──────────
            skills_scores = await self._calculate_skills_match_sequential(
                cv_documents=cv_documents,
                job_description=job_description,
                db=db
            )

            # ── Step 3: Experience Level ──────────────────────────────────────
            experience_scores = await self._analyze_experience_level(
                cv_documents=cv_documents,
                job_description=job_description,
                db=db
            )

            # ── Step 4: Cultural Fit ──────────────────────────────────────────
            cultural_scores = await self._analyze_cultural_fit(
                cv_documents=cv_documents,
                job_description=job_description
            )

            # ── Step 5: Composite Ranking ─────────────────────────────────────
            ranked_candidates = self._calculate_composite_ranking(
                cv_documents=cv_documents,
                semantic_scores=semantic_scores,
                skills_scores=skills_scores,
                experience_scores=experience_scores,
                cultural_scores=cultural_scores,
                ranking_criteria=ranking_criteria
            )

            # ── Step 6: Save Results to Database ──────────────────────────────
            await self._save_batch_results_to_db(
                ranked_candidates=ranked_candidates,
                job_description_id=job_description_id,
                db=db
            )

            logger.info(f"Batch ranking completed for {len(ranked_candidates)} candidates")

            return {
                'job_description_id': str(job_description_id),
                'job_title':          job_description.title,
                'total_candidates':   len(ranked_candidates),
                'ranking_criteria':   ranking_criteria,
                'leaderboard':        ranked_candidates,
                'statistics':         self._calculate_statistics(ranked_candidates),
            }

        except Exception as e:
            logger.error(f"Batch ranking error: {str(e)}")
            raise

    async def _save_batch_results_to_db(
        self,
        ranked_candidates: List[Dict[str, Any]],
        job_description_id: UUID,
        db: AsyncSession
    ) -> None:
        """
        Save batch ranking results to the database.
        For each ranked candidate, creates or updates AnalysisRecord, GapReport, and XAIReport.
        """
        from app.models.analysis_record import AnalysisRecord
        from app.models.gap_report import GapReport
        from app.models.xai_report import XAIReport
        from datetime import datetime, timezone

        for candidate in ranked_candidates:
            try:
                cv_id = UUID(candidate['cv_id'])
                
                # Check for existing record
                stmt = select(AnalysisRecord).where(
                    AnalysisRecord.cv_document_id == cv_id,
                    AnalysisRecord.job_description_id == job_description_id
                )
                existing_res = await db.execute(stmt)
                existing = existing_res.scalar_one_or_none()
                
                if existing:
                    logger.info(f"Deleting existing AnalysisRecord {existing.id} for CV {cv_id}")
                    await db.delete(existing)
                    await db.commit()
                
                # Create AnalysisRecord
                composite_score = candidate['composite_score']
                
                analysis_record = AnalysisRecord(
                    cv_document_id=cv_id,
                    job_description_id=job_description_id,
                    match_score=composite_score,
                    matching_skills=candidate.get('matching_skills', []),
                    missing_skills=candidate.get('missing_skills', []),
                    transferable_skills=candidate.get('transferable_skills', []),
                    seniority_alignment=candidate.get('seniority_alignment', {}),
                    red_flags=candidate.get('red_flags', []),
                    hiring_urgency=candidate.get('hiring_urgency', 'medium'),
                    processing_status='completed',
                    processing_started_at=datetime.now(timezone.utc),
                    processing_completed_at=datetime.now(timezone.utc),
                    confidence_score=0.90, # default confidence
                    requires_human_review=False,
                    is_binding=False,
                    is_partial=False
                )
                
                db.add(analysis_record)
                await db.commit()
                await db.refresh(analysis_record)
                
                # Store the newly created analysis_id back to candidate dictionary
                candidate['analysis_id'] = str(analysis_record.id)

                # Create GapReport
                missing_skills = candidate.get('missing_skills', [])
                critical_gaps = []
                for idx, skill in enumerate(missing_skills[:5], 1):
                    critical_gaps.append({
                        "skill": skill,
                        "reason": f"Required competency for this role.",
                        "impact": "High",
                        "priority": idx
                    })
                
                important_gaps = []
                for idx, skill in enumerate(missing_skills[5:10], 1):
                    important_gaps.append({
                        "skill": skill,
                        "reason": "Desired capability for optimal performance.",
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

                learning_roadmap = []
                for skill in missing_skills[:5]:
                    learning_roadmap.append({
                        "skill": skill,
                        "personalized_note": f"Familiarize yourself with {skill} concepts and practical usage.",
                        "resources": [
                            {
                                "name": f"Official {skill} Documentation",
                                "provider": "Official",
                                "url_hint": f"{skill} docs",
                                "type": "docs"
                            },
                            {
                                "name": f"Introduction to {skill}",
                                "provider": "Coursera / Udemy",
                                "url_hint": f"learn {skill}",
                                "type": "course"
                            }
                        ],
                        "hands_on_project": f"Build a small prototype using {skill} to demonstrate understanding.",
                        "estimated_weeks": 1,
                        "roi": "Medium"
                    })

                quick_wins = []
                if missing_skills:
                    quick_wins.append({
                        "action": f"Read official documentation for {missing_skills[0]}",
                        "timeline": "1-2 days"
                    })

                gap_report = GapReport(
                    analysis_record_id=analysis_record.id,
                    critical_gaps=critical_gaps,
                    important_gaps=important_gaps,
                    nice_to_have_gaps=nice_to_have_gaps,
                    learning_roadmap=learning_roadmap,
                    quick_wins=quick_wins,
                    estimated_time_weeks=len(learning_roadmap)
                )
                db.add(gap_report)
                
                # Create XAIReport
                evidence_for_match = []
                for item in candidate.get('evidence_for_hire', []):
                    evidence_for_match.append({
                        "claim": item,
                        "evidence": f"CV mentions: '{item}'",
                        "credibility": "high",
                        "weight": 0.8
                    })
                if not evidence_for_match:
                    for skill in candidate.get('matching_skills', [])[:5]:
                        evidence_for_match.append({
                            "claim": skill,
                            "evidence": f"Proven experience with {skill} found in the CV.",
                            "credibility": "high",
                            "weight": 0.8
                        })
                
                evidence_against_match = []
                for item in candidate.get('evidence_against_hire', []):
                    evidence_against_match.append({
                        "gap": item,
                        "required": "Relevant skills/experience",
                        "current": "Not explicitly detailed in CV",
                        "impact": "high",
                        "weight": 0.7
                    })
                if not evidence_against_match:
                    for skill in missing_skills[:3]:
                        evidence_against_match.append({
                            "gap": skill,
                            "required": f"Knowledge of {skill}",
                            "current": f"Missing from CV",
                            "impact": "medium",
                            "weight": 0.6
                        })

                counterfactuals = []
                for idx, skill in enumerate(missing_skills[:3]):
                    counterfactuals.append({
                        "change": f"Gain certification or complete project in {skill}",
                        "expected_score": round(min(0.99, float(composite_score) + 0.05 * (idx + 1)), 2),
                        "explanation": f"Adding {skill} directly addresses a core job description gap.",
                        "feasibility": "medium"
                    })

                features = [item["claim"][:30] for item in evidence_for_match[:5]] + [item["gap"][:30] for item in evidence_against_match[:5]]
                values = [item["weight"] for item in evidence_for_match[:5]] + [-item["weight"] for item in evidence_against_match[:5]]
                colors = ['#4CAF50'] * len(evidence_for_match[:5]) + ['#F44336'] * len(evidence_against_match[:5])
                force_plot_data = {
                    'type': 'force_plot',
                    'base_value': 0.5,
                    'features': features,
                    'values': values,
                    'colors': colors,
                    'final_score': float(composite_score)
                }

                steps = [{'name': 'Base Score', 'value': 0.5, 'cumulative': 0.5}]
                cumulative = 0.5
                for item in evidence_for_match[:5]:
                    impact = item["weight"] * 0.05
                    cumulative += impact
                    steps.append({'name': item["claim"][:30], 'value': impact, 'cumulative': cumulative, 'type': 'positive'})
                for item in evidence_against_match[:5]:
                    impact = -item["weight"] * 0.05
                    cumulative += impact
                    steps.append({'name': item["gap"][:30], 'value': impact, 'cumulative': cumulative, 'type': 'negative'})
                steps.append({'name': 'Final Score', 'value': 0, 'cumulative': float(composite_score)})
                waterfall_data = {
                    'type': 'waterfall',
                    'steps': steps,
                    'base_score': 0.5,
                    'final_score': float(composite_score)
                }

                xai_report = XAIReport(
                    analysis_record_id=analysis_record.id,
                    overall_explanation=candidate.get('summary', ''),
                    evidence_for_match=evidence_for_match,
                    evidence_against_match=evidence_against_match,
                    key_achievements=candidate.get('evidence_for_hire', []),
                    counterfactuals=counterfactuals,
                    credibility_analysis={
                        "buzzword_density": "low",
                        "verifiable_metrics": "medium",
                        "overall_credibility": "high"
                    },
                    force_plot_data=force_plot_data,
                    waterfall_data=waterfall_data
                )
                db.add(xai_report)
                await db.commit()
                logger.info(f"Successfully saved AnalysisRecord, GapReport, and XAIReport for CV {cv_id}")
            except Exception as save_err:
                logger.error(f"Failed to save results for candidate CV {candidate.get('cv_id')}: {save_err}")
                await db.rollback()

    # ──────────────────────────────────────────────────────────────────────────
    # Step 1 — Semantic Similarity (RAG Pipeline)
    # ──────────────────────────────────────────────────────────────────────────

    async def _calculate_semantic_similarity(
        self,
        cv_documents: List[CVDocument],
        job_description: JobDescription
    ) -> Dict[UUID, float]:
        """
        Calculate semantic similarity using ChromaDB embeddings (RAG Pipeline).

        For each CV:
          1. Query ChromaDB for the top-5 chunks most similar to the JD text.
          2. Average the cosine-similarity scores.
          3. Fall back to keyword overlap if embeddings are missing.

        This is the same mechanism used by the candidate matching pipeline.
        """
        scores: Dict[UUID, float] = {}
        # Use first 1000 chars of JD as the semantic query
        jd_query = job_description.description[:1000]

        for cv in cv_documents:
            try:
                chunks = await rag_pipeline.semantic_search(
                    query=jd_query,
                    document_ids=[cv.id],
                    top_k=5
                )

                if chunks:
                    avg_similarity = sum(c['similarity'] for c in chunks) / len(chunks)
                    # Only trust scores clearly above random noise threshold
                    if avg_similarity > 0.3:
                        scores[cv.id] = round(avg_similarity, 3)
                        logger.info(
                            f"RAG semantic score for CV {cv.id}: {avg_similarity:.3f} "
                            f"({len(chunks)} chunks matched)"
                        )
                        continue

                # Fallback: keyword overlap
                logger.info(
                    f"RAG returned low-confidence for CV {cv.id} "
                    f"(avg={avg_similarity if chunks else 0:.3f}) — using keyword fallback"
                )
                scores[cv.id] = self._keyword_similarity(
                    cv.masked_text or cv.extracted_text or "",
                    job_description.description
                )

            except Exception as e:
                logger.warning(f"RAG semantic search failed for CV {cv.id}: {e} — using keyword fallback")
                scores[cv.id] = self._keyword_similarity(
                    cv.masked_text or cv.extracted_text or "",
                    job_description.description
                )

        logger.info(f"Semantic similarity calculated for {len(scores)} CVs")
        return scores

    def _keyword_similarity(self, cv_text: str, jd_text: str) -> float:
        """Keyword-based similarity fallback when RAG embeddings are unavailable."""
        def keywords(text: str):
            words = set(re.findall(r'\b[a-zA-Z][a-zA-Z0-9+#.]{2,}\b', text.lower()))
            stopwords = {
                'the', 'and', 'for', 'with', 'you', 'are', 'our', 'have', 'will',
                'must', 'can', 'this', 'that', 'from', 'your', 'their', 'they',
                'has', 'was', 'not', 'but', 'all', 'any', 'its', 'been', 'more'
            }
            return {w for w in words if w not in stopwords}

        cv_kw = keywords(cv_text)
        jd_kw = keywords(jd_text)
        if not jd_kw:
            return 0.5
        overlap = len(cv_kw & jd_kw) / len(jd_kw)
        # Scale up: overlap is usually small relative to all JD keywords
        return round(min(1.0, overlap * 2), 3)

    # ──────────────────────────────────────────────────────────────────────────
    # Step 2 — Skills Match (Sequential LLM calls)
    # ──────────────────────────────────────────────────────────────────────────

    async def _calculate_skills_match_sequential(
        self,
        cv_documents: List[CVDocument],
        job_description: JobDescription,
        db: AsyncSession
    ) -> Dict[UUID, Dict[str, Any]]:
        """
        Calculate skills match using the Matching Agent, one CV at a time.

        Sequential processing is intentional: Groq free-tier enforces strict
        rate limits (requests-per-minute). Running N concurrent LLM calls
        causes HTTP 429 errors on the whole batch.

        A small delay between calls (LLM_CALL_DELAY_SECONDS) further reduces
        the chance of hitting the limit mid-batch.
        """
        scores: Dict[UUID, Dict[str, Any]] = {}

        for i, cv in enumerate(cv_documents):
            cv_text = cv.masked_text or cv.extracted_text or ""
            if not cv_text.strip():
                logger.warning(f"CV {cv.id} has no text — skipping LLM matching")
                scores[cv.id] = self._empty_match_result()
                continue

            try:
                logger.info(
                    f"Running skills match for CV {i + 1}/{len(cv_documents)}: {cv.original_filename}"
                )
                match_result = await matching_agent.match(
                    masked_cv=cv_text,
                    job_description=job_description.description,
                    cv_document_id=cv.id,
                    jd_id=job_description.id,
                    db=db
                )
                scores[cv.id] = match_result
                logger.info(
                    f"Match score for CV {cv.id} ({cv.original_filename}): "
                    f"{match_result.get('match_score', 0):.2f}"
                )
            except Exception as e:
                logger.warning(
                    f"Matching Agent failed for CV {cv.id} ({cv.original_filename}): {e} "
                    f"— using keyword fallback"
                )
                # Keyword-based fallback so the batch continues
                scores[cv.id] = self._keyword_match_fallback(
                    cv_text=cv_text,
                    jd_text=job_description.description
                )

            # Respect LLM rate limits between calls (skip delay after last CV)
            if i < len(cv_documents) - 1:
                await asyncio.sleep(self.LLM_CALL_DELAY_SECONDS)

        logger.info(f"Skills match completed for {len(scores)} CVs")
        return scores

    def _empty_match_result(self) -> Dict[str, Any]:
        """Return a neutral match result for CVs with no text."""
        return {
            'match_score':         0.0,
            'matching_skills':     [],
            'missing_skills':      [],
            'transferable_skills': [],
            'summary':             'No text available for matching.',
        }

    def _keyword_match_fallback(self, cv_text: str, jd_text: str) -> Dict[str, Any]:
        """Keyword-based match fallback when the LLM is unavailable."""
        def extract_keywords(text: str):
            words = set(re.findall(r'\b[a-zA-Z][a-zA-Z0-9+#.]*\b', text.lower()))
            stopwords = {'the', 'and', 'for', 'with', 'you', 'are', 'our', 'have',
                         'will', 'must', 'can', 'this', 'that', 'from', 'your'}
            return {w for w in words if len(w) > 2 and w not in stopwords}

        cv_kw = extract_keywords(cv_text)
        jd_kw = extract_keywords(jd_text)
        matching = list(cv_kw & jd_kw)
        missing  = list(jd_kw - cv_kw)
        score    = round(min(1.0, len(matching) / max(len(jd_kw), 1)), 2)

        return {
            'match_score':         score,
            'matching_skills':     matching[:20],
            'missing_skills':      missing[:20],
            'transferable_skills': [],
            'summary':             f'Keyword match: {score * 100:.0f}% overlap (LLM unavailable)',
        }

    # ──────────────────────────────────────────────────────────────────────────
    # Step 3 — Experience Level
    # ──────────────────────────────────────────────────────────────────────────

    async def _analyze_experience_level(
        self,
        cv_documents: List[CVDocument],
        job_description: JobDescription,
        db: AsyncSession
    ) -> Dict[UUID, float]:
        """Analyze experience level alignment using SkillReport + regex heuristic."""
        scores: Dict[UUID, float] = {}

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
                    cv_text = (cv.masked_text or cv.extracted_text or "").lower()
                    year_mentions = re.findall(r'(\d+)\+?\s*years?', cv_text)
                    if year_mentions:
                        cv_years = max(int(y) for y in year_mentions)

                if required_years == 0:
                    score = 0.75
                elif cv_years == 0:
                    score = 0.50   # Unknown — neutral
                elif cv_years >= required_years * 1.5:
                    score = 0.95   # Significantly over-qualified
                elif cv_years >= required_years:
                    score = 0.85   # Meets requirement
                elif cv_years >= required_years * 0.7:
                    score = 0.65   # Slightly under
                else:
                    score = max(0.3, cv_years / required_years * 0.7)

                scores[cv.id] = round(score, 3)

            except Exception as e:
                logger.warning(f"Experience analysis failed for CV {cv.id}: {e}")
                scores[cv.id] = 0.5

        logger.info(f"Experience level analyzed for {len(scores)} CVs")
        return scores

    # ──────────────────────────────────────────────────────────────────────────
    # Step 4 — Cultural Fit
    # ──────────────────────────────────────────────────────────────────────────

    async def _analyze_cultural_fit(
        self,
        cv_documents: List[CVDocument],
        job_description: JobDescription
    ) -> Dict[UUID, float]:
        """Analyze cultural fit using soft-skill keyword matching."""
        scores: Dict[UUID, float] = {}
        jd_text = job_description.description.lower()

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
                generic = {'team', 'lead', 'manage', 'collaborate', 'deliver', 'drive'}
                matches = sum(1 for kw in generic if kw in cv_text)
                scores[cv.id] = round(min(1.0, 0.5 + matches * 0.08), 3)
            else:
                matches = sum(1 for kw in jd_keywords if kw in cv_text)
                score = 0.4 + (matches / len(jd_keywords)) * 0.6
                scores[cv.id] = round(min(1.0, score), 3)

        logger.info(f"Cultural fit analyzed for {len(scores)} CVs")
        return scores

    # ──────────────────────────────────────────────────────────────────────────
    # Step 5 — Composite Ranking
    # ──────────────────────────────────────────────────────────────────────────

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
        Calculate composite scores and produce a sorted leaderboard.

        Composite = Σ (dimension_score × weight)
        """
        candidates = []

        for cv in cv_documents:
            cv_id = cv.id

            semantic    = semantic_scores.get(cv_id, 0.5)
            skills_data = skills_scores.get(cv_id, {})
            skills      = float(skills_data.get('match_score', 0.5))
            experience  = experience_scores.get(cv_id, 0.6)
            cultural    = cultural_scores.get(cv_id, 0.7)

            composite_score = (
                semantic   * ranking_criteria['semantic_similarity'] +
                skills     * ranking_criteria['skills_match'] +
                experience * ranking_criteria['experience_level'] +
                cultural   * ranking_criteria['cultural_fit']
            )

            if composite_score >= 0.85:
                rank_category = "Excellent"
            elif composite_score >= 0.70:
                rank_category = "Good"
            elif composite_score >= 0.55:
                rank_category = "Moderate"
            else:
                rank_category = "Weak"

            # Remove raw floating-point scores from the AI summary string
            raw_summary = skills_data.get('summary', '')
            clean_summary = re.sub(r'\b0\.\d{2,3}\b', '', raw_summary)
            clean_summary = re.sub(r'\b\d{1,3}%\b', '', clean_summary)
            clean_summary = re.sub(r'\s{2,}', ' ', clean_summary).strip()

            candidates.append({
                'cv_id':         str(cv_id),
                'filename':      cv.original_filename,
                'composite_score': round(composite_score, 3),
                'rank_category': rank_category,
                'scores_breakdown': {
                    'semantic_similarity': round(semantic,   3),
                    'skills_match':        round(skills,     3),
                    'experience_level':    round(experience, 3),
                    'cultural_fit':        round(cultural,   3),
                },
                'matching_skills':     skills_data.get('matching_skills', [])[:8],
                'missing_skills':      skills_data.get('missing_skills', [])[:8],
                'transferable_skills': skills_data.get('transferable_skills', [])[:5],
                'red_flags':           skills_data.get('red_flags', [])[:5],
                'recommendation':      skills_data.get('recommendation', 'consider'),
                'summary':             clean_summary,
                'confidence':          skills_data.get('confidence', 'medium'),
                # Recruiter intelligence fields
                'evidence_for_hire':     skills_data.get('evidence_for_hire', [])[:6],
                'evidence_against_hire': skills_data.get('evidence_against_hire', [])[:6],
                'interview_questions':   skills_data.get('interview_questions', [])[:5],
                'hiring_recommendation': skills_data.get('hiring_recommendation', ''),
                'seniority_alignment':   skills_data.get('seniority_alignment', {}),
                'hiring_urgency':        skills_data.get('hiring_urgency', 'medium'),
                # XAI-style evidence
                'evidence_for_match':    [f"✓ {s}" for s in skills_data.get('matching_skills', [])[:6]],
                'evidence_against_match':[f"✗ Missing: {s}" for s in skills_data.get('missing_skills', [])[:4]],
                'competitive_advantage': skills_data.get('competitive_advantage', {}),
            })

        # Sort by composite score descending
        candidates.sort(key=lambda x: x['composite_score'], reverse=True)

        # Add rank position (1-based)
        for i, candidate in enumerate(candidates, 1):
            candidate['rank'] = i

        return candidates

    # ──────────────────────────────────────────────────────────────────────────
    # Statistics
    # ──────────────────────────────────────────────────────────────────────────

    def _calculate_statistics(self, ranked_candidates: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate aggregate statistics for the leaderboard."""
        if not ranked_candidates:
            return {}

        scores = [c['composite_score'] for c in ranked_candidates]

        return {
            'average_score':   round(sum(scores) / len(scores), 3),
            'highest_score':   round(max(scores), 3),
            'lowest_score':    round(min(scores), 3),
            'excellent_count': sum(1 for c in ranked_candidates if c['rank_category'] == 'Excellent'),
            'good_count':      sum(1 for c in ranked_candidates if c['rank_category'] == 'Good'),
            'moderate_count':  sum(1 for c in ranked_candidates if c['rank_category'] == 'Moderate'),
            'weak_count':      sum(1 for c in ranked_candidates if c['rank_category'] == 'Weak'),
        }


# Global instance
batch_ranking_service = BatchRankingService()
