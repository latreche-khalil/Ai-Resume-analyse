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
    PII detection using Microsoft Presidio (Enterprise-grade).
    Handles overlapping spans, multi-language NER, and complex patterns.
    """

    REVIEW_THRESHOLD = 0.7
    
    # Whitelist of tech terms that should never be masked (Libraries, Frameworks, Tech)
    TECH_WHITELIST = {
        # Languages & Core
        'python', 'java', 'javascript', 'typescript', 'node', 'node.js', 'html', 'css', 'sass', 'less',
        'swift', 'kotlin', 'go', 'golang', 'rust', 'ruby', 'php', 'c++', 'c#', 'scala', 'dart',
        
        # Frontend
        'react', 'next', 'next.js', 'vue', 'vue.js', 'angular', 'svelte', 'tailwind', 'bootstrap',
        'redux', 'mobx', 'framer', 'motion', 'three.js', 'd3', 'd3.js', 'webpack', 'vite', 'babel',
        
        # Backend & APIs
        'express', 'nest.js', 'nestjs', 'django', 'flask', 'fastapi', 'laravel', 'spring', 'hibernate',
        'graphql', 'apollo', 'rest', 'grpc', 'soap', 'socket.io', 'websockets',
        
        # Data & AI
        'pandas', 'numpy', 'scipy', 'scikit-learn', 'tensorflow', 'pytorch', 'keras', 'opencv',
        'nlp', 'llm', 'bert', 'gpt', 'transformer', 'matplotlib', 'seaborn', 'plotly', 'tableau',
        'hadoop', 'spark', 'kafka', 'airflow', 'snowflake', 'databricks',
        
        # DB & DevOps
        'sql', 'nosql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'cassandra',
        'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'jenkins', 'github', 'gitlab', 'bitbucket',
        'aws', 'azure', 'gcp', 'firebase', 'vercel', 'netlify', 'nginx', 'linux', 'unix', 'ubuntu',
        
        # Tools & Concepts
        'git', 'jira', 'confluence', 'trello', 'figma', 'postman', 'swagger', 'ci/cd', 'agile', 'scrum',
        'api', 'json', 'xml', 'yaml', 'bash', 'shell', 'npm', 'yarn', 'pnpm', 'pip', 'poetry',
        
        # Common CV Headers (prevent accidental name masking)
        'experience', 'education', 'skills', 'projects', 'summary', 'objective', 'languages',
        'certifications', 'awards', 'publications', 'interests', 'contact', 'profile',
        
        # Educational & Professional terms
        'university', 'college', 'school', 'institute', 'academy', 'faculty', 'department',
        'bachelor', 'master', 'phd', 'doctorate', 'degree', 'diploma', 'certificate',
        'engineering', 'science', 'arts', 'commerce', 'business', 'management', 'technology',
        'software', 'developer', 'engineer', 'manager', 'lead', 'senior', 'junior', 'intern'
    }

    def __init__(self):
        self._engine = None
        logger.info("PII Detector initialized (Presidio Engine)")

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
        Hybrid PII Detection: Regex for patterns + Presidio for context.
        """
        entities: List[PIIEntity] = []
        
        # 1. High-Precision Regex (Email & Phone)
        # We always run these first as they are pattern-based and extremely accurate.
        regex_entities = self._fallback_detection(text)
        entities.extend(regex_entities)
        
        # 2. Deep Analysis (Presidio / NER)
        engine = self._get_engine()
        if not engine:
            return entities

        try:
            results = engine.analyze(
                text=text,
                language=language,
                entities=entity_types,
                score_threshold=0.4
            )

            TYPE_MAP = {
                'PERSON': 'NAME',
                'EMAIL_ADDRESS': 'EMAIL',
                'PHONE_NUMBER': 'PHONE',
                'LOCATION': 'ADDRESS',
                'DATE_TIME': 'DATE_OF_BIRTH',
                'US_PASSPORT': 'ID_NUMBER',
                'US_SSN': 'ID_NUMBER',
                'US_DRIVER_LICENSE': 'ID_NUMBER'
            }

            for res in results:
                entity_text = text[res.start:res.end].strip()
                
                # Deduplicate: Skip if already detected by high-precision Regex
                if any(e.start <= res.start and e.end >= res.end for e in entities):
                    continue

                # ── Professional Context Preservation (White-list & Heuristics) ──
                if entity_text.lower() in self.TECH_WHITELIST:
                    continue
                
                if res.entity_type == 'PERSON':
                    # Heuristic 1: Short words (acronyms)
                    if len(entity_text) <= 3: continue
                    
                    # Heuristic 2: All-caps (usually project names or tech)
                    if entity_text.isupper() and len(entity_text) < 10: continue
                    
                    # Heuristic 3: Technical patterns (lower start, numbers, dots, camelCase)
                    if ' ' not in entity_text:
                        is_tech = (
                            entity_text[0].islower() or 
                            any(c.isdigit() for c in entity_text) or
                            '.' in entity_text or '-' in entity_text or
                            (len(entity_text) > 3 and any(c.isupper() for c in entity_text[1:]))
                        )
                        if is_tech: continue
                    
                    # Heuristic 4: Confidence check for single-word names
                    if ' ' not in entity_text and res.score < 0.85: continue

                # Normalize and Add
                mapped_type = TYPE_MAP.get(res.entity_type, 'NAME') 
                entities.append(PIIEntity(
                    entity_type=mapped_type,
                    text=entity_text,
                    start=res.start,
                    end=res.end,
                    confidence_score=res.score,
                    flagged_for_review=res.score < self.REVIEW_THRESHOLD
                ))

            # Sort by start position
            return sorted(entities, key=lambda x: x.start)

        except Exception as e:
            logger.error(f"Presidio analysis failed: {e}")
            return entities

    def _fallback_detection(self, text: str) -> List[PIIEntity]:
        """High-precision Regex-based detection for fixed patterns."""
        entities = []
        patterns = {
            'EMAIL': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b',
            # Improved Phone Regex: International (E.164) + North Africa/Algeria specific
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
        
        # Arabic PII Safety Net (Detect sequences of Arabic script as potential PII)
        # This handles cases where NER might fail on Arabic names/locations
        arabic_pattern = r'[\u0600-\u06FF\s]{5,50}'
        for m in re.finditer(arabic_pattern, text):
            # Only flag if it's a relatively short sequence (likely a name/address, not a paragraph)
            val = m.group().strip()
            if 2 <= len(val.split()) <= 4:
                entities.append(PIIEntity(
                    entity_type='NAME', # Fallback to NAME for Arabic script sequences
                    text=val,
                    start=m.start(),
                    end=m.end(),
                    confidence_score=0.6,
                    flagged_for_review=True # Always flag Arabic fallbacks for review
                ))

        return entities

    def get_flagged_entities(self, entities: List[PIIEntity]) -> List[PIIEntity]:
        return [e for e in entities if e.flagged_for_review]


# Global PII detector instance
pii_detector = PIIDetector()


