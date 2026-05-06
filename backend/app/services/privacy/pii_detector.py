from typing import List, Optional
from dataclasses import dataclass
import re

from app.utils.logger import logger

try:
    from presidio_analyzer import AnalyzerEngine, RecognizerResult
    PRESIDIO_AVAILABLE = True
except ImportError:
    PRESIDIO_AVAILABLE = False
    logger.warning("presidio-analyzer not found. Falling back to basic detection.")


@dataclass
class PIIEntity:
    """Detected PII entity."""
    entity_type: str
    text: str
    start: int
    end: int
    confidence_score: float
    flagged_for_review: bool


class PIIDetector:
    """
    Smart Local PII detection using Microsoft Presidio + Heuristic Filtering.
    Ensures 100% Local Privacy (No Cloud Calls).
    """

    REVIEW_THRESHOLD = 0.7
    
    # Common industry-agnostic professional terms to ignore
    # This is a small seed list; the heuristics handle most other cases.
    PROFESSIONAL_KEYWORDS = {
        'university', 'college', 'school', 'institute', 'bachelor', 'master', 'phd', 'degree',
        'manager', 'director', 'lead', 'senior', 'junior', 'specialist', 'consultant', 'analyst',
        'experience', 'education', 'skills', 'summary', 'projects', 'languages', 'certifications',
        'medicine', 'surgery', 'engineering', 'science', 'accounting', 'legal', 'management'
    }

    def __init__(self):
        self._engine = None
        logger.info("PII Detector initialized (Smart Local Analysis)")

    def _get_engine(self):
        """Lazy-load Presidio engine."""
        if self._engine is None and PRESIDIO_AVAILABLE:
            try:
                self._engine = AnalyzerEngine()
                logger.info("Microsoft Presidio AnalyzerEngine loaded")
            except Exception as e:
                logger.error(f"Failed to load Presidio: {e}")
                self._engine = False
        return self._engine if self._engine else None

    def detect_pii(
        self,
        text: str,
        language: str = 'en',
        entity_types: Optional[List[str]] = None
    ) -> List[PIIEntity]:
        """
        Main entry point for local PII detection.
        """
        entities: List[PIIEntity] = []
        
        # 1. Pattern-based detection (Emails, Phones)
        regex_entities = self._fallback_detection(text)
        entities.extend(regex_entities)
        
        # 2. Contextual NER Analysis (Presidio)
        engine = self._get_engine()
        if not engine:
            return entities

        try:
            results = engine.analyze(
                text=text,
                language=language,
                entities=['PERSON', 'LOCATION'],
                score_threshold=0.45
            )

            for res in results:
                entity_text = text[res.start:res.end].strip()
                
                # ── SMART HEURISTICS (Industry Agnostic) ──
                
                # Rule 1: Skip if already detected by Regex
                if any(e.start <= res.start and e.end >= res.end for e in entities):
                    continue

                # Rule 2: Symbols/Special Chars (Libraries, Tools, Chemicals, Equations)
                # Matches: C++, node.js, .NET, H2O, etc.
                if any(char in entity_text for char in ['.', '+', '#', '/', '(', ')', '_', ':']):
                    continue

                # Rule 3: Versioning/Numbers (Python 3, ISO 9001, etc.)
                if any(char.isdigit() for char in entity_text):
                    continue

                # Rule 4: Professional Case Check
                # If ALL CAPS (REACT) or all lower (react), usually not a Name in a CV context
                if entity_text.isupper() or entity_text.islower():
                    continue

                # Rule 5: CamelCase check (TensorFlow, GitHub, etc.)
                if len(entity_text) > 3 and any(c.isupper() for c in entity_text[1:-1]):
                    if ' ' not in entity_text:
                        continue

                # Rule 6: Common Professional Keywords
                if entity_text.lower() in self.PROFESSIONAL_KEYWORDS:
                    continue

                # Rule 7: Minimum length (Names < 3 chars are rare in this context)
                if len(entity_text) < 3:
                    continue

                # Add valid PII entity
                entities.append(PIIEntity(
                    entity_type='NAME' if res.entity_type == 'PERSON' else 'ADDRESS',
                    text=entity_text,
                    start=res.start,
                    end=res.end,
                    confidence_score=res.score,
                    flagged_for_review=res.score < self.REVIEW_THRESHOLD
                ))

            return sorted(entities, key=lambda x: x.start)
        except Exception as e:
            logger.error(f"Local PII analysis error: {e}")
            return entities

    def _fallback_detection(self, text: str) -> List[PIIEntity]:
        """Regex-based detection for fixed patterns."""
        entities = []
        patterns = {
            'EMAIL': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b',
            'PHONE': r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3}[-.\s]?\d{4,8}\b',
        }
        for p_type, pattern in patterns.items():
            for m in re.finditer(pattern, text):
                entities.append(PIIEntity(
                    entity_type=p_type,
                    text=m.group(),
                    start=m.start(),
                    end=m.end(),
                    confidence_score=0.95,
                    flagged_for_review=False
                ))
        return entities

    def get_flagged_entities(self, entities: List[PIIEntity]) -> List[PIIEntity]:
        return [e for e in entities if e.flagged_for_review]


# Global instance
pii_detector = PIIDetector()
