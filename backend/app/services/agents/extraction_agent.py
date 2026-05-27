"""
Extraction Agent - True Hybrid Skill Extraction.

Strategy (always both run):
  1. LocalNLP  (spaCy + keywords) → fast, offline, exact keyword matching
  2. OpenRouter                   → deep semantic understanding, context-aware

Merge logic:
  - Start with LocalNLP results (guaranteed baseline)
  - OpenRouter adds skills LocalNLP missed (semantic ones like "problem solving")
  - OpenRouter enriches job_titles, companies, education (NER is better in LLM)
  - Final confidence = weighted average
"""
import json
import re
from typing import Dict, List, Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.nlp.llm_client import llm_client
from app.utils.json_parser import json_parser
from app.models.skill_report import SkillReport
from app.services.privacy.privacy_gateway import require_masked_text
from app.utils.logger import logger


class ExtractionAgent:
    """
    Extraction Agent for hybrid skill extraction.
    
    Combines LocalNLP (spaCy) with OpenRouter for best results.
    """
    
    # LLM Configuration
    TEMPERATURE = 0.1  # Lower for precision
    MAX_TOKENS = 2000  # Increased for full CV extraction
    
    # Text limits
    PROMPT_TEXT_LIMIT = 10000
    
    # Confidence weights for hybrid merge
    LOCAL_NLP_WEIGHT = 0.4
    LLM_WEIGHT = 0.6
    
    # Default confidence scores
    LOCAL_NLP_CONFIDENCE = 0.7
    LLM_CONFIDENCE = 0.95

    # Centralized stop words will be imported where needed

    def __init__(self):
        logger.info("Extraction Agent initialized (Hybrid: LocalNLP + OpenRouter)")

    # ── Public API ─────────────────────────────────────────────────────────────

    @require_masked_text("masked_text")
    async def extract_structured_data(
        self,
        masked_text: str,
        language: str = "en",
        db: Optional[AsyncSession] = None,
    ) -> Dict[str, Any]:
        """
        Hybrid extraction: LocalNLP + OpenRouter merged together.
        """
        # Step 1: LocalNLP (always runs, fast)
        local_result = self._extract_with_local_nlp(masked_text, language)
        logger.info(f"LocalNLP: {len(local_result['skills'])} skills found")

        # Step 2: OpenRouter (enrichment)
        llm_result = None
        try:
            llm_result = await self._extract_with_llm(masked_text, language)
            logger.info(f"OpenRouter: {len(llm_result['skills'])} skills found")
        except Exception as e:
            logger.warning(f"OpenRouter unavailable ({e}), using LocalNLP only")

        # Step 3: Merge
        if llm_result:
            merged = self._merge(local_result, llm_result)
        else:
            merged = local_result

        # Step 4: Final Cleaning (Filter out junk)
        from app.core.constants import SKILL_STOP_WORDS
        
        def is_clean(skill_obj):
            # Handle both string and dictionary formats
            name = skill_obj.get('name', '') if isinstance(skill_obj, dict) else str(skill_obj)
            name_clean = name.lower().strip()
            return name_clean not in SKILL_STOP_WORDS and len(name_clean) > 2

        merged['skills'] = [s for s in merged.get('skills', []) if is_clean(s)]
        
        logger.info(f"Final cleaned: {len(merged['skills'])} total skills")
        return merged

    async def store_extraction_results(
        self,
        document_id: str,
        extracted_data: Dict[str, Any],
        db: AsyncSession,
    ) -> Optional[SkillReport]:
        try:
            from uuid import UUID

            skill_report = SkillReport(
                document_id=UUID(document_id),
                skills=extracted_data.get("skills", []),
                job_titles=extracted_data.get("job_titles", []),
                companies=extracted_data.get("companies", []),
                education=extracted_data.get("education", []),
                certifications=extracted_data.get("certifications", []),
                total_experience_months=extracted_data.get("total_experience_months", 0),
                extraction_confidence=extracted_data.get("extraction_confidence", 0.0),
                flagged_for_review=extracted_data.get("flagged_for_review", False),
            )

            db.add(skill_report)
            await db.commit()
            await db.refresh(skill_report)

            logger.info(
                f"Stored {len(extracted_data.get('skills', []))} skills "
                f"for document {document_id}"
            )
            return skill_report

        except Exception as e:
            logger.error(f"Error storing extraction results: {e}")
            await db.rollback()
            return None

    # ── Merge ──────────────────────────────────────────────────────────────────

    def _merge(
        self,
        local: Dict[str, Any],
        llm: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Merge LocalNLP + OpenRouter results.
        Includes case-insensitive deduplication and cross-field filtering.
        """
        # ── Skills merge (case-insensitive deduplication) ─────────────────
        skill_map = {}  # lowercase -> original_display_name
        
        def add_to_skill_map(skill_list):
            for s in skill_list:
                name = s if isinstance(s, str) else s.get("name", "")
                if not name: continue
                
                lower_name = name.lower().strip()
                # Logic: prefer the version with more capitals (e.g., "Node.js" over "node.js")
                if lower_name not in skill_map:
                    skill_map[lower_name] = name
                else:
                    current = skill_map[lower_name]
                    if sum(1 for c in name if c.isupper()) > sum(1 for c in current if c.isupper()):
                        skill_map[lower_name] = name

        add_to_skill_map(local.get("skills", []))
        add_to_skill_map(llm.get("skills", []))
        skills = sorted(list(skill_map.values()))

        # ── Helper for other lists ────────────────────────────────────────
        def union_lists(a: list, b: list) -> list:
            seen = set()
            result = []
            for item in (a or []) + (b or []):
                if not item: continue
                key = str(item).lower().strip()
                if key not in seen:
                    seen.add(key)
                    result.append(item)
            return result

        # ── Field Merging ──────────────────────────────────────────────────
        job_titles = union_lists(local.get("job_titles", []), llm.get("job_titles", []))
        
        # Company filtering: avoid listing tech stacks as companies
        raw_companies = union_lists(local.get("companies", []), llm.get("companies", []))
        skills_lower = {s.lower() for s in skills}
        companies = [c for c in raw_companies if str(c).lower() not in skills_lower]

        # Education: LLM is usually richer
        education = llm.get("education") or local.get("education", [])

        # Experience: take the larger estimate
        exp = max(
            local.get("total_experience_months", 0),
            llm.get("total_experience_months", 0),
        )

        # Confidence: weighted average
        local_conf = local.get("extraction_confidence", self.LOCAL_NLP_CONFIDENCE)
        llm_conf = llm.get("extraction_confidence", self.LLM_CONFIDENCE)
        confidence = round(local_conf * self.LOCAL_NLP_WEIGHT + llm_conf * self.LLM_WEIGHT, 2)

        return {
            "skills":                  skills,
            "job_titles":              job_titles,
            "companies":               companies,
            "education":               education,
            "certifications":          union_lists(local.get("certifications", []),  llm.get("certifications", [])),
            "total_experience_months": exp,
            "extraction_confidence":   confidence,
            "flagged_for_review":      False,
        }

    # ── LocalNLP ───────────────────────────────────────────────────────────────

    def _extract_with_local_nlp(self, text: str, language: str) -> Dict[str, Any]:
        from app.services.nlp.local_nlp_extractor import local_nlp_extractor
        result = local_nlp_extractor.extract(text, language)
        
        # Simplify skills to string list
        if result.get("skills") and isinstance(result["skills"][0], dict):
            result["skills"] = [s["name"] for s in result["skills"]]
        
        return result

    async def _extract_with_llm(self, masked_text: str, language: str) -> Dict[str, Any]:
        """Extract using Unified LLM Client via OpenRouter."""
        
        prompt = f"""You are an expert CV analyzer. Extract structured data from this CV.

CV TEXT:
{masked_text[:self.PROMPT_TEXT_LIMIT]}

INSTRUCTIONS:
1. Extract TECHNICAL SKILLS only (programming languages, frameworks, tools, technologies)
2. Extract job titles and companies
3. Extract education (degree, institution, year)
4. Extract certifications
5. Calculate total work experience in months

IMPORTANT RULES FOR SKILLS:
- Extract HARD and SPECIALIZED SKILLS specific to the candidate's profession (e.g., "Financial Auditing", "Pediatric Surgery", "Civil Litigation", "React", "Project Management").
- Do NOT include generic soft skills (e.g., "communication", "teamwork", "hardworking").
- Do NOT include adjectives (e.g., "passionate", "experienced").
- Do NOT include job titles (e.g., "developer", "doctor", "manager") as skills.
- Each skill should be a concise professional term (1-4 words maximum).

OUTPUT FORMAT (JSON only):
{{
  "skills": ["React", "JavaScript", "Python", "AWS", "Docker"],
  "job_titles": ["Frontend Developer", "Software Engineer"],
  "companies": ["Google", "Microsoft"],
  "education": [
    {{
      "degree": "Bachelor of Computer Science",
      "institution": "MIT",
      "year": "2020"
    }}
  ],
  "certifications": ["AWS Certified Developer", "Google Cloud Professional"],
  "total_experience_months": 36
}}

Return ONLY the JSON object. No explanations, no markdown, just JSON."""

        # Use Unified LLM Client with optimized settings
        response = await llm_client.generate(
            prompt=prompt,
            task_type="analysis",
            temperature=self.TEMPERATURE,
            max_tokens=self.MAX_TOKENS
        )
        
        if not response:
            raise Exception("Failed to get response from LLM")
        
        # Parse response using unified JSON parser
        data = json_parser.extract_json_object(response)
        if not data:
            raise ValueError("No valid JSON in LLM response")
        
        # Ensure skills is a list of strings
        skills = data.get("skills", [])
        if skills and isinstance(skills[0], dict):
            skills = [s["name"] if isinstance(s, dict) else s for s in skills]

        return {
            "skills":                  skills,
            "job_titles":              data.get("job_titles", []),
            "companies":               data.get("companies", []),
            "education":               data.get("education", []),
            "certifications":          data.get("certifications", []),
            "total_experience_months": data.get("total_experience_months", 0),
            "extraction_confidence":   0.95,
            "flagged_for_review":      False,
        }


# Singleton
extraction_agent = ExtractionAgent()
