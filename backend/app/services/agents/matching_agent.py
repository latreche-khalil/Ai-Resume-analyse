"""
Matching Agent - Semantic CV-JD Matching using OpenRouter.

Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.10, 8.11
"""
import json
import time
from typing import Dict, Any, Optional, Tuple
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.nlp.rag_pipeline import rag_pipeline
from app.core.redis_client import redis_client
from app.services.privacy.privacy_gateway import require_masked_text
from app.services.nlp.llm_client import llm_client
from app.utils.json_parser import json_parser
from app.utils.logger import logger


class MatchingAgent:
    """
    Matching Agent for semantic CV-JD matching using OpenRouter.
    
    Features:
    - Semantic matching using Llama 3.1 405B
    - Match score calculation (0.0-1.0)
    - Skill identification (matching, missing, transferable)
    - Result caching (24 hours)
    - Performance target: 3 seconds per CV-JD pair
    
    Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.10, 8.11
    """
    
    # Performance target
    PERFORMANCE_TARGET_SECONDS = 3.0
    
    # Cache TTL: 24 hours
    CACHE_TTL_SECONDS = 86400
    
    # LLM Configuration
    TEMPERATURE = 0.2  # Lower for consistency and speed
    MAX_TOKENS = 1200  # Reduced for faster generation
    
    # Text limits
    CV_TEXT_LIMIT = 10000
    JD_TEXT_LIMIT = 5000
    
    # Result limits
    MAX_MATCHING_SKILLS = 30
    MAX_MISSING_SKILLS = 30
    MAX_TRANSFERABLE_SKILLS = 20
    MAX_RED_FLAGS = 10
    
    @require_masked_text("masked_cv")
    async def match(
        self,
        masked_cv: str,
        job_description: str,
        cv_document_id: UUID,
        jd_id: UUID,
        db: AsyncSession,
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Match CV with job description.
        
        Args:
            masked_cv: Masked CV text
            job_description: Job description text
            cv_document_id: CV document ID
            jd_id: Job description ID
            db: Database session
            language: Language for prompts (ar/en/fr)
            
        Returns:
            Match results with score and skills
            
        Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
        """
        start_time = time.time()
        
        try:
            # Check cache
            cache_key = f"match:{cv_document_id}:{jd_id}"
            cached_result = await redis_client.get_cache(cache_key)
            
            if cached_result:
                logger.info(f"Cache hit for match: {cache_key}")
                return cached_result
            
            # Try to use RAG for intelligent CV chunk retrieval
            cv_context = masked_cv  # Default: use full CV
            
            try:
                # Extract key requirements from JD for better RAG search
                jd_summary = job_description[:500]  # First 500 chars usually contain key requirements
                
                cv_chunks = await rag_pipeline.semantic_search(
                    query=jd_summary,
                    document_ids=[cv_document_id],
                    top_k=8  # Increased from 5 to get more context
                )
                
                if cv_chunks and len(cv_chunks) > 0:
                    # RAG available: use relevant chunks + full CV summary
                    relevant_text = "\n\n".join([chunk['text'] for chunk in cv_chunks])
                    cv_context = f"{masked_cv[:self.CV_TEXT_LIMIT]}\n\n--- RELEVANT EXPERIENCE ---\n\n{relevant_text}"
                    logger.info(f"RAG: Retrieved {len(cv_chunks)} relevant chunks")
                else:
                    # RAG empty: use full CV (better than truncating)
                    logger.info("RAG: No chunks found, using full CV text")
                    
            except Exception as rag_error:
                # RAG failed: gracefully fallback to full CV
                logger.warning(f"RAG error ({rag_error}), using full CV text")
                cv_context = masked_cv
            
            # Create matching prompt
            prompt = self._create_matching_prompt(
                cv_text=cv_context,
                jd_text=job_description,
                language=language
            )
            
            # Call Unified LLM Client with optimized settings
            response = await llm_client.generate(
                prompt=prompt,
                task_type="analysis",
                temperature=self.TEMPERATURE,
                max_tokens=self.MAX_TOKENS
            )
            
            if not response:
                raise Exception("Failed to get response from LLM")
            
            # Parse response
            match_result = self._parse_matching_response(response)
            
            # Validate match score
            if not (0.0 <= match_result['match_score'] <= 1.0):
                logger.warning(f"Invalid match score: {match_result['match_score']}, clamping to [0, 1]")
                match_result['match_score'] = max(0.0, min(1.0, match_result['match_score']))
            
            # Cache result
            await redis_client.set_cache(
                cache_key,
                match_result,
                ttl_seconds=self.CACHE_TTL_SECONDS
            )
            
            elapsed_time = time.time() - start_time
            
            if elapsed_time > self.PERFORMANCE_TARGET_SECONDS:
                logger.warning(
                    f"Matching exceeded target: {elapsed_time:.2f}s > "
                    f"{self.PERFORMANCE_TARGET_SECONDS}s"
                )
            else:
                logger.info(f"Matching completed in {elapsed_time:.2f}s")
            
            return match_result
            
        except Exception as e:
            logger.error(f"Matching error: {str(e)}")
            raise
    
    def _create_matching_prompt(
        self,
        cv_text: str,
        jd_text: str,
        language: str = "en"
    ) -> str:
        """Create matching prompt via OpenRouter."""
        lang_map = {'ar': 'Arabic', 'en': 'English', 'fr': 'French'}
        lang = lang_map.get(language, 'English')
        
        return f"""You are a professional recruiter. Compare this CV with the job requirements.

JOB REQUIREMENTS:
{jd_text[:self.JD_TEXT_LIMIT]}

CANDIDATE CV:
{cv_text[:self.CV_TEXT_LIMIT]}

INSTRUCTIONS:
1. Extract TECHNICAL SKILLS ONLY (programming languages, frameworks, tools, technologies)
2. Compare CV skills with job requirements
3. Calculate match score (0.0 to 1.0)
4. List matching skills (skills candidate HAS that job needs)
5. List missing skills (skills job needs but candidate LACKS)
6. List transferable skills (related skills that could help)
7. Analyze SENIORITY level alignment (cv_level vs jd_level)
8. Identify any potential RED FLAGS
9. Determine hiring urgency based on JD language

IMPORTANT RULES:
- Extract HARD and SPECIALIZED SKILLS specific to the job domain (e.g., "Revenue Forecasting", "Orthopedic Surgery", "Legal Drafting", "React", "Supply Chain Optimization").
- Do NOT include generic soft skills (e.g., "communication", "teamwork", "fast learner").
- Do NOT include adjectives (e.g., "passionate", "experienced").
- Do NOT include job titles (e.g., "developer", "engineer") as skills.
- Each skill should be a concise professional term (1-4 words maximum).
- Seniority levels should be: Junior, Mid, Senior, Lead, or Expert.

OUTPUT FORMAT (JSON only):
{{
  "match_score": 0.75,
  "matching_skills": ["React", "JavaScript", "TypeScript"],
  "missing_skills": ["Redux", "GraphQL", "Docker"],
  "transferable_skills": ["Vue.js", "Node.js"],
  "summary": "Candidate has strong frontend skills but lacks some backend technologies.",
  "recommendation": "interview",
  "confidence": "high",
  "seniority_alignment": {{
    "cv_level": "Senior",
    "jd_level": "Senior",
    "match": "matched",
    "explanation": "Candidate has 7 years of relevant experience."
  }},
  "red_flags": ["Frequent job changes in the last 2 years"],
  "hiring_urgency": "standard"
}}

Return ONLY the JSON object. No explanations, no markdown, just JSON."""
    
    def _parse_matching_response(self, response: str) -> Dict[str, Any]:
        """
        Parse OpenRouter response into structured format with market intelligence.
        
        Requirements: 8.3, 8.4, 8.5
        """
        try:
            # Extract JSON using unified parser
            result = json_parser.extract_json_object(response)
            if not result:
                raise ValueError("No valid JSON found in response")
            
            # Extract skills as simple strings (handle both formats)
            def extract_skills(skills_list, limit=15):
                if not skills_list:
                    return []
                extracted = []
                for skill in skills_list:
                    if isinstance(skill, str):
                        extracted.append(skill)
                    elif isinstance(skill, dict):
                        extracted.append(skill.get('skill', skill.get('name', str(skill))))
                return extracted[:limit]
            
            # Validate and normalize - simplified output
            return {
                # Core matching
                'match_score': float(result.get('match_score', 0.0)),
                'matching_skills': extract_skills(result.get('matching_skills', []), self.MAX_MATCHING_SKILLS),
                'missing_skills': extract_skills(result.get('missing_skills', []), self.MAX_MISSING_SKILLS),
                'transferable_skills': extract_skills(result.get('transferable_skills', []), self.MAX_TRANSFERABLE_SKILLS),
                'summary': result.get('summary', ''),
                'recommendation': result.get('recommendation', 'consider'),
                'confidence': result.get('confidence', 'medium'),
                'confidence_score': 0.9 if result.get('confidence') == 'high' else 0.6 if result.get('confidence') == 'medium' else 0.3,
                
                # Professional fields
                'seniority_alignment': result.get('seniority_alignment', {
                    'cv_level': 'unknown',
                    'jd_level': 'unknown',
                    'match': 'unknown',
                    'explanation': ''
                }),
                'red_flags': result.get('red_flags', [])[:self.MAX_RED_FLAGS],
                'hiring_urgency': result.get('hiring_urgency', 'standard')
            }
            
        except Exception as e:
            logger.error(f"Failed to parse matching response: {str(e)}")
            # Return default result
            return {
                'match_score': 0.0,
                'matching_skills': [],
                'missing_skills': [],
                'transferable_skills': [],
                'summary': 'Failed to analyze match',
                'recommendation': 'consider',
                'confidence': 'low',
                'seniority_alignment': {'cv_level': 'unknown', 'jd_level': 'unknown', 'match': 'unknown', 'explanation': ''},
                'red_flags': [],
                'hiring_urgency': 'standard'
            }


# Global matching agent instance
matching_agent = MatchingAgent()
