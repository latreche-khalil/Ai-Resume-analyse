"""Add lang_confidence to cv_documents and word_count/lang fields to job_descriptions

Revision ID: 009
Revises: 008
Create Date: 2026-04-28

Adds:
- cv_documents.lang_confidence
- job_descriptions.is_long, word_count, detected_language, lang_confidence
"""
from alembic import op
import sqlalchemy as sa


revision = '009'
down_revision = '008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # cv_documents
    op.add_column('cv_documents',
        sa.Column('lang_confidence', sa.Numeric(3, 2), nullable=True,
                  comment='Language detection confidence 0.00-1.00'))

    # job_descriptions
    op.add_column('job_descriptions',
        sa.Column('is_long', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('job_descriptions',
        sa.Column('word_count', sa.Integer(), nullable=True))
    op.add_column('job_descriptions',
        sa.Column('detected_language', sa.String(2), nullable=True))
    op.add_column('job_descriptions',
        sa.Column('lang_confidence', sa.Numeric(3, 2), nullable=True))


def downgrade() -> None:
    op.drop_column('job_descriptions', 'lang_confidence')
    op.drop_column('job_descriptions', 'detected_language')
    op.drop_column('job_descriptions', 'word_count')
    op.drop_column('job_descriptions', 'is_long')
    op.drop_column('cv_documents', 'lang_confidence')
