"""Add talent pool tables for recruiter batch ranking

Revision ID: 005_add_talent_pool_tables
Revises: 004_add_pii_tables
Create Date: 2025-01-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '005_add_talent_pool_tables'
down_revision: Union[str, None] = '004_add_pii_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create talent pool tables."""
    
    # Talent Pools table
    op.create_table(
        'talent_pools',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.String(1000), nullable=True),
        sa.Column('recruiter_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('job_description_id', sa.String(36), sa.ForeignKey('job_descriptions.id', ondelete='SET NULL'), nullable=True),
        sa.Column('is_anonymized', sa.Boolean, nullable=False, server_default='1'),
        sa.Column('ranking_criteria', sa.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    
    # Create index on recruiter_id for faster queries
    op.create_index('idx_talent_pool_recruiter', 'talent_pools', ['recruiter_id'])
    
    # Talent Pool CVs association table (Many-to-Many)
    op.create_table(
        'talent_pool_cvs',
        sa.Column('talent_pool_id', sa.String(36), sa.ForeignKey('talent_pools.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('cv_document_id', sa.String(36), sa.ForeignKey('cv_documents.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('pool_specific_score', sa.Float, nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    
    # Create composite index for faster lookups
    op.create_index('idx_talent_pool_cv_lookup', 'talent_pool_cvs', ['talent_pool_id', 'cv_document_id'])


def downgrade() -> None:
    """Drop talent pool tables."""
    op.drop_index('idx_talent_pool_cv_lookup', table_name='talent_pool_cvs')
    op.drop_table('talent_pool_cvs')
    op.drop_index('idx_talent_pool_recruiter', table_name='talent_pools')
    op.drop_table('talent_pools')
