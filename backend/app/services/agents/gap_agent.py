"""
Gap Agent - Skill Gap Analysis with RAG-personalized roadmaps.

Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.10
"""
import json
import re
import time
from typing import Dict, Any, List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.gap_report import GapReport
from app.services.nlp.llm_client import llm_client
from app.utils.json_parser import json_parser
from app.utils.logger import logger


class GapAgent:
    """
    Gap Agent for skill gap analysis and personalized learning roadmap generation.
    RAG-powered: retrieves candidate's actual CV chunks to build a personalized roadmap.
    Requirements: 9.1–9.10
    """
    
    # Performance target
    PERFORMANCE_TARGET_SECONDS = 5.0
    
    # LLM Configuration
    TEMPERATURE = 0.3  # Lower for faster, more focused responses
    MAX_TOKENS = 1500  # Reduced for faster generation
    
    # RAG Configuration
    RAG_TOP_K = 5
    RAG_CONTEXT_LIMIT = 800
    
    # Text limits
    JD_TEXT_LIMIT = 800
    MISSING_SKILLS_LIMIT = 15
    MISSING_SKILLS_QUERY_LIMIT = 10
    
    # Result limits
    MAX_CRITICAL_GAPS = 4
    MAX_NICE_TO_HAVE_GAPS = 8
    MAX_LEARNING_ROADMAP = 8
    MAX_QUICK_WINS = 3

    async def analyze_gaps(
        self,
        match_result: Dict[str, Any],
        cv_skills: List[Dict],
        jd_text: str,
        analysis_record_id: UUID,
        db: AsyncSession,
        cv_document_id: Optional[UUID] = None,
        is_recruiter: bool = False
    ) -> Dict[str, Any]:
        start_time = time.time()
        try:
            rag_context = ""
            if cv_document_id:
                try:
                    from app.services.nlp.rag_pipeline import rag_pipeline
                    missing = match_result.get("missing_skills", [])
                    query = "experience background skills " + " ".join(missing[:self.MISSING_SKILLS_QUERY_LIMIT])
                    chunks = await rag_pipeline.semantic_search(
                        query=query, document_ids=[cv_document_id], top_k=self.RAG_TOP_K,
                    )
                    if chunks:
                        rag_context = "\n\n".join(c["text"] for c in chunks)
                        logger.info(f"Gap Agent RAG: {len(chunks)} chunks retrieved")
                except Exception as rag_err:
                    logger.warning(f"Gap Agent RAG failed ({rag_err}), continuing without it")

            prompt = self._create_gap_prompt(
                missing_skills=match_result["missing_skills"],
                jd_text=jd_text,
                match_score=match_result.get("match_score", 0.0),
                rag_context=rag_context,
                is_recruiter=is_recruiter
            )
            
            # Call LLM with optimized settings
            response = await llm_client.generate(
                prompt=prompt,
                task_type="analysis",
                temperature=self.TEMPERATURE,
                max_tokens=self.MAX_TOKENS
            )
            
            if not response:
                raise Exception("Failed to get response from LLM")
            
            gap_analysis = self._parse_gap_response(response)
            await self._store_gap_report(analysis_record_id, gap_analysis, db)

            elapsed = time.time() - start_time
            if elapsed > self.PERFORMANCE_TARGET_SECONDS:
                logger.warning(f"Gap analysis exceeded target: {elapsed:.2f}s")
            else:
                logger.info(f"Gap analysis completed in {elapsed:.2f}s")
            return gap_analysis

        except Exception as e:
            logger.error(f"Gap analysis error: {str(e)}")
            raise

    def _create_gap_prompt(
        self,
        missing_skills: List[str],
        jd_text: str,
        match_score: float,
        rag_context: str = "",
        language: str = "English",
        is_recruiter: bool = False
    ) -> str:
        """Create gap analysis prompt with Vercel-grade precision and English language."""
        rag_section = f"\n\nCANDIDATE BACKGROUND:\n{rag_context[:self.RAG_CONTEXT_LIMIT]}\n" if rag_context else ""
        
        if is_recruiter:
            return f"""You are a Strategic Tech Recruiter and Hiring Manager. Analyze the candidate's skill gaps and weaknesses relative to the job requirements.
            
OUTPUT LANGUAGE: MUST be {language}.

JOB REQUIREMENTS:
{jd_text[:self.JD_TEXT_LIMIT]}

MISSING SKILLS:
{', '.join(missing_skills[:self.MISSING_SKILLS_LIMIT])}

CURRENT MATCH SCORE: {match_score:.0%}
{rag_section}

INSTRUCTIONS:
1. Identify CRITICAL gaps (Blocking technical requirements).
2. Identify IMPORTANT gaps (Performance differentiators).
3. Identify NICE-TO-HAVE (Tooling/Secondary additions).
4. Create a quick action list for the recruiter to verify during the interview.
5. Set "learning_roadmap" to [] (Empty list) as this view is for recruiters, not candidates.

OUTPUT FORMAT (JSON only):
{{
  "critical_gaps": [
    {{
      "skill": "Name",
      "reason": "Recruiter-focused technical gap justification",
      "impact": "High",
      "priority": 1
    }}
  ],
  "learning_roadmap": [],
  "quick_wins": [
    {{ "action": "Actionable interview question/probe regarding this gap", "timeline": "Interview" }}
  ]
}}

RULES:
- RESPONSE MUST BE IN {language}.
- learning_roadmap MUST BE EMPTY [].
- Return ONLY the JSON object."""

        return f"""You are a Strategic Engineering Lead and Career Mentor. Create a high-density, ACCELERATED learning roadmap.

OUTPUT LANGUAGE: MUST be {language}.

IMPORTANT CONSTRAINTS:
- Keep durations short (1-3 weeks per skill).
- Total roadmap must be <= 10 weeks.
- Provide SPECIFIC, high-quality resources (Official Docs, Top courses, Professional videos).

JOB REQUIREMENTS:
{jd_text[:self.JD_TEXT_LIMIT]}

MISSING SKILLS:
{', '.join(missing_skills[:self.MISSING_SKILLS_LIMIT])}

CURRENT MATCH SCORE: {match_score:.0%}
{rag_section}

INSTRUCTIONS:
1. Identify CRITICAL gaps (Blocking technical requirements).
2. Identify IMPORTANT gaps (Performance differentiators).
3. Identify NICE-TO-HAVE (Cultural/Tooling additions).
4. Create a roadmap with specific RESOURCE providers (Coursera, Udemy, YouTube, Official Docs).

OUTPUT FORMAT (JSON only):
{{
  "critical_gaps": [
    {{
      "skill": "Name",
      "reason": "Technical justification",
      "impact": "High",
      "priority": 1
    }}
  ],
  "learning_roadmap": [
    {{
      "skill": "Skill Name",
      "personalized_note": "Focused approach based on candidate history",
      "resources": [
        {{ "name": "Exact Course/Doc Title", "provider": "Provider Name", "url_hint": "Search query", "type": "course/video/docs" }}
      ],
      "hands_on_project": "A specific project task to build, e.g., 'Build a real-time chat app using Socket.io'",
      "estimated_weeks": 2,
      "roi": "Impact on technical readiness"
    }}
  ],
  "quick_wins": [
    {{ "action": "Actionable task", "timeline": "1-2 days" }}
  ]
}}

RULES:
- RESPONSE MUST BE IN {language}.
- Max 5 skills in roadmap for focus.
- Return ONLY the JSON object."""

    def _parse_gap_response(self, response: str) -> Dict[str, Any]:
        """Parse gap response - only return the 4 required fields. [v3.2.1]"""
        try:
            # Use unified JSON parser
            result = json_parser.extract_json_object(response)
            if not result:
                raise ValueError("No valid JSON in response")
            
            # Return ONLY the 4 required fields - ignore any extra fields like "matching_skills"
            return {
                "critical_gaps":      result.get("critical_gaps", [])[:self.MAX_CRITICAL_GAPS],
                "important_gaps":     result.get("important_gaps", [])[:self.MAX_NICE_TO_HAVE_GAPS],
                "nice_to_have_gaps":  result.get("nice_to_have_gaps", [])[:self.MAX_NICE_TO_HAVE_GAPS],
                "learning_roadmap":   result.get("learning_roadmap", [])[:self.MAX_LEARNING_ROADMAP],
                "quick_wins":         result.get("quick_wins", [])[:self.MAX_QUICK_WINS],
            }
        except Exception as e:
            logger.error(f"Failed to parse gap response: {e}")
            return {
                "critical_gaps": [],
                "important_gaps": [],
                "nice_to_have_gaps": [],
                "learning_roadmap": [],
                "quick_wins": [],
            }

    async def _store_gap_report(
        self,
        analysis_record_id: UUID,
        gap_analysis: Dict[str, Any],
        db: AsyncSession,
    ) -> GapReport:
        try:
            from sqlalchemy import select
            
            # Check if a report already exists for this analysis (Upsert logic)
            stmt = select(GapReport).where(GapReport.analysis_record_id == analysis_record_id)
            result = await db.execute(stmt)
            gap_report = result.scalar_one_or_none()
            
            if gap_report:
                # Update existing
                gap_report.critical_gaps = gap_analysis["critical_gaps"]
                gap_report.important_gaps = gap_analysis["important_gaps"]
                gap_report.nice_to_have_gaps = gap_analysis["nice_to_have_gaps"]
                gap_report.learning_roadmap = gap_analysis["learning_roadmap"]
                gap_report.quick_wins = gap_analysis.get("quick_wins")
                logger.info(f"Existing gap report updated for analysis: {analysis_record_id}")
            else:
                # Create new
                gap_report = GapReport(
                    analysis_record_id=analysis_record_id,
                    critical_gaps=gap_analysis["critical_gaps"],
                    important_gaps=gap_analysis["important_gaps"],
                    nice_to_have_gaps=gap_analysis["nice_to_have_gaps"],
                    learning_roadmap=gap_analysis["learning_roadmap"],
                    quick_wins=gap_analysis.get("quick_wins"),
                )
                db.add(gap_report)
                logger.info(f"New gap report created for analysis: {analysis_record_id}")
            
            # Note: We rely on the Orchestrator to commit the transaction to ensure atomicity
            return gap_report
        except Exception as e:
            logger.error(f"Failed to store gap report: {e}")
            raise


gap_agent = GapAgent()
