"""Remove unused XAI fields from SHAP v3.3.0

Revision ID: 014
Revises: 013
Create Date: 2026-05-02

Description:
    Remove legacy fields from xai_reports table that are no longer used in SHAP v3.3.0 prompt:
    - skill_depth_analysis (not in SHAP prompt)
    - interview_focus_areas (not in SHAP prompt)
    - hard_talk_questions (not in SHAP prompt)
    - competitive_advantage (not in SHAP prompt)
    
    These fields were from the old v3.1.0 prompt and are not requested by the new SHAP-focused prompt.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '014'
down_revision = '013'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Remove unused XAI fields."""
    # Drop columns that are no longer used in SHAP v3.3.0
    op.drop_column('xai_reports', 'skill_depth_analysis')
    op.drop_column('xai_reports', 'interview_focus_areas')
    op.drop_column('xai_reports', 'hard_talk_questions')
    op.drop_column('xai_reports', 'competitive_advantage')


def downgrade() -> None:
    """Restore unused XAI fields."""
    # Restore columns if needed (for rollback)
    op.add_column('xai_reports', sa.Column('skill_depth_analysis', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Skill depth vs claims analysis'))
    op.add_column('xai_reports', sa.Column('interview_focus_areas', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Interview focus areas for recruiter'))
    op.add_column('xai_reports', sa.Column('hard_talk_questions', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Hard-talk questions to expose weaknesses'))
    op.add_column('xai_reports', sa.Column('competitive_advantage', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Competitive advantage analysis'))
