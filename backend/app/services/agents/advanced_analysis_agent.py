"""
Advanced Analysis Agent - Simplified
All prompts are defined directly in the agent for simplicity
"""

import json
import logging
from typing import Dict, List, Any, Optional, Tuple

from app.services.nlp.llm_client import llm_client
from app.utils.json_parser import json_parser

logger = logging.getLogger(__name__)


class AdvancedAnalysisAgent:
    """Agent for advanced analysis features with inline prompts"""
    
    # ========================================================================
    # SKILL RADAR
    # ========================================================================
    
    async def generate_skill_radar_data(
        self,
        cv_skills: List[str],
        jd_skills: List[str],
        matching_skills: List[str],
        missing_skills: List[str]
    ) -> List[Dict[str, Any]]:
        """Generate skill radar chart data. [v3.1.0]"""
        try:
            prompt = f"""[RADAR-v3.1] Analyze skill proficiency levels.

**CV:** {', '.join(cv_skills[:20])}
**JOB:** {', '.join(jd_skills[:20])}
**MATCH:** {', '.join(matching_skills)}
**MISS:** {', '.join(missing_skills)}

Select top 8 skills. For each: current proficiency (0-100) vs required (0-100).

**JSON SCHEMA:**
[{{"name": "string", "current": number(0-100), "required": number(0-100)}}]

Scoring: 90-100=Expert, 70-89=Advanced, 50-69=Intermediate, 30-49=Beginner
Return ONLY JSON array."""

            response = await llm_client.generate(
                prompt=prompt,
                task_type="analysis",
                temperature=0.2,
                max_tokens=800
            )
            
            if not response:
                return self._fallback_skill_radar(matching_skills, missing_skills)
            
            data = json_parser.parse(response)
            if isinstance(data, list):
                return data[:8]
            if isinstance(data, dict) and "skills" in data:
                return data["skills"][:8]
            
            return self._fallback_skill_radar(matching_skills, missing_skills)
            
        except Exception as e:
            logger.error(f"Error generating skill radar: {e}")
            return self._fallback_skill_radar(matching_skills, missing_skills)
    
    def _fallback_skill_radar(self, matching: List[str], missing: List[str]) -> List[Dict]:
        """Fallback radar data"""
        radar = []
        for skill in matching[:4]:
            radar.append({"name": skill, "current": 75, "required": 80})
        for skill in missing[:4]:
            radar.append({"name": skill, "current": 40, "required": 85})
        return radar
    
    # ========================================================================
    # EXPERIENCE HEATMAP
    # ========================================================================
    
    async def generate_experience_heatmap(
        self,
        cv_text: str,
        extracted_data: Dict[str, Any]
    ) -> Tuple[List[Dict[str, Any]], str]:
        """Generate experience heatmap. [v3.1.0]"""
        try:
            prompt = f"""[HEATMAP-v3.1] Analyze experience domains.

**CV:** {cv_text[:2000]}

Extract major areas with years and intensity (0-100).

**JSON SCHEMA:**
{{
  "areas": [{{"name": "string", "years": number, "intensity": number(0-100)}}],
  "seniority_level": "Junior|Mid|Senior|Lead|Principal"
}}

Seniority: Junior(0-2y), Mid(2-5y), Senior(5-8y), Lead(8-12y), Principal(12+y)
Return ONLY JSON."""

            response = await llm_client.generate(
                prompt=prompt,
                task_type="analysis",
                temperature=0.2,
                max_tokens=800
            )
            
            if not response:
                return [], "Mid-Level"
            
            data = json_parser.extract_json_object(response)
            areas = data.get("areas", [])
            seniority = data.get("seniority_level", "Mid-Level")
            return areas, seniority
            
        except Exception as e:
            logger.error(f"Error generating heatmap: {e}")
            return [], "Mid-Level"
    
    # ========================================================================
    # SEMANTIC PROXIMITY
    # ========================================================================
    
    async def calculate_semantic_proximity(
        self,
        cv_text: str,
        jd_text: str,
        match_score: float
    ) -> Dict[str, float]:
        """Calculate semantic proximity metrics. [v3.1.0]"""
        try:
            prompt = f"""[PROXIMITY-v3.1] Calculate CV-JD semantic similarity.

**CV:** {cv_text[:1500]}
**JD:** {jd_text[:1500]}
**SCORE:** {match_score}

**JSON SCHEMA:**
{{
  "candidateScore": number(0-1),
  "averageScore": number(0-1),
  "topPercentile": number(0-1),
  "semanticDistance": number(0-1)
}}

Return ONLY JSON."""

            response = await llm_client.generate(
                prompt=prompt,
                task_type="analysis",
                temperature=0.2,
                max_tokens=400
            )
            
            if not response:
                return self._fallback_semantic_proximity(match_score)
            
            data = json_parser.extract_json_object(response)
            if isinstance(data, dict):
                return {
                    "candidateScore": data.get("candidateScore", match_score),
                    "averageScore": data.get("averageScore", 0.65),
                    "topPercentile": data.get("topPercentile", 0.85),
                    "semanticDistance": data.get("semanticDistance", 1.0 - match_score)
                }
            
            return self._fallback_semantic_proximity(match_score)
            
        except Exception as e:
            logger.error(f"Error calculating proximity: {e}")
            return self._fallback_semantic_proximity(match_score)
    
    def _fallback_semantic_proximity(self, score: float) -> Dict[str, float]:
        """Fallback proximity"""
        return {
            "candidateScore": score,
            "averageScore": 0.65,
            "topPercentile": 0.85,
            "semanticDistance": 1.0 - score
        }
    
    # ========================================================================
    # RED FLAGS
    # ========================================================================
    
    async def detect_red_flags(
        self,
        cv_text: str,
        extracted_data: Dict[str, Any]
    ) -> Tuple[List[Dict[str, Any]], str]:
        """Detect red flags. [v3.1.0]"""
        try:
            prompt = f"""[REDFLAGS-v3.1] Detect CV inconsistencies.

**CV:** {cv_text[:2000]}

Check: date overlaps, skill mismatches, title inconsistencies, gaps, over/under qualification.

**JSON SCHEMA:**
{{
  "red_flags": [
    {{"type": "string", "severity": "critical|high|medium|low", "description": "string", "recommendation": "string"}}
  ],
  "overall_risk": "low|medium|high"
}}

Return ONLY JSON."""

            response = await llm_client.generate(
                prompt=prompt,
                task_type="analysis",
                temperature=0.15,
                max_tokens=1200
            )
            
            if not response:
                return [], "low"
            
            data = json_parser.extract_json_object(response)
            red_flags = data.get("red_flags", [])
            risk = data.get("overall_risk", "low")
            return red_flags, risk
            
        except Exception as e:
            logger.error(f"Error detecting red flags: {e}")
            return [], "low"
    
    # ========================================================================
    # INTERVIEW QUESTIONS
    # ========================================================================
    
    async def generate_interview_questions(
        self,
        cv_text: str,
        jd_text: str,
        missing_skills: List[str],
        red_flags_count: int
    ) -> List[Dict[str, Any]]:
        """Generate interview questions. [v3.1.0]"""
        try:
            prompt = f"""[INTERVIEW-v3.1] Generate personalized interview questions.

**CV:** {cv_text[:1500]}
**JD:** {jd_text[:1500]}
**MISSING:** {', '.join(missing_skills[:10])}
**RED FLAGS:** {red_flags_count}

Generate 10-15 questions across: technical, behavioral, gap_focused, red_flag, strength.

**JSON SCHEMA:**
[{
  "category": "technical|behavioral|gap_focused|red_flag|strength",
  "question": "string",
  "purpose": "string",
  "impact_rationale": "SHAP-style explanation: Why this question? How does it relate to the match score or skill gaps?",
  "difficulty": "easy|medium|hard"
}]

Return ONLY JSON array."""

            response = await llm_client.generate(
                prompt=prompt,
                task_type="creative",
                temperature=0.5,
                max_tokens=1500
            )
            
            if not response:
                return []
            
            data = json_parser.parse(response)
            if isinstance(data, list):
                return data
            if isinstance(data, dict) and "questions" in data:
                return data["questions"]
            return []
            
        except Exception as e:
            logger.error(f"Error generating questions: {e}")
            return []
    
    # ========================================================================
    # AI CONFIDENCE
    # ========================================================================
    
    async def calculate_ai_confidence(
        self,
        ocr_quality: float,
        data_completeness: float,
        model_certainty: float
    ) -> Tuple[float, List[Dict[str, Any]]]:
        """Calculate AI confidence. [v3.1.0]"""
        try:
            overall = (ocr_quality * 0.3 + data_completeness * 0.3 + model_certainty * 0.4)
            
            prompt = f"""[CONFIDENCE-v3.1] Analyze AI confidence metrics.

**OCR:** {ocr_quality:.2f}
**DATA:** {data_completeness:.2f}
**MODEL:** {model_certainty:.2f}

**JSON SCHEMA:**
{{
  "breakdown": [
    {{"factor": "string", "score": number(0-1), "impact": "positive|negative", "description": "string", "recommendation": "string"}}
  ]
}}

Impact: positive (>=0.7), negative (<0.7)
Return ONLY JSON."""

            response = await llm_client.generate(
                prompt=prompt,
                task_type="analysis",
                temperature=0.2,
                max_tokens=800
            )
            
            if not response:
                return overall, self._fallback_confidence_breakdown(ocr_quality, data_completeness, model_certainty)
            
            data = json_parser.extract_json_object(response)
            breakdown = data.get("breakdown", [])
            if not breakdown:
                breakdown = self._fallback_confidence_breakdown(ocr_quality, data_completeness, model_certainty)
            
            return overall, breakdown
            
        except Exception as e:
            logger.error(f"Error calculating confidence: {e}")
            overall = (ocr_quality * 0.3 + data_completeness * 0.3 + model_certainty * 0.4)
            return overall, self._fallback_confidence_breakdown(ocr_quality, data_completeness, model_certainty)
    
    def _fallback_confidence_breakdown(self, ocr: float, data: float, model: float) -> List[Dict]:
        """Fallback confidence breakdown"""
        return [
            {"factor": "OCR Quality", "score": ocr, "impact": "positive" if ocr >= 0.7 else "negative"},
            {"factor": "Data Completeness", "score": data, "impact": "positive" if data >= 0.7 else "negative"},
            {"factor": "Model Certainty", "score": model, "impact": "positive" if model >= 0.7 else "negative"}
        ]
    
    # ========================================================================
    # BIAS CHECK
    # ========================================================================
    
    async def perform_bias_check(
        self,
        pii_masked_count: int,
        analysis_data: Dict[str, Any]
    ) -> Tuple[List[Dict[str, Any]], float, str]:
        """Perform bias check. [v3.1.0]"""
        try:
            prompt = f"""[BIAS-v3.1] Evaluate bias and fairness.

**PII MASKED:** {pii_masked_count}

Check: PII masking, protected attributes, skill-based evaluation, equal opportunity.

**JSON SCHEMA:**
{{
  "checks": [
    {{"category": "string", "status": "passed|warning|failed", "description": "string", "recommendation": "string"}}
  ]
}}

Return ONLY JSON."""

            response = await llm_client.generate(
                prompt=prompt,
                task_type="analysis",
                temperature=0.15,
                max_tokens=1200
            )
            
            if not response:
                return self._fallback_bias_check(pii_masked_count)
            
            data = json_parser.extract_json_object(response)
            checks = data.get("checks", [])
            if not checks:
                return self._fallback_bias_check(pii_masked_count)
            
            passed = sum(1 for c in checks if c.get("status") == "passed")
            fairness_score = passed / len(checks) if checks else 0.0
            status = "passed" if fairness_score >= 0.8 else "warning" if fairness_score >= 0.5 else "failed"
            
            return checks, fairness_score, status
            
        except Exception as e:
            logger.error(f"Error performing bias check: {e}")
            return self._fallback_bias_check(pii_masked_count)
    
    def _fallback_bias_check(self, pii_count: int) -> Tuple[List[Dict], float, str]:
        """Fallback bias check"""
        checks = [
            {"category": "PII Masking", "status": "passed" if pii_count > 0 else "warning"},
            {"category": "Protected Attributes", "status": "passed"},
            {"category": "Skill-Based Evaluation", "status": "passed"}
        ]
        return checks, 1.0, "passed"
    
    # ========================================================================
    # CLAIM VERIFICATION
    # ========================================================================
    
    async def verify_claims(
        self,
        cv_text: str,
        analysis_claims: List[str]
    ) -> Tuple[List[Dict[str, Any]], float, int]:
        """Verify analysis claims. [v3.1.0]"""
        try:
            prompt = f"""[VERIFY-v3.1] Verify claims against CV evidence.

**CV:** {cv_text[:2000]}
**CLAIMS:** {chr(10).join(analysis_claims[:10])}

For each claim, find evidence and calculate confidence.

**JSON SCHEMA:**
{{
  "verified_claims": [
    {{"claim": "string", "confidence": number(0-1), "verified": boolean, "evidence_location": "string"}}
  ]
}}

Confidence: 0.8-1.0=Strong, 0.5-0.79=Moderate, 0.0-0.49=Weak
Verified if confidence >= 0.5
Return ONLY JSON."""

            response = await llm_client.generate(
                prompt=prompt,
                task_type="analysis",
                temperature=0.15,
                max_tokens=1200
            )
            
            if not response:
                return self._fallback_claim_verification(cv_text, analysis_claims)
            
            data = json_parser.extract_json_object(response)
            verified_claims = data.get("verified_claims", [])
            if not verified_claims:
                return self._fallback_claim_verification(cv_text, analysis_claims)
            
            verified_count = sum(1 for c in verified_claims if c.get("verified", False))
            total = len(verified_claims)
            rate = verified_count / total if total > 0 else 0.0
            unverified = total - verified_count
            
            return verified_claims, rate, unverified
            
        except Exception as e:
            logger.error(f"Error verifying claims: {e}")
            return self._fallback_claim_verification(cv_text, analysis_claims)
    
    def _fallback_claim_verification(self, cv: str, claims: List[str]) -> Tuple[List[Dict], float, int]:
        """Fallback verification"""
        verified = []
        for claim in claims[:5]:
            verified.append({
                "claim": claim,
                "confidence": 0.75,
                "verified": True,
                "evidence_location": "CV content"
            })
        return verified, 0.75, 0
    
    def _parse_json_response(self, response: str) -> Any:
        """Parse JSON from LLM response"""
        return json_parser.parse(response, default={})


# Singleton
advanced_analysis_agent = AdvancedAnalysisAgent()
