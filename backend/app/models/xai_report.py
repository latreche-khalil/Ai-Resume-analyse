"""
XAI Report model for explainability analysis.

This module defines the XAIReport model with LLM-generated explanations.
"""
from sqlalchemy import Column, ForeignKey, UniqueConstraint, Index, JSON
from app.models.base import UUIDType
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin, TimestampMixin


class XAIReport(Base, UUIDMixin, TimestampMixin):
    """
    XAI Report model containing SHAP-style explainability analysis.
    
    Generated using Puter AI LLM (Llama 3.1 405B) with SHAP v3.3.0 prompt.
    
    Attributes:
        analysis_record_id: Foreign key to AnalysisRecord (unique)
        evidence_for_match: Evidence supporting the match (with CV quotes)
        evidence_against_match: Evidence against the match (gaps and weaknesses)
        key_achievements: Key achievements extracted from CV
        counterfactuals: "What-if" scenarios for score improvement
        credibility_analysis: Credibility and buzzword analysis
        visual_data: Data for visualization (charts, graphs)
        force_plot_data: SHAP-style force plot data
        waterfall_data: SHAP-style waterfall chart data
        summary_plot_data: SHAP-style summary plot data
        overall_explanation: High-level text summary of the analysis
    """
    
    __tablename__ = "xai_reports"
    
    # Foreign key
    analysis_record_id = Column(
        UUIDType(),
        ForeignKey("analysis_records.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
        comment="Analysis record this XAI report belongs to"
    )
    
    # Overall summary (The "Explanation" part from diagram)
    overall_explanation = Column(
        JSON,  # Using JSON to support multilingual summaries if needed, or Text
        nullable=True,
        comment="High-level text summary of the AI matching logic"
    )
    
    # Evidence-based explainability (no more legacy fields)
    evidence_for_match = Column(
        JSON,
        nullable=False,
        default=list,
        comment="Evidence supporting the match (with CV quotes)"
    )
    
    evidence_against_match = Column(
        JSON,
        nullable=False,
        default=list,
        comment="Evidence against the match (gaps and weaknesses)"
    )
    
    key_achievements = Column(
        JSON,
        nullable=False,
        default=list,
        comment="Key achievements extracted from CV"
    )
    
    counterfactuals = Column(
        JSON,
        nullable=False,
        default=list,
        comment="What-if scenarios: 'If you had X skill, score would be Y'"
    )
    
    visual_data = Column(
        JSON,
        nullable=True,
        comment="Data for visualization (charts, graphs, attention weights)"
    )
    
    # Enhanced SHAP-style visualizations
    force_plot_data = Column(
        JSON,
        nullable=True,
        comment="SHAP-style force plot data showing feature contributions"
    )
    
    waterfall_data = Column(
        JSON,
        nullable=True,
        comment="SHAP-style waterfall chart showing cumulative effects"
    )
    
    summary_plot_data = Column(
        JSON,
        nullable=True,
        comment="SHAP-style summary plot with feature importance and direction"
    )
    
    # Professional enhancement fields (from SHAP v3.3.0)
    credibility_analysis = Column(
        JSON,
        nullable=True,
        comment="Credibility and buzzword analysis"
    )
    
    # Relationships
    analysis_record = relationship(
        "AnalysisRecord",
        back_populates="xai_report"
    )
    
    # Constraints
    __table_args__ = (
        UniqueConstraint("analysis_record_id", name="unique_xai_report_per_analysis"),
        Index("idx_xai_reports_analysis_id", "analysis_record_id"),
    )
    
    def __repr__(self) -> str:
        return f"<XAIReport(id={self.id}, analysis_id={self.analysis_record_id})>"
    
    @property
    def top_positive_evidence(self) -> dict:
        """Get the top positive evidence."""
        if self.evidence_for_match:
            return max(
                self.evidence_for_match,
                key=lambda x: x.get('weight', 0)
            )
        return {}
    
    @property
    def top_negative_evidence(self) -> dict:
        """Get the top negative evidence."""
        if self.evidence_against_match:
            return max(
                self.evidence_against_match,
                key=lambda x: x.get('weight', 0)
            )
        return {}
