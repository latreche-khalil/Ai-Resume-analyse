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

    TECHNICAL_KEYWORDS = {
        # Programming Languages
        'python', 'javascript', 'typescript', 'java', 'kotlin', 'swift', 'ruby', 'rails',
        'php', 'rust', 'go', 'golang', 'html', 'css', 'sql', 'nosql', 'scala', 'scalar',
        'bash', 'powershell', 'perl', 'julia', 'matlab',
        
        # AI/ML/Data Science
        'tensorflow', 'keras', 'pytorch', 'numpy', 'pandas', 'scipy', 'sklearn', 'scikit',
        'scikit-learn', 'matplotlib', 'seaborn', 'nltk', 'spacy', 'opencv', 'huggingface',
        'hugging', 'transformers', 'langchain', 'langgraph', 'llamaindex', 'llama',
        'openai', 'gpt', 'claude', 'gemini', 'ollama', 'chromadb', 'chroma', 'milvus',
        'pinecone', 'qdrant', 'weaviate', 'elasticsearch', 'elastic', 'solr', 'rag',
        
        # Cloud/Platforms/Services
        'aws', 'azure', 'gcp', 'google', 'amazon', 'cloud', 'bedrock', 'vertex',
        'vertexai', 'sagemaker', 'lambda', 'active', 'directory', 'studio', 'portal',
        'office', '365', 'firebase', 'supabase', 'heroku', 'vercel', 'netlify',
        
        # Libraries/Frameworks
        'react', 'angular', 'vue', 'nextjs', 'next', 'nuxt', 'svelte', 'nodejs',
        'node', 'express', 'nestjs', 'django', 'flask', 'fastapi', 'streamlit',
        'spring', 'springboot', 'hibernate', 'laravel', 'symfony', 'asp', 'net',
        'bootstrap', 'tailwind', 'jquery', 'redux', 'ngrx', 'webpack', 'vite',
        
        # Databases & Cache
        'postgres', 'postgresql', 'mysql', 'mongodb', 'sqlite', 'redis', 'memcached',
        'cassandra', 'dynamodb', 'neo4j', 'couchdb', 'mariadb', 'oracle',
        
        # DevOps & Tools
        'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'jenkins', 'git',
        'github', 'gitlab', 'actions', 'circleci', 'argocd', 'helm', 'nginx',
        'apache', 'graphql', 'grpc', 'postman', 'oauth', 'jwt', 'auth0', 'stripe',
        'jira', 'confluence', 'slack', 'figma'
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
            # Leverage Presidio's native allow_list feature with our technical keywords
            results = engine.analyze(
                text=text,
                language=language,
                entities=['PERSON', 'LOCATION'],
                score_threshold=0.45,
                allow_list=list(self.TECHNICAL_KEYWORDS)
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

                # Rule 6b: Smart Dynamic Technology Check (prevents masking of technical skills/tools)
                if self._is_probably_technology(entity_text, res.start, text):
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

    def _is_probably_technology(self, entity_text: str, start_idx: int, text: str) -> bool:
        """
        Dynamically determine if a detected entity is actually a technical skill, 
        library, or tool rather than a person's name or location using context clues.
        """
        entity_lower = entity_text.lower().strip()
        
        # 1. Prefix/Suffix rules for libraries/tools (e.g., nodejs, PyTorch, MongoDB, LangChain)
        tech_suffixes = ('js', 'db', 'flow', 'learn', 'torch', 'chain', 'graph', 'stack', 'cloud', 'hub', 'kit', 'sdk', 'cli', 'api', 'net')
        tech_prefixes = ('open', 'tensor', 'kube', 'k8s', 'micro', 'git', 'web')
        
        if entity_lower.endswith(tech_suffixes) or entity_lower.startswith(tech_prefixes):
            return True
            
        # 2. Section Context Analysis (e.g., inside "Skills" or "Technologies" section)
        text_before = text[:start_idx].lower()
        section_headers = [
            'skills', 'technologies', 'technical skills', 'core competencies', 
            'tools', 'expertise', 'tech stack', 'languages & frameworks', 'frameworks'
        ]
        
        last_header_idx = -1
        for header in section_headers:
            idx = text_before.rfind(header)
            if idx > last_header_idx:
                last_header_idx = idx
                
        if last_header_idx != -1:
            # Check if any major non-tech section started after the skills header
            experience_headers = ['experience', 'work', 'employment', 'education', 'projects', 'history', 'professional history']
            after_skills_text = text_before[last_header_idx:]
            has_experience_after = any(eh in after_skills_text for eh in experience_headers)
            
            # If we are inside the skills section and no new section has started yet (within 600 chars)
            if not has_experience_after and (start_idx - last_header_idx) < 600:
                logger.info(f"PII Detector: Bypassed '{entity_text}' - found inside skills/technologies section.")
                return True
                
        # 3. Contextual Grammar & Surrounding Words Check
        # Only verify context if the entity is further down in the CV (name is at the top)
        if start_idx > 400:
            text_immediately_before = text[max(0, start_idx - 25):start_idx].lower()
            text_immediately_after = text[start_idx + len(entity_text):min(len(text), start_idx + len(entity_text) + 25)].lower()
            
            tech_triggers_before = [
                'using', 'with', 'leveraging', 'utilizing', 'in ', 'experience in',
                'built on', 'built with', 'developed in', 'developed with', 'written in',
                'proficient in', 'expert in', 'knowledge of'
            ]
            
            tech_triggers_after = [
                'developer', 'engineer', 'framework', 'library', 'database', 'api', 
                'tool', 'sdk', 'stack', 'platform', 'system', 'architecture'
            ]
            
            if any(trigger in text_immediately_before for trigger in tech_triggers_before):
                logger.info(f"PII Detector: Bypassed '{entity_text}' - technical context trigger before.")
                return True
                
            if any(trigger in text_immediately_after for trigger in tech_triggers_after):
                logger.info(f"PII Detector: Bypassed '{entity_text}' - technical context trigger after.")
                return True
                
        # 4. Fallback core tech list check
        words = entity_lower.split()
        if any(w in self.TECHNICAL_KEYWORDS for w in words) or entity_lower in self.TECHNICAL_KEYWORDS:
            return True
            
        return False

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
