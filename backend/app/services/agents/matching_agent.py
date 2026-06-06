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
    MAX_TOKENS = 2000  # Increased to prevent truncation on detailed analyses
    
    # Text limits (Optimized for balance between context and free-tier stability)
    CV_TEXT_LIMIT = 6000
    JD_TEXT_LIMIT = 3000
    
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
        language: str = "en",
        mode: str = "candidate"   # "candidate" | "recruiter"
    ) -> Dict[str, Any]:
        """
        Match CV with job description with fresh AI analysis.
        """
        start_time = time.time()
        
        try:
            # Bypass cache to ensure the user sees fresh LLM results after the fix
            # cache_key = f"match:{cv_document_id}:{jd_id}"
            # cached_result = await redis_client.get_cache(cache_key)
            # if cached_result: return cached_result
            
            # --- RAG strategy for CV ---
            cv_context = masked_cv
            CV_RAG_THRESHOLD = 5000  # chars

            try:
                cv_len = len(masked_cv)
                if cv_len >= CV_RAG_THRESHOLD:
                    logger.info(f"Large CV detected ({cv_len} chars) — activating RAG retrieval")
                    jd_summary = job_description[:500]
                    cv_chunks = await rag_pipeline.semantic_search(
                        query=jd_summary,
                        document_ids=[cv_document_id],
                        top_k=8
                    )
                    if cv_chunks:
                        # Use retrieved chunks as primary context + first 1000 chars for overview
                        overview = masked_cv[:1000]
                        relevant_text = "\n\n".join([chunk['text'] for chunk in cv_chunks])
                        cv_context = (
                            f"--- CV OVERVIEW ---\n{overview}\n\n"
                            f"--- MOST RELEVANT SECTIONS (RAG) ---\n{relevant_text}"
                        )
                        logger.info(f"RAG (CV): retrieved {len(cv_chunks)} chunks ({len(cv_context)} chars total)")
                    else:
                        cv_context = masked_cv[:self.CV_TEXT_LIMIT]
                        logger.info("RAG (CV): no chunks found, using truncated text")
                else:
                    cv_context = masked_cv
            except Exception as rag_err:
                logger.warning(f"RAG (CV) retrieval failed, using full text: {rag_err}")
                cv_context = masked_cv[:self.CV_TEXT_LIMIT]

            # --- RAG strategy for Job Description (JD) ---
            jd_context = job_description
            JD_RAG_THRESHOLD = 5000  # chars

            try:
                jd_len = len(job_description)
                if jd_len >= JD_RAG_THRESHOLD:
                    logger.info(f"Large JD detected ({jd_len} chars) — activating dynamic RAG retrieval")
                    import asyncio
                    await asyncio.to_thread(rag_pipeline._ensure_initialized)
                    
                    if rag_pipeline.embedding_model:
                        # Chunk the JD
                        jd_chunks = rag_pipeline.chunk_text(job_description, language)
                        if len(jd_chunks) > 1:
                            jd_texts = [chunk['text'] for chunk in jd_chunks]
                            
                            # Embed JD chunks
                            jd_embs = await asyncio.to_thread(
                                rag_pipeline.embedding_model.encode,
                                jd_texts,
                                show_progress_bar=False,
                                convert_to_numpy=True
                            )
                            
                            # Embed query (CV overview / first 1000 chars of masked CV)
                            cv_query = masked_cv[:1000]
                            query_emb = await asyncio.to_thread(
                                rag_pipeline.embedding_model.encode,
                                [cv_query],
                                show_progress_bar=False,
                                convert_to_numpy=True
                            )[0]
                            
                            # Calculate cosine similarity
                            import numpy as np
                            jd_embs_norm = jd_embs / np.linalg.norm(jd_embs, axis=1, keepdims=True)
                            query_emb_norm = query_emb / np.linalg.norm(query_emb)
                            similarities = np.dot(jd_embs_norm, query_emb_norm)
                            
                            # Sort descending
                            sorted_indices = np.argsort(similarities)[::-1]
                            
                            # Take top K chunks (e.g. 4 chunks)
                            top_k = min(4, len(jd_chunks))
                            top_indices = sorted(sorted_indices[:top_k])
                            
                            relevant_jd_chunks = [jd_texts[idx] for idx in top_indices]
                            jd_context = (
                                "--- JOB DESCRIPTION OVERVIEW ---\n"
                                f"{job_description[:800]}\n\n"
                                "--- MOST RELEVANT JOB DESCRIPTION SECTIONS (RAG) ---\n"
                                + "\n\n".join(relevant_jd_chunks)
                            )
                            logger.info(f"RAG (JD): retrieved {top_k} chunks ({len(jd_context)} chars total)")
                        else:
                            logger.info("RAG (JD): only 1 chunk, using full description")
                    else:
                        jd_context = job_description[:self.JD_TEXT_LIMIT]
                else:
                    jd_context = job_description
            except Exception as jd_rag_err:
                logger.warning(f"RAG (JD) retrieval failed, using fallback/truncated: {jd_rag_err}")
                jd_context = job_description[:self.JD_TEXT_LIMIT]
            
            # Validate inputs
            if not cv_context or len(cv_context.strip()) < 50:
                raise ValueError(f"CV context is too short or empty ({len(cv_context) if cv_context else 0} chars). Extraction might have failed.")
            if not jd_context or len(jd_context.strip()) < 20:
                raise ValueError(f"Job description context is too short or empty ({len(jd_context) if jd_context else 0} chars).")

            # ── Prompt Injection Sanitizer ────────────────────────────────────
            # Strip adversarial instruction patterns from user-supplied content
            # before it is inserted into the LLM prompt template.
            cv_context  = self._sanitize_prompt_input(cv_context)
            jd_context  = self._sanitize_prompt_input(jd_context)

            # Create matching prompt
            prompt = self._create_matching_prompt(
                cv_text=cv_context,
                jd_text=jd_context,
                language=language,
                mode=mode
            )
            
            # Call Unified LLM Client
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
            
            # Critical check: if score is 0 but matching_skills exist, the model failed to calculate properly
            if match_result.get('match_score', 0) == 0 and len(match_result.get('matching_skills', [])) > 0:
                # Heuristic fallback: base score on matching skills density
                match_result['match_score'] = min(0.9, len(match_result['matching_skills']) / 10.0)
                match_result['summary'] = f"[ADJUSTED] {match_result['summary']}"
            
            # Validate match score range
            match_result['match_score'] = max(0.0, min(1.0, float(match_result.get('match_score', 0.0))))

            # ── Hallucination / Confidence Gate ───────────────────────────────
            # Flag low-confidence results for human review so they are never
            # silently passed to recruiters as authoritative assessments.
            confidence = match_result.get('confidence', 'medium')
            if confidence == 'low':
                match_result['requires_human_review'] = True
                match_result['low_confidence_warning'] = (
                    "AI confidence is LOW. Results may be unreliable — "
                    "manual review is required before making any hiring decision."
                )
                logger.warning(
                    f"Low-confidence analysis result — flagged for human review. "
                    f"score={match_result['match_score']:.2f}"
                )
            else:
                match_result.setdefault('requires_human_review', False)
            
            elapsed_time = time.time() - start_time
            logger.info(f"Fresh AI matching completed in {elapsed_time:.2f}s")
            
            return match_result
            
        except Exception as e:
            logger.error(f"Matching error: {str(e)}")
            raise

    @staticmethod
    def _sanitize_prompt_input(text: str) -> str:
        """
        Sanitize user-supplied text before insertion into LLM prompts.

        Removes / neutralises common prompt-injection patterns such as:
          - "Ignore previous instructions …"
          - "You are now …"
          - "SYSTEM:", "USER:", "ASSISTANT:" role-spoofing headers
          - Excessive special-character sequences used to break delimiters

        The original meaning of legitimate CV/JD content is preserved —
        only adversarial control phrases are neutralised by replacing them
        with a harmless placeholder so the LLM sees them as plain text.
        """
        import re

        # Patterns that attempt to override system instructions
        injection_patterns = [
            # Classic jailbreak openers (case-insensitive)
            r'(?i)\bignore\s+(all\s+)?(previous|prior|above|system|my)\s+(instructions?|prompts?|context|rules?)\b',
            r'(?i)\byou\s+are\s+now\s+\w',
            r'(?i)\bact\s+as\s+(if\s+you\s+are|an?\s+)',
            r'(?i)\bforget\s+(everything|all|your|previous)',
            r'(?i)\bdisregard\s+(all|previous|prior|above)',
            r'(?i)\bnew\s+instructions?\s*:',
            r'(?i)\boverride\s+(system|instructions?|rules?)',
            r'(?i)\bjailbreak\b',
            r'(?i)\bDAN\s+mode\b',
            # Role-spoofing headers that try to inject a fake system turn
            r'(?i)^\s*(SYSTEM|USER|ASSISTANT|HUMAN|AI)\s*:\s*',
            # Delimiter flooding — long runs of special chars used to break prompt structure
            r'[<>\[\]{}\|]{10,}',
            r'={5,}',
            r'-{10,}',
        ]

        sanitized = text
        for pattern in injection_patterns:
            sanitized = re.sub(pattern, '[FILTERED]', sanitized)

        # Log if anything was sanitised
        if sanitized != text:
            logger.warning(
                "Prompt injection attempt detected and neutralised in user input. "
                f"Original length={len(text)}, sanitised length={len(sanitized)}"
            )

        return sanitized

    def _create_matching_prompt(
        self,
        cv_text: str,
        jd_text: str,
        language: str = "en",
        mode: str = "candidate"
    ) -> str:
        """
        Returns the correct prompt based on mode:
        - candidate : coaching-oriented, explains score, gives improvement tips
        - recruiter : hiring-decision-oriented, evidence + interview questions
        """
        lang_map = {'ar': 'Arabic', 'en': 'English', 'fr': 'French'}
        lang = lang_map.get(language, 'English')

        if mode == "recruiter":
            return self._recruiter_prompt(cv_text, jd_text, lang)
        return self._candidate_prompt(cv_text, jd_text, lang)

    def _candidate_prompt(self, cv_text: str, jd_text: str, lang: str) -> str:
        """
        Candidate-facing prompt — coaching tone, full fields for the frontend.
        Includes all fields the candidate UI uses: skills, seniority, red_flags, transferable.
        Excludes recruiter-only: evidence_for_hire, interview_questions, hiring_recommendation.
        """
        return f"""You are an expert Career Coach helping a job seeker understand how well their CV matches a job description. Be constructive, specific, and honest.

OUTPUT LANGUAGE: MUST be {lang}.

JOB DESCRIPTION:
{jd_text}

CANDIDATE CV:
{cv_text[:self.CV_TEXT_LIMIT]}

Analyze the match carefully and return ONLY this JSON — no extra text:
{{
  "match_score": 0.XX,
  "matching_skills": ["Hard or soft skill present in CV that directly matches JD requirement"],
  "missing_skills": ["Important skill required by JD but not found in CV"],
  "transferable_skills": ["Skill from CV that partially covers a JD requirement"],
  "summary": "2-3 sentences addressed to the candidate: explain their key strengths for this role, then the main gaps they should address. Be specific. Do NOT include the numeric score.",
  "recommendation": "shortlist/interview/reject",
  "confidence": "high/medium/low",
  "seniority_alignment": {{
    "cv_level": "Seniority level from CV (e.g. Junior, Mid-Level, Senior, Lead, Principal)",
    "jd_level": "Seniority level required by JD",
    "match": "matched/underqualified/overqualified",
    "explanation": "One sentence explaining the seniority fit or gap."
  }},
  "red_flags": ["Any significant concern in the CV, e.g. unexplained gaps, vague claims, missing credentials"],
  "hiring_urgency": "low/medium/high"
}}

RULES:
- Be honest. Weak matches MUST score below 0.40. Strong matches score above 0.80 only if most requirements are clearly met.
- List ACTUAL skill names (e.g. "Python", "React", "Project Management"), not generic phrases.
- summary must be helpful to the job seeker — explain WHY they match or do not match.
- Only return the JSON object."""

    def _recruiter_prompt(self, cv_text: str, jd_text: str, lang: str) -> str:
        """
        Recruiter-facing prompt — hiring-decision tone, evidence + interview questions.
        Full detail for talent assessment.
        """
        return f"""You are a Senior Technical Recruiter at a Top-Tier Tech Firm (e.g., Google, NVIDIA). Your task is a RIGOROUS semantic match between a CV and a Job Description.

THINK STEP-BY-STEP:
1. DECONSTRUCT the Job Description into Core Competencies, Secondary Tools, and Seniority Expectations.
2. ANALYZE the Candidate CV for explicit evidence, project impact, and technical depth. Do not assume skills not mentioned.
3. CROSS-REFERENCE: Direct matches, semantic overlaps, and strict gaps.
4. CALCULATE: 100% score only if ALL critical requirements are met with proven impact.

OUTPUT LANGUAGE: MUST be {lang}.

JOB DESCRIPTION:
{jd_text}

CANDIDATE CV:
{cv_text[:self.CV_TEXT_LIMIT]}

Return ONLY this JSON:
{{
  "match_score": 0.XX,
  "matching_skills": ["Verified skill from CV"],
  "missing_skills": ["Critical gap"],
  "transferable_skills": ["Related skill that partially helps"],
  "summary": "2-3 sentences: candidate strengths and critical gaps. Do NOT include the numeric score.",
  "recommendation": "shortlist/interview/reject",
  "confidence": "high/medium/low",
  "seniority_alignment": {{
    "cv_level": "Level from CV",
    "jd_level": "Level required",
    "match": "matched/underqualified/overqualified",
    "explanation": "Brief seniority fit explanation."
  }},
  "evidence_for_hire": [
    "Specific CV evidence supporting hire (e.g. 'Led team of 8 at X')",
    "Quantified achievement relevant to the role"
  ],
  "evidence_against_hire": [
    "Specific gap or concern (e.g. 'No Kubernetes despite it being required')",
    "Missing critical qualification"
  ],
  "interview_questions": [
    "Technical question targeting a key gap",
    "Behavioral question based on a red flag",
    "Role-specific scenario question"
  ],
  "hiring_recommendation": "1-2 sentences for the hiring manager: proceed or not, what to probe.",
  "red_flags": ["Gaps or missing mandatory stack"],
  "hiring_urgency": "low/medium/high"
}}

RULES:
- Be CRITICAL. Low-quality matches must score below 0.40.
- evidence_for_hire and evidence_against_hire must reference SPECIFIC content from the CV.
- Only return the JSON object."""
    
    def _parse_matching_response(self, response: str) -> Dict[str, Any]:
        """
        Parse response with strict skill filtering.
        """
        try:
            # Extract JSON using unified parser
            result = json_parser.extract_json_object(response)
            if not result:
                raise ValueError("No valid JSON found in response")
            
            # Helper to extract and filter skills
            def get_clean_skills(key, limit=15):
                raw = result.get(key, [])
                extracted = []
                for s in raw:
                    if isinstance(s, str): extracted.append(s)
                    elif isinstance(s, dict): extracted.append(s.get('skill', s.get('name', str(s))))
                
                # Use centralized stop words filter
                from app.core.constants import SKILL_STOP_WORDS
                
                return [
                    s for s in extracted 
                    if s.lower().strip() not in SKILL_STOP_WORDS and len(s) > 2
                ][:limit]
            
            # Validate and normalize
            return {
                'match_score': float(result.get('match_score', 0.0)),
                'matching_skills': get_clean_skills('matching_skills', self.MAX_MATCHING_SKILLS),
                'missing_skills': get_clean_skills('missing_skills', self.MAX_MISSING_SKILLS),
                'transferable_skills': get_clean_skills('transferable_skills', self.MAX_TRANSFERABLE_SKILLS),
                'summary': result.get('summary', result.get('assessment', '')),
                'recommendation': result.get('recommendation', 'consider'),
                'confidence': result.get('confidence', 'medium'),
                'seniority_alignment': result.get('seniority_alignment', {
                    'cv_level': 'unknown', 'jd_level': 'unknown', 'match': 'unknown', 'explanation': ''
                }),
                'red_flags': result.get('red_flags', [])[:self.MAX_RED_FLAGS],
                'hiring_urgency': result.get('hiring_urgency', 'standard'),
                # New recruiter-specific fields
                'evidence_for_hire':     result.get('evidence_for_hire', [])[:6],
                'evidence_against_hire': result.get('evidence_against_hire', [])[:6],
                'interview_questions':   result.get('interview_questions', [])[:5],
                'hiring_recommendation': result.get('hiring_recommendation', ''),
            }
            
        except Exception as e:
            logger.error(f"Failed to generate/parse matching response: {str(e)}")
            # Return diagnostic result that clearly states the failure
            return {
                'match_score': 0.0,
                'matching_skills': [],
                'missing_skills': [],
                'transferable_skills': [],
                'summary': f"⚠️ AI ANALYSIS FAILED: {str(e)}. This usually happens when the API key is invalid, credits are exhausted, or the model is unavailable. Please check your OpenRouter settings.",
                'recommendation': 'error',
                'confidence': 'low',
                'seniority_alignment': {'cv_level': 'N/A', 'jd_level': 'N/A', 'match': 'error', 'explanation': f'Technical Error: {str(e)}'},
                'red_flags': [f"AI Processing Error: {str(e)}"],
                'hiring_urgency': 'unknown'
            }


# Global matching agent instance
matching_agent = MatchingAgent()
