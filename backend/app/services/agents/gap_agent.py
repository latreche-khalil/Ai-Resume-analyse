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
        language: str = "Arabic"
    ) -> str:
        """Create gap analysis prompt via OpenRouter."""
        rag_section = f"\n\nCANDIDATE BACKGROUND:\n{rag_context[:self.RAG_CONTEXT_LIMIT]}\n" if rag_context else ""
        
        return f"""You are a career coach. Create a learning plan for these MISSING skills.
IMPORTANT: You MUST generate your response in {language}. The JSON keys must remain in English, but all string values (reasons, impacts, notes, recommendations) MUST be in {language}.

JOB REQUIREMENTS:
{jd_text[:self.JD_TEXT_LIMIT]}

MISSING SKILLS (what candidate needs to learn):
{', '.join(missing_skills[:self.MISSING_SKILLS_LIMIT])}

CURRENT MATCH SCORE: {match_score:.0%}
{rag_section}

INSTRUCTIONS:
1. Identify CRITICAL gaps (must-have for the role)
2. Identify IMPORTANT gaps (highly desired but not strictly mandatory)
3. Identify NICE-TO-HAVE gaps (good to have but optional)
3. Create a learning roadmap with specific resources
4. Suggest quick wins (easy improvements)

OUTPUT FORMAT (JSON only):
{{
  "critical_gaps": [
    {{
      "skill": "React",
      "reason": "Required for frontend development",
      "impact": "High - critical for role",
      "weight": "90%",
      "priority": 1,
      "learning_difficulty": "moderate",
      "time_to_proficiency": "2-3 months"
    }}
  ],
  "important_gaps": [
    {{
      "skill": "TypeScript",
      "reason": "Preferred but not required",
      "impact": "Medium - highly desired",
      "weight": "40%",
      "priority": 2
    }}
  ],
  "nice_to_have_gaps": [
    {{
      "skill": "Docker",
      "reason": "Bonus skill for this role",
      "impact": "Low - good for DevOps",
      "weight": "10%",
      "priority": 3
    }}
  ],
  "learning_roadmap": [
    {{
      "skill": "React",
      "personalized_note": "Start with React basics, then move to hooks",
      "resources": [
        {{
          "type": "course",
          "name": "React - The Complete Guide",
          "provider": "Udemy",
          "duration": "40 hours",
          "cost": "paid",
          "level": "beginner"
        }}
      ],
      "estimated_weeks": 8,
      "prerequisites": ["JavaScript", "HTML", "CSS"],
      "roi": "High - directly addresses job requirement"
    }}
  ],
  "quick_wins": [
    {{
      "action": "Complete a React tutorial project",
      "impact": "Demonstrates basic React knowledge",
      "effort": "low",
      "timeline": "1 week"
    }}
  ]
}}

IMPORTANT RULES:
- Focus ONLY on the missing skills listed above
- Do NOT mention skills the candidate already has
- Provide specific, actionable learning resources
- Keep it practical and realistic
- ALWAYS output values in {language}

Return ONLY the JSON object. No explanations, no markdown, just JSON."""

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
