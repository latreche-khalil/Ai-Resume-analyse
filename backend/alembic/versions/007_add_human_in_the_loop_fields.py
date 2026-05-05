"""Add Human-in-the-Loop fields to analysis_records

Revision ID: 007
Revises: 006
Create Date: 2026-04-28

Adds:
- is_binding (always False — AI is advisory only)
- confidence_score
- requires_human_review
- human_review_status
- reviewed_by
- reviewed_at
- reviewer_notes
"""
from alembic import op
import sqlalchemy as sa


revision = '007'
down_revision = '006_add_professional_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('analysis_records',
        sa.Column('is_binding', sa.Boolean(), nullable=False, server_default='false',
                  comment='AI decision is never binding'))
    op.add_column('analysis_records',
        sa.Column('confidence_score', sa.Numeric(3, 2), nullable=True,
                  comment='AI confidence score 0.00-1.00'))
    op.add_column('analysis_records',
        sa.Column('requires_human_review', sa.Boolean(), nullable=False, server_default='false',
                  comment='Flagged when confidence < 0.70'))
    op.add_column('analysis_records',
        sa.Column('human_review_status', sa.String(20), nullable=True,
                  comment='pending_review | approved | rejected | overridden'))
    op.add_column('analysis_records',
        sa.Column('reviewed_by', sa.String(36), nullable=True,
                  comment='UUID of reviewer'))
    op.add_column('analysis_records',
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('analysis_records',
        sa.Column('reviewer_notes', sa.Text(), nullable=True))

    op.create_index('idx_analysis_records_review_status',
                    'analysis_records', ['human_review_status'])
    op.create_index('idx_analysis_records_requires_review',
                    'analysis_records', ['requires_human_review'])


def downgrade() -> None:
    op.drop_index('idx_analysis_records_requires_review', 'analysis_records')
    op.drop_index('idx_analysis_records_review_status', 'analysis_records')
    for col in ['reviewer_notes', 'reviewed_at', 'reviewed_by',
                'human_review_status', 'requires_human_review',
                'confidence_score', 'is_binding']:
        op.drop_column('analysis_records', col)
