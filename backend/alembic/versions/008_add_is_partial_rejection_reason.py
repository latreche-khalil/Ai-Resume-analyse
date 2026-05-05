"""Add is_partial and rejection_reason to analysis_records

Revision ID: 008
Revises: 007
Create Date: 2026-04-28

Adds:
- is_partial: Boolean — partial results when some agents failed
- rejection_reason: Text — reason for rejection
- Updates processing_status CHECK to include partial_done, rejected
"""
from alembic import op
import sqlalchemy as sa


revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('analysis_records',
        sa.Column('is_partial', sa.Boolean(), nullable=False, server_default='false',
                  comment='True when partial results available'))
    op.add_column('analysis_records',
        sa.Column('rejection_reason', sa.Text(), nullable=True,
                  comment='Reason for rejection'))


def downgrade() -> None:
    op.drop_column('analysis_records', 'rejection_reason')
    op.drop_column('analysis_records', 'is_partial')
