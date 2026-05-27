"""
Local NLP Extractor using GLiNER (Zero-Shot NER).

A comprehensive, industry-agnostic extractor that understands context
without hardcoded skill lists. Works as a powerful local fallback.
"""
import re
from typing import Dict, List, Any, Optional
from app.utils.logger import logger

try:
    from gliner import GLiNER
    GLINER_AVAILABLE = True
except ImportError:
    GLINER_AVAILABLE = False
    logger.warning("GLiNER not found. Please install 'gliner'. Falling back to basic regex.")


class LocalNLPExtractor:
    """
    Advanced Local NLP extractor using GLiNER for Zero-Shot Entity Recognition.
    
    Can extract any entity type (Skills, Jobs, etc.) from any industry 
    by understanding the linguistic context.
    """

    def __init__(self):
        self._model = None
        self._initialized = False
        # Entities we want to extract
        self.labels = ["Skill", "Job Title", "Company", "Degree", "Certification"]

    def _ensure_loaded(self):
        """Lazy-load the GLiNER model (small version for performance)."""
        if self._initialized:
            return
        
        if not GLINER_AVAILABLE:
            self._initialized = True
            return

        try:
            # Using a small, fast model suitable for local CPU execution
            self._model = GLiNER.from_pretrained("numind/Entity_Extraction_v1") # or "urchade/gliner_small-v2.1"
            self._initialized = True
            logger.info("LocalNLPExtractor: GLiNER model loaded successfully")
        except Exception as e:
            logger.error(f"LocalNLPExtractor: Failed to load GLiNER: {e}")
            self._model = None
            self._initialized = True

    def extract(self, text: str, language: str = "en") -> Dict[str, Any]:
        """
        Extract structured data using Zero-Shot NER.
        """
        self._ensure_loaded()
        
        if not self._model:
            return self._fallback_extract(text)

        try:
            # 1. Run GLiNER Inference
            entities = self._model.predict_entities(text, self.labels, threshold=0.4)
            
            # 2. Process Results
            extracted = {
                "skills": [],
                "job_titles": set(),
                "companies": set(),
                "education": [],
                "certifications": set(),
            }

            for ent in entities:
                label = ent["label"]
                value = ent["text"].strip()
                
                if len(value) < 2: continue

                if label == "Skill":
                    # Filter out junk words using centralized list
                    from app.core.constants import SKILL_STOP_WORDS
                    if value.lower().strip() in SKILL_STOP_WORDS:
                        continue
                        
                    extracted["skills"].append({
                        "name": value.title(),
                        "level": self._estimate_level(value, text),
                        "category": "Extracted",
                        "demand": 80
                    })
                elif label == "Job Title":
                    extracted["job_titles"].add(value.title())
                elif label == "Company":
                    extracted["companies"].add(value)
                elif label == "Degree":
                    extracted["education"].append({"raw": value.title()})
                elif label == "Certification":
                    extracted["certifications"].add(value.title())

            # 3. Post-process and deduplicate
            return {
                "skills": self._deduplicate_skills(extracted["skills"]),
                "job_titles": list(extracted["job_titles"])[:10],
                "companies": list(extracted["companies"])[:10],
                "education": extracted["education"][:5],
                "certifications": list(extracted["certifications"])[:10],
                "total_experience_months": self._estimate_experience(text),
                "extraction_confidence": 0.85,
                "flagged_for_review": len(extracted["skills"]) == 0,
            }

        except Exception as e:
            logger.error(f"GLiNER extraction failed: {e}")
            return self._fallback_extract(text)

    def _estimate_level(self, skill: str, text: str) -> int:
        """Heuristic to estimate skill level from context."""
        context = text.lower()
        if any(w in context for w in ["expert", "advanced", "senior", "lead"]): return 90
        if any(w in context for w in ["proficient", "strong", "experienced"]): return 80
        if any(w in context for w in ["junior", "basic", "beginner"]): return 40
        return 70

    def _deduplicate_skills(self, skills: List[Dict]) -> List[Dict]:
        seen = set()
        unique = []
        for s in skills:
            if s["name"].lower() not in seen:
                seen.add(s["name"].lower())
                unique.append(s)
        return unique

    def _estimate_experience(self, text: str) -> int:
        """Estimate months from year patterns."""
        years = re.findall(r'\b(20\d{2}|19\d{2})\b', text)
        if not years: return 0
        sorted_years = sorted([int(y) for y in years])
        span = sorted_years[-1] - sorted_years[0]
        return min(max(span * 12, 0), 600)

    def _fallback_extract(self, text: str) -> Dict[str, Any]:
        """Keyword-based fallback if GLiNER model fails."""
        from app.core.constants import POPULAR_SKILLS
        
        # 1. Extract skills from a known list
        text_lower = text.lower()
        found_skills = []
        for skill in POPULAR_SKILLS:
            # Use word boundaries to avoid partial matches (e.g., 'C' in 'Cloud')
            pattern = r'\b' + re.escape(skill.lower()) + r'\b'
            if re.search(pattern, text_lower):
                found_skills.append({
                    "name": skill,
                    "level": 70,
                    "category": "Detected",
                    "demand": 75
                })
        
        # 2. Extract job titles (simple patterns)
        titles = set()
        title_patterns = [
            r'\b(?:Senior|Junior|Lead|Principal)?\s*(?:Software|Data|Systems|DevOps|Frontend|Backend|Fullstack|Cloud)\s*(?:Engineer|Developer|Architect|Analyst)\b',
            r'\b(?:Project|Product|Program|Operations|Marketing|Sales)\s*(?:Manager|Director|Specialist|Lead)\b',
            r'\b(?:Medical|Doctor|Nurse|Surgeon|Pharmacist)\b',
            r'\b(?:Attorney|Lawyer|Counsel|Consultant)\b'
        ]
        for p in title_patterns:
            matches = re.findall(p, text, re.IGNORECASE)
            for m in matches:
                titles.add(m.title())

        return {
            "skills": found_skills[:25],
            "job_titles": list(titles)[:5],
            "companies": [], 
            "education": [], 
            "certifications": [],
            "total_experience_months": self._estimate_experience(text),
            "extraction_confidence": 0.3,
            "flagged_for_review": True
        }


# Singleton instance
local_nlp_extractor = LocalNLPExtractor()
