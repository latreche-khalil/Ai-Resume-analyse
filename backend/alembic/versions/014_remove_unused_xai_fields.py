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
    with op.batch_alter_table('xai_reports') as batch_op:
        batch_op.drop_column('skill_depth_analysis')
        batch_op.drop_column('interview_focus_areas')
        batch_op.drop_column('hard_talk_questions')
        batch_op.drop_column('competitive_advantage')


def downgrade() -> None:
    """Restore unused XAI fields."""
    # Restore columns if needed (for rollback)
    with op.batch_alter_table('xai_reports') as batch_op:
        batch_op.add_column(sa.Column('skill_depth_analysis', sa.JSON(), nullable=True, comment='Skill depth vs claims analysis'))
        batch_op.add_column(sa.Column('interview_focus_areas', sa.JSON(), nullable=True, comment='Interview focus areas for recruiter'))
        batch_op.add_column(sa.Column('hard_talk_questions', sa.JSON(), nullable=True, comment='Hard-talk questions to expose weaknesses'))
        batch_op.add_column(sa.Column('competitive_advantage', sa.JSON(), nullable=True, comment='Competitive advantage analysis') )
