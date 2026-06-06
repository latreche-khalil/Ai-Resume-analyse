"""add_initiated_by_role_to_analysis_records

Revision ID: 025_add_initiated_by_role
Revises: 1ee1b16e34f9
Create Date: 2026-06-05

Adds initiated_by_role column to analysis_records so candidate analyses
and recruiter analyses can be queried separately.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '025_add_initiated_by_role'
down_revision: Union[str, None] = '1ee1b16e34f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('analysis_records', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                'initiated_by_role',
                sa.String(length=20),
                nullable=True,
                comment='Role of user who initiated the analysis: candidate or recruiter'
            )
        )


def downgrade() -> None:
    with op.batch_alter_table('analysis_records', schema=None) as batch_op:
        batch_op.drop_column('initiated_by_role')
