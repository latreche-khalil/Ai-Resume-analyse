"""
XAI Agent - Explainability using OpenRouter.

Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9
"""
import json
import time
from typing import Dict, Any, Optional, List
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.nlp.llm_client import llm_client
from app.utils.json_parser import json_parser
from app.models.xai_report import XAIReport
from app.services.privacy.privacy_gateway import require_masked_text
from app.utils.logger import logger


class XAIAgent:
    """
    XAI Agent for generating SHAP-like explanations using OpenRouter.
    - LLM-based feature importance analysis using OpenRouter
    - SHAP-style explanations with feature attribution
    - RAG-based evidence extraction
    - Multilingual explanations (ar/en/fr)
    - 3 detail levels (basic/detailed/advanced)
    - Graceful degradation
    
    Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
    """
    
    # Performance targets
    PERFORMANCE_TARGET_SECONDS = 8.0
    
    # Token limits
    TOKENS_DETAILED = 2000  # Reduced for faster generation
    
    # RAG configuration
    RAG_TOP_K = 8
    RAG_EVIDENCE_MAX_LENGTH = 1500
    
    # Prompt limits
    JD_TEXT_LIMIT = 4000
    CV_TEXT_LIMIT = 8000  # Increased for full context
    
    # Result limits
    MAX_FEATURE_CONTRIBUTIONS = 10
    MAX_WHAT_IF_SCENARIOS = 7
    MAX_CV_HIGHLIGHTS = 5
    MAX_JD_REQUIREMENTS = 5
    MAX_EVIDENCE_FOR = 7
    MAX_EVIDENCE_AGAINST = 7
    MAX_ACHIEVEMENTS = 5
    
    async def explain(
        self,
        match_result: Dict[str, Any],
        cv_text: str,
        jd_text: str,
        analysis_record_id: UUID,
        language: str,
        db: AsyncSession,
        cv_document_id: Optional[UUID] = None  # for RAG
    ) -> Optional[Dict[str, Any]]:
        """
        Generate SHAP-style explanations for match result with RAG-based evidence.
        
        Args:
            match_result: Matching agent result
            cv_text: CV text (masked)
            jd_text: Job description text
            analysis_record_id: Analysis record ID
            language: Explanation language (ar/en/fr)
            db: Database session
            cv_document_id: CV document ID for RAG retrieval
            
        Returns:
            XAI explanation or None if failed
            
        Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
        """
        start_time = time.time()
        
        try:
            # RAG: Retrieve relevant CV chunks for evidence
            rag_evidence = ""
            if cv_document_id:
                try:
                    from app.services.nlp.rag_pipeline import rag_pipeline
                    # Query for both matching and missing skills
                    all_skills = match_result.get('matching_skills', [])[:5] + match_result.get('missing_skills', [])[:5]
                    query = "experience achievements skills " + " ".join(all_skills)
                    chunks = await rag_pipeline.semantic_search(
                        query=query,
                        document_ids=[cv_document_id],
                        top_k=self.RAG_TOP_K
                    )
                    if chunks:
                        rag_evidence = "\n\n".join(c["text"] for c in chunks)
                        logger.info(f"XAI Agent RAG: {len(chunks)} chunks retrieved for evidence")
                except Exception as rag_err:
                    logger.warning(f"XAI Agent RAG failed ({rag_err}), continuing without it")
            
            # Create SHAP XAI prompt
            prompt = self._create_shap_xai_prompt(
                match_score=match_result['match_score'],
                matching_skills=match_result['matching_skills'],
                missing_skills=match_result['missing_skills'],
                cv_text=cv_text,
                jd_text=jd_text,
                rag_evidence=rag_evidence,
                language=language
            )
            max_tokens = self.TOKENS_DETAILED
            
            # Call Unified LLM Client
            response = await llm_client.generate(
                prompt=prompt,
                task_type="analysis",
                temperature=0.3,
                max_tokens=max_tokens
            )
            
            if not response:
                logger.warning("Failed to get XAI response from LLM, graceful degradation")
                return None
            
            # Parse response
            xai_explanation = self._parse_xai_response(response, language, match_score=match_result['match_score'])
            
            # Store in database
            await self._store_xai_report(
                analysis_record_id=analysis_record_id,
                xai_explanation=xai_explanation,
                language=language,
                db=db
            )
            
            elapsed_time = time.time() - start_time
            
            if elapsed_time > self.PERFORMANCE_TARGET_SECONDS:
                logger.warning(
                    f"XAI generation exceeded target: {elapsed_time:.2f}s > "
                    f"{self.PERFORMANCE_TARGET_SECONDS}s"
                )
            else:
                logger.info(f"XAI generation completed in {elapsed_time:.2f}s")
            
            return xai_explanation
            
        except Exception as e:
            logger.error(f"XAI generation error: {str(e)}")
            # Graceful degradation - return None instead of failing
            return None
    
    def _create_shap_xai_prompt(
        self,
        match_score: float,
        matching_skills: List[str],
        missing_skills: List[str],
        cv_text: str,
        jd_text: str,
        rag_evidence: str,
        language: str
    ) -> str:
        """Create XAI prompt via OpenRouter."""
        lang_map = {'ar': 'Arabic', 'en': 'English', 'fr': 'French'}
        lang = lang_map.get(language, 'English')
        
        rag_section = f"\n\nEVIDENCE FROM CV:\n{rag_evidence[:self.RAG_EVIDENCE_MAX_LENGTH]}\n" if rag_evidence else ""
        
        return f"""You are a Lead Executive Recruiter and XAI Architect at a top-tier global consultancy (e.g., McKinsey or Google). 
Your objective is to provide an "Executive Talent Decomposition" for a candidate who received a match score of {match_score:.0%}.

STRUCTURE YOUR RESPONSE INTO THESE PROFESSIONAL SECTIONS:

### 1. EXECUTIVE SUMMARY
A high-level overview of the candidate's strategic fit. Use high-density, professional language.

### 2. TECHNICAL PROFICIENCY DEEP-DIVE
Analyze the evidence for core technical requirements. Mention specific tools, methodologies, and years of impact found in the CV.

### 3. STRATEGIC ALIGNMENT & GAPS
Identify the "Why" behind the score delta. Explain exactly what is missing or what exceeds expectations.

### 4. GROWTH POTENTIAL & RECOMMENDATION
Based on current data, what is the candidate's trajectory?

### 5. COMPETITIVE ADVANTAGE (The "X-Factor")
What makes this candidate stand out from the typical talent pool? Highlight unique project combinations or specific tech stack depth.

THINK STEP-BY-STEP:
1. EVIDENCE RULES:
1. RECONCILIATION: The sum of all contributions (positive and negative) added to the base_score MUST EQUAL the provided match_score of {match_score:.0%}. Adjust the 'contribution' values in 'feature_contributions' to ensure this mathematical harmony.
2. EVIDENCE: Every claim must include a "DIRECT QUOTE" from the CV.
3. LOGIC: If a skill is missing but the score is high, explain why the existing skills compensate for the gap.
4. NO TRUNCATION: Keep explanations dense but complete.

OUTPUT FORMAT (Strict JSON): Look for achievements, not just keywords.

OUTPUT LANGUAGE: MUST be {lang}. (Keys must be English).

JOB ARCHITECTURE:
{jd_text[:self.JD_TEXT_LIMIT]}

CANDIDATE DNA (CV):
{cv_text[:self.CV_TEXT_LIMIT]}
{rag_section}

MATCHING DATA:
Score: {match_score:.0%}
Matching Skills: {', '.join(matching_skills[:12])}
Missing Skills: {', '.join(missing_skills[:12])}

OUTPUT FORMAT (Strict JSON):
{{
  "overall_explanation": "Full structured report. You MUST quote specific projects and roles from the candidate DNA.",
  "evidence_for_match": [
    {{ 
      "claim": "Specific Skill/Achievement", 
      "evidence": "DIRECT QUOTE from the CV text (e.g., 'Led a team of 5 to develop...')", 
      "credibility": "high", 
      "weight": 0.1-1.0 
    }}
  ],
  "evidence_against_match": [
    {{ 
      "gap": "Missing requirement", 
      "required": "JD requirement text", 
      "current": "What is actually found in CV regarding this", 
      "impact": "Strategic impact", 
      "weight": 0.1-1.0 
    }}
  ],
  "shap_analysis": {{
    "base_score": 0.5,
    "feature_contributions": [
      {{ "feature": "Domain Name", "contribution": 0.XX, "reason": "Justification based on CV evidence" }}
    ]
  }},
  "what_if_scenarios": [
    {{ 
      "change": "Target certification or project", 
      "expected_score": 0.XX, 
      "explanation": "Why this specific move raises your score", 
      "feasibility": "easy/medium/hard" 
    }}
  ],
  "key_achievements": ["Direct evidence of high-impact performance directly extracted from CV projects with metrics"],
  "competitive_advantage": "Specific technical edge identified during neural analysis.",
  "credibility_analysis": "Executive assessment of CV validity."
}}

RULES:
- NO GENERIC TEXT. Use specific details from the texts provided.
- Be RIGOROUS. High scores must be EARNED by evidence.
- Return ONLY the JSON object."""

    
    def _parse_xai_response(self, response: str, language: str, match_score: float = 0.5) -> Dict[str, Any]:
        """
        Parse XAI response.
        
        Requirements: 10.3, 10.4, 10.5, 10.6
        """
        detail_level = "advanced"  # SHAP Mode default
        try:
            # Extract JSON using unified parser
            result = json_parser.extract_json_object(response)
            if not result:
                logger.error(f"XAI Agent: No valid JSON found in response. Raw start: {response[:100]}...")
                raise ValueError("No valid JSON found in response")
            
            # SHAP analysis fields (v3.3.0)
            shap_analysis = result.get('shap_analysis', {})
            if not shap_analysis and 'feature_contributions' in result:
                # Fallback: model might have put feature_contributions at top level
                shap_analysis = {'feature_contributions': result.get('feature_contributions'), 'base_score': result.get('base_score', 0.5)}
            
            # Normalize and reconcile SHAP contributions to sum to match_score
            base_score = float(shap_analysis.get('base_score', 0.5))
            target_delta = match_score - base_score
            
            feature_contribs = shap_analysis.get('feature_contributions', [])
            if not feature_contribs:
                # If LLM didn't return any contributions, synthesize some from evidence
                feature_contribs = []
                evidence_for = result.get('evidence_for_match', [])
                evidence_against = result.get('evidence_against_match', [])
                for idx, ev in enumerate(evidence_for[:5]):
                    feature_contribs.append({
                        "feature": ev.get("claim", f"Matching Skill {idx+1}"),
                        "contribution": float(ev.get("weight", 0.5)) * 0.1,
                        "reason": ev.get("evidence", "")
                    })
                for idx, ev in enumerate(evidence_against[:5]):
                    feature_contribs.append({
                        "feature": ev.get("gap", f"Missing Skill {idx+1}"),
                        "contribution": -float(ev.get("weight", 0.5)) * 0.1,
                        "reason": f"Required: {ev.get('required', '')}. Current: {ev.get('current', '')}"
                    })
            
            cleaned_contribs = []
            contrib_sum = 0.0
            for c in feature_contribs:
                if isinstance(c, dict) and 'feature' in c:
                    val = float(c.get('contribution', 0.0))
                    cleaned_contribs.append({
                        'feature': str(c.get('feature')),
                        'contribution': val,
                        'reason': str(c.get('reason', ''))
                    })
                    contrib_sum += val
            
            if cleaned_contribs:
                # Separate into positive and negative contributions to preserve signs
                positives = [c for c in cleaned_contribs if c['contribution'] >= 0]
                negatives = [c for c in cleaned_contribs if c['contribution'] < 0]
                
                sum_pos = sum(c['contribution'] for c in positives)
                sum_neg = sum(c['contribution'] for c in negatives)
                
                # We want: sum_pos_scaled + sum_neg_scaled = target_delta
                if target_delta >= 0:
                    # Positive delta (good match): scale positive contributions, keep negatives unchanged
                    sum_pos_target = target_delta - sum_neg
                    if sum_pos > 0.01:
                        scale_pos = sum_pos_target / sum_pos
                        scale_pos = max(0.0, min(100.0, scale_pos)) # guardrail
                        for c in positives:
                            c['contribution'] = c['contribution'] * scale_pos
                    else:
                        # Fallback if there are no positives but target is positive
                        boost = target_delta / len(cleaned_contribs)
                        for c in cleaned_contribs:
                            c['contribution'] = boost
                else:
                    # Negative delta (poor match): scale negative contributions, keep positives unchanged
                    sum_neg_target = target_delta - sum_pos
                    if abs(sum_neg) > 0.01:
                        scale_neg = sum_neg_target / sum_neg
                        scale_neg = max(0.0, min(100.0, scale_neg)) # guardrail
                        for c in negatives:
                            c['contribution'] = c['contribution'] * scale_neg
                    else:
                        # Fallback if there are no negatives but target is negative
                        boost = target_delta / len(cleaned_contribs)
                        for c in cleaned_contribs:
                            c['contribution'] = boost
                
                actual_sum = sum(c['contribution'] for c in cleaned_contribs)
                shap_analysis['feature_contributions'] = cleaned_contribs
                shap_analysis['base_score'] = base_score
                shap_analysis['final_score'] = base_score + actual_sum
            else:
                shap_analysis['feature_contributions'] = []
                shap_analysis['base_score'] = base_score
                shap_analysis['final_score'] = match_score

            # Programmatically construct waterfall_explanation
            waterfall_steps = []
            waterfall_steps.append({
                'step': 'Base Score',
                'delta': 0.0,
                'score_after': base_score,
                'reason': 'Baseline match probability'
            })
            
            cumulative = base_score
            for c in shap_analysis['feature_contributions']:
                cumulative += c['contribution']
                waterfall_steps.append({
                    'step': c['feature'],
                    'delta': c['contribution'],
                    'score_after': min(1.0, max(0.0, cumulative)),
                    'reason': c['reason']
                })
            
            waterfall_explanation = {'steps': waterfall_steps}
            
            raw_what_if = result.get('what_if_scenarios', result.get('scenarios', []))[:self.MAX_WHAT_IF_SCENARIOS]
            
            # Map predicted_score to expected_score for frontend compatibility
            what_if_scenarios = []
            for item in raw_what_if:
                if 'predicted_score' in item and 'expected_score' not in item:
                    item['expected_score'] = item['predicted_score']
                what_if_scenarios.append(item)
            
            score_breakdown = result.get('score_breakdown', {})
            attention_analysis = result.get('attention_analysis', {})
            
            # Evidence-based fields (from SHAP prompt)
            evidence_for = result.get('evidence_for_match', [])[:self.MAX_EVIDENCE_FOR]
            evidence_against = result.get('evidence_against_match', [])[:self.MAX_EVIDENCE_AGAINST]
            achievements = result.get('key_achievements', [])[:self.MAX_ACHIEVEMENTS]
            credibility = result.get('credibility_analysis', {})
            
            return {
                # Core explanation
                'overall_explanation': result.get('overall_explanation', ''),
                'summary': result.get('summary', result.get('overall_explanation', '')),
                
                # SHAP-style analysis (v3.3.0) - NEW FIELDS
                'shap_analysis': shap_analysis,
                'what_if_scenarios': what_if_scenarios,
                'score_breakdown': score_breakdown,
                'attention_analysis': attention_analysis,
                'waterfall_explanation': waterfall_explanation,
                
                # Evidence-based analysis (from SHAP prompt)
                'evidence_for_match': evidence_for,
                'evidence_against_match': evidence_against,
                'key_achievements': achievements,
                'credibility_analysis': credibility,
                'counterfactuals': what_if_scenarios,  # Alias for backward compatibility
                
                # Visualizations (kept for advanced users only)
                'visual_data': self._prepare_visual_data(evidence_for) if detail_level == "advanced" else None,
                'force_plot_data': self._prepare_visualization_data(
                    'force_plot', shap_analysis, evidence_for, evidence_against, detail_level
                ),
                'waterfall_data': self._prepare_visualization_data(
                    'waterfall', waterfall_explanation, evidence_for, evidence_against, detail_level
                ),
                'summary_plot_data': self._prepare_summary_plot_data(
                    evidence_for, evidence_against
                ) if detail_level == "advanced" else None
            }
            
        except Exception as e:
            logger.error(f"Failed to parse XAI response: {str(e)}")
            return {
                'overall_explanation': 'Could not generate explanation due to an error.',
                'summary': 'Explanation unavailable.',
                'shap_analysis': {},
                'what_if_scenarios': [],
                'score_breakdown': {},
                'attention_analysis': {},
                'waterfall_explanation': {},
                'evidence_for_match': [],
                'evidence_against_match': [],
                'key_achievements': [],
                'credibility_analysis': {},
                'counterfactuals': []
            }
    
    def _prepare_visualization_data(
        self,
        viz_type: str,
        primary_data: Any,
        evidence_for: List[Dict],
        evidence_against: List[Dict],
        detail_level: str
    ) -> Optional[Dict[str, Any]]:
        """
        Prepare visualization data based on type.
        
        Args:
            viz_type: Type of visualization ('force_plot' or 'waterfall')
            primary_data: Primary data (shap_analysis or waterfall_explanation)
            evidence_for: Positive evidence (fallback)
            evidence_against: Negative evidence (fallback)
            detail_level: Detail level
            
        Returns:
            Visualization data or None
        """
        if detail_level != "advanced":
            return None
        
        if viz_type == 'force_plot':
            if primary_data and isinstance(primary_data, dict):
                return self._prepare_shap_force_plot(primary_data)
            return self._prepare_force_plot_data(evidence_for, evidence_against, base_score=0.5)
        
        elif viz_type == 'waterfall':
            if primary_data and isinstance(primary_data, dict):
                return self._prepare_shap_waterfall(primary_data)
            return self._prepare_waterfall_data(evidence_for, evidence_against, base_score=0.5)
        
        return None
    
    def _prepare_shap_force_plot(self, shap_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Prepare SHAP force plot from shap_analysis data. [v3.3.0]
        
        Args:
            shap_analysis: SHAP analysis with feature contributions
            
        Returns:
            Force plot data structure
        """
        if not shap_analysis or 'feature_contributions' not in shap_analysis:
            return None
        
        features = []
        values = []
        colors = []
        
        for contrib in shap_analysis['feature_contributions'][:10]:
            features.append(contrib.get('feature', 'Unknown')[:30])
            contribution = contrib.get('contribution', 0)
            values.append(contribution)
            colors.append('#4CAF50' if contribution > 0 else '#F44336')
        
        return {
            'type': 'shap_force_plot',
            'base_value': shap_analysis.get('base_score', 0.5),
            'features': features,
            'values': values,
            'colors': colors,
            'final_score': shap_analysis.get('final_score', 0.5),
            'attention_weights': [c.get('attention_weight', 0.5) for c in shap_analysis['feature_contributions'][:10]]
        }
    
    def _prepare_shap_waterfall(self, waterfall_explanation: Dict[str, Any]) -> Dict[str, Any]:
        """
        Prepare SHAP waterfall chart from waterfall_explanation data. [v3.3.0]
        
        Args:
            waterfall_explanation: Waterfall explanation with steps
            
        Returns:
            Waterfall chart data
        """
        if not waterfall_explanation or 'steps' not in waterfall_explanation:
            return None
        
        steps = []
        for step in waterfall_explanation['steps']:
            steps.append({
                'name': step.get('step', 'Unknown'),
                'value': step.get('delta', 0),
                'cumulative': step.get('score_after', 0),
                'type': 'positive' if step.get('delta', 0) > 0 else 'negative',
                'reason': step.get('reason', '')
            })
        
        return {
            'type': 'shap_waterfall',
            'steps': steps,
            'base_score': steps[0].get('cumulative', 0.5) if steps else 0.5,
            'final_score': steps[-1].get('cumulative', 0.5) if steps else 0.5
        }
    
    def _prepare_visual_data(self, evidence_for: List[Dict]) -> Dict[str, Any]:
        """
        Prepare data for visualization from evidence.
        
        Requirements: 10.8
        """
        if not evidence_for:
            return None
        
        return {
            'chart_type': 'bar',
            'labels': [item.get('claim', 'Unknown')[:30] for item in evidence_for[:10]],
            'values': [item.get('weight', 0.5) for item in evidence_for[:10]],
            'colors': ['#4CAF50' if item.get('weight', 0) > 0.7 else '#FFC107' for item in evidence_for[:10]]
        }
    
    def _prepare_force_plot_data(
        self,
        evidence_for: List[Dict],
        evidence_against: List[Dict],
        base_score: float = 0.5
    ) -> Dict[str, Any]:
        """
        Prepare data for SHAP-style force plot from evidence.
        
        Shows how each feature pushes the prediction from base value.
        
        Args:
            evidence_for: Positive evidence
            evidence_against: Negative evidence
            base_score: Baseline score (default 0.5)
            
        Returns:
            Force plot data structure
        """
        if not evidence_for and not evidence_against:
            return None
        
        features = []
        values = []
        colors = []
        
        # Add positive evidence
        for item in evidence_for[:5]:
            features.append(item.get('claim', 'Unknown')[:30])
            values.append(item.get('weight', 0))
            colors.append('#4CAF50')  # Green for positive
        
        # Add negative evidence
        for item in evidence_against[:5]:
            features.append(item.get('gap', 'Unknown')[:30])
            values.append(-item.get('weight', 0))  # Negative impact
            colors.append('#F44336')  # Red for negative
        
        return {
            'type': 'force_plot',
            'base_value': base_score,
            'features': features,
            'values': values,
            'colors': colors,
            'final_score': base_score + sum(values)
        }
    
    def _prepare_waterfall_data(
        self,
        evidence_for: List[Dict],
        evidence_against: List[Dict],
        base_score: float = 0.5
    ) -> Dict[str, Any]:
        """
        Prepare data for SHAP-style waterfall chart from evidence.
        
        Shows cumulative effect of features on final score.
        
        Args:
            evidence_for: Positive evidence
            evidence_against: Negative evidence
            base_score: Baseline score
            
        Returns:
            Waterfall chart data
        """
        if not evidence_for and not evidence_against:
            return None
        
        steps = [{'name': 'Base Score', 'value': base_score, 'cumulative': base_score}]
        cumulative = base_score
        
        # Add positive evidence
        for item in evidence_for[:5]:
            impact = item.get('weight', 0) * 0.1  # Scale for visualization
            cumulative += impact
            steps.append({
                'name': item.get('claim', 'Unknown')[:30],
                'value': impact,
                'cumulative': cumulative,
                'type': 'positive'
            })
        
        # Add negative evidence
        for item in evidence_against[:5]:
            impact = -item.get('weight', 0) * 0.1  # Negative impact, scaled
            cumulative += impact
            steps.append({
                'name': item.get('gap', 'Unknown')[:30],
                'value': impact,
                'cumulative': cumulative,
                'type': 'negative'
            })
        
        steps.append({'name': 'Final Score', 'value': 0, 'cumulative': cumulative})
        
        return {
            'type': 'waterfall',
            'steps': steps,
            'base_score': base_score,
            'final_score': cumulative
        }
    
    def _prepare_summary_plot_data(
        self,
        evidence_for: List[Dict],
        evidence_against: List[Dict]
    ) -> Dict[str, Any]:
        """
        Prepare data for SHAP-style summary plot from evidence.
        
        Shows feature importance with impact direction.
        
        Args:
            evidence_for: Positive evidence
            evidence_against: Negative evidence
            
        Returns:
            Summary plot data
        """
        if not evidence_for and not evidence_against:
            return None
        
        features = []
        importance_values = []
        impact_directions = []
        
        # Add positive evidence
        for item in evidence_for[:5]:
            features.append(item.get('claim', 'Unknown')[:30])
            importance_values.append(item.get('weight', 0))
            impact_directions.append('positive')
        
        # Add negative evidence
        for item in evidence_against[:5]:
            features.append(item.get('gap', 'Unknown')[:30])
            importance_values.append(item.get('weight', 0))
            impact_directions.append('negative')
        
        return {
            'type': 'summary',
            'features': features,
            'importance': importance_values,
            'impact_direction': impact_directions,
            'colors': [
                '#4CAF50' if d == 'positive' else '#F44336'
                for d in impact_directions
            ]
        }
    
    async def _store_xai_report(
        self,
        analysis_record_id: UUID,
        xai_explanation: Dict[str, Any],
        language: str,
        db: AsyncSession
    ) -> XAIReport:
        """
        Store XAI report in database.
        Uses a fresh session to avoid greenlet/transaction conflicts.
        """
        from app.core.database import AsyncSessionLocal

        try:
            async with AsyncSessionLocal() as fresh_db:
                xai_report = XAIReport(
                    analysis_record_id=analysis_record_id,
                    overall_explanation=xai_explanation.get('summary', xai_explanation.get('overall_explanation', '')),
                    # Core SHAP v3.3.0 fields
                    evidence_for_match=xai_explanation.get('evidence_for_match', []),
                    evidence_against_match=xai_explanation.get('evidence_against_match', []),
                    key_achievements=xai_explanation.get('key_achievements', []),
                    counterfactuals=xai_explanation.get('counterfactuals', []),
                    credibility_analysis=xai_explanation.get('credibility_analysis'),
                    # Visualizations (advanced mode only)
                    visual_data=xai_explanation.get('visual_data'),
                    force_plot_data=xai_explanation.get('force_plot_data'),
                    waterfall_data=xai_explanation.get('waterfall_data'),
                    summary_plot_data=xai_explanation.get('summary_plot_data'),
                )
                fresh_db.add(xai_report)
                await fresh_db.commit()
                await fresh_db.refresh(xai_report)
                logger.info(f"XAI report stored for analysis: {analysis_record_id}")
                return xai_report

        except Exception as e:
            logger.error(f"Failed to store XAI report: {str(e)}")
            raise


# Global XAI agent instance
xai_agent = XAIAgent()
