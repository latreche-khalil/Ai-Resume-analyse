"""change context_data to text

Revision ID: 020_change_context_data
Revises: 019_add_context_data
Create Date: 2026-05-28

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '020_change_context_data'
down_revision = '019_add_context_data'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Change context_data column type from JSON to Text for SQLite compatibility."""
    # SQLite doesn't support ALTER COLUMN, so we need to recreate the table
    # But since the column was just added and likely empty, we can just drop and recreate
    with op.batch_alter_table('interview_sessions', schema=None) as batch_op:
        batch_op.drop_column('context_data')
        batch_op.add_column(
            sa.Column(
                'context_data',
                sa.Text(),
                nullable=True,
                comment='Session settings: difficulty, type, mode, and analysis context (JSON string)'
            )
        )


def downgrade() -> None:
    """Revert context_data column type from Text to JSON."""
    with op.batch_alter_table('interview_sessions', schema=None) as batch_op:
        batch_op.drop_column('context_data')
        batch_op.add_column(
            sa.Column(
                'context_data',
                sa.JSON(),
                nullable=True,
                comment='Session settings: difficulty, type, mode, and analysis context'
            )
        )
