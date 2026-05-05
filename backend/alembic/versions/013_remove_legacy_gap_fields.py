"""Remove legacy Gap Report fields

Revision ID: 013
Revises: 012
Create Date: 2026-05-02

Description:
    Remove legacy fields from gap_reports table that are no longer used:
    - missing_skills (replaced by critical_gaps, important_gaps, nice_to_have_gaps)
    - skill_gaps (replaced by critical_gaps with detailed analysis)
    - recommendations (replaced by learning_roadmap)
    - priority_skills (replaced by critical_gaps)
    - learning_resources (replaced by learning_roadmap with resources)
    
    These fields were causing confusion with duplicate data.
    The new fields provide better categorization and clarity.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '013'
down_revision = '012'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Remove legacy Gap Report fields.
    
    These fields are no longer used and cause confusion:
    - missing_skills: Replaced by critical_gaps, important_gaps, nice_to_have_gaps
    - skill_gaps: Replaced by critical_gaps with detailed analysis
    - recommendations: Replaced by learning_roadmap
    - priority_skills: Replaced by critical_gaps
    - learning_resources: Replaced by learning_roadmap with resources
    """
    # Remove legacy fields
    op.drop_column('gap_reports', 'missing_skills')
    op.drop_column('gap_reports', 'skill_gaps')
    op.drop_column('gap_reports', 'recommendations')
    op.drop_column('gap_reports', 'priority_skills')
    op.drop_column('gap_reports', 'learning_resources')


def downgrade() -> None:
    """
    Restore legacy Gap Report fields.
    
    Note: Data will be lost if you downgrade after running this migration.
    """
    # Restore legacy fields (empty, data is lost)
    op.add_column('gap_reports', sa.Column('missing_skills', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('gap_reports', sa.Column('skill_gaps', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('gap_reports', sa.Column('recommendations', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('gap_reports', sa.Column('priority_skills', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('gap_reports', sa.Column('learning_resources', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
