"""make recruiter_id nullable in job_descriptions

Revision ID: 003
Revises: 002
Create Date: 2026-04-20 19:50:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002_sqlite_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Make recruiter_id nullable to allow candidates to create JDs for analysis
    with op.batch_alter_table('job_descriptions') as batch_op:
        batch_op.alter_column('recruiter_id',
                        existing_type=sa.UUID(),
                        nullable=True)


def downgrade() -> None:
    # Revert to non-nullable
    with op.batch_alter_table('job_descriptions') as batch_op:
        batch_op.alter_column('recruiter_id',
                        existing_type=sa.UUID(),
                        nullable=False)
