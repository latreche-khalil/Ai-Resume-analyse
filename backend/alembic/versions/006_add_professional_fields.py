"""Add professional enhancement fields to analysis records

Revision ID: 006_add_professional_fields
Revises: 005_add_talent_pool_tables
Create Date: 2025-01-02 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '006_add_professional_fields'
down_revision: Union[str, None] = '005_add_talent_pool_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add professional enhancement fields."""
    
    # Add professional fields to analysis_records
    op.add_column('analysis_records', 
        sa.Column('seniority_alignment', sa.JSON, nullable=True, 
                  comment='Seniority level alignment analysis'))
    
    op.add_column('analysis_records', 
        sa.Column('cultural_fit_indicators', sa.JSON, nullable=True,
                  comment='Cultural fit indicators'))
    
    op.add_column('analysis_records', 
        sa.Column('competitive_advantage', sa.JSON, nullable=True,
                  comment='Competitive advantage analysis'))
    
    op.add_column('analysis_records', 
        sa.Column('red_flags', sa.JSON, nullable=True,
                  comment='Red flags detected'))
    
    op.add_column('analysis_records', 
        sa.Column('hiring_urgency', sa.String(20), nullable=True,
                  comment='Hiring urgency: move-fast, standard, take-time'))
    
    # Add professional fields to gap_reports
    op.add_column('gap_reports', 
        sa.Column('quick_wins', sa.JSON, nullable=True,
                  comment='Quick wins for immediate improvement'))
    
    op.add_column('gap_reports', 
        sa.Column('competitive_differentiator', sa.JSON, nullable=True,
                  comment='Competitive differentiator analysis'))
    
    op.add_column('gap_reports', 
        sa.Column('total_potential_improvement', sa.Float, nullable=True,
                  comment='Total potential score improvement'))
    
    # Add professional fields to xai_reports
    op.add_column('xai_reports', 
        sa.Column('credibility_analysis', sa.JSON, nullable=True,
                  comment='Credibility and buzzword analysis'))
    
    op.add_column('xai_reports', 
        sa.Column('skill_depth_analysis', sa.JSON, nullable=True,
                  comment='Skill depth vs claims analysis'))
    
    op.add_column('xai_reports', 
        sa.Column('interview_focus_areas', sa.JSON, nullable=True,
                  comment='Interview focus areas'))
    
    op.add_column('xai_reports', 
        sa.Column('hard_talk_questions', sa.JSON, nullable=True,
                  comment='Hard-talk questions for recruiter'))
    
    op.add_column('xai_reports', 
        sa.Column('counterfactuals', sa.JSON, nullable=True,
                  comment='Counterfactual scenarios'))
    
    op.add_column('xai_reports', 
        sa.Column('visual_data', sa.JSON, nullable=True,
                  comment='Data for visualization'))


def downgrade() -> None:
    """Remove professional enhancement fields."""
    
    # Remove from xai_reports
    op.drop_column('xai_reports', 'visual_data')
    op.drop_column('xai_reports', 'counterfactuals')
    op.drop_column('xai_reports', 'hard_talk_questions')
    op.drop_column('xai_reports', 'interview_focus_areas')
    op.drop_column('xai_reports', 'skill_depth_analysis')
    op.drop_column('xai_reports', 'credibility_analysis')
    
    # Remove from gap_reports
    op.drop_column('gap_reports', 'total_potential_improvement')
    op.drop_column('gap_reports', 'competitive_differentiator')
    op.drop_column('gap_reports', 'quick_wins')
    
    # Remove from analysis_records
    op.drop_column('analysis_records', 'hiring_urgency')
    op.drop_column('analysis_records', 'red_flags')
    op.drop_column('analysis_records', 'competitive_advantage')
    op.drop_column('analysis_records', 'cultural_fit_indicators')
    op.drop_column('analysis_records', 'seniority_alignment')
