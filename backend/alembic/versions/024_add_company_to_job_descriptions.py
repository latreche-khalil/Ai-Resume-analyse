"""add company to job_descriptions

Revision ID: 024
Revises: 023
Create Date: 2026-06-01
"""
from alembic import op
import sqlalchemy as sa

revision = '024_add_company_to_job_descriptions'
down_revision = '023_add_chat_session_fields'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('job_descriptions') as batch_op:
        batch_op.add_column(sa.Column('company', sa.String(255), nullable=True))


def downgrade():
    with op.batch_alter_table('job_descriptions') as batch_op:
        batch_op.drop_column('company')
