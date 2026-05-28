"""add context_data to interview_sessions

Revision ID: 019_add_context_data
Revises: 018_fix_analysis_records
Create Date: 2026-05-28

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = '019_add_context_data'
down_revision = '018_fix_analysis_records'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add context_data column to interview_sessions table."""
    # Check if column exists first (for SQLite compatibility)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('interview_sessions')]
    
    if 'context_data' not in columns:
        with op.batch_alter_table('interview_sessions', schema=None) as batch_op:
            batch_op.add_column(
                sa.Column(
                    'context_data',
                    sa.JSON(),
                    nullable=True,
                    comment='Session settings: difficulty, type, mode, and analysis context'
                )
            )


def downgrade() -> None:
    """Remove context_data column from interview_sessions table."""
    with op.batch_alter_table('interview_sessions', schema=None) as batch_op:
        batch_op.drop_column('context_data')
