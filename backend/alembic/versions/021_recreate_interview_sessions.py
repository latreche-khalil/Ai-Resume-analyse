"""recreate interview_sessions table

Revision ID: 021_recreate_interview_sessions
Revises: 020_change_context_data
Create Date: 2026-05-28

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = '021_recreate_interview_sessions'
down_revision = '020_change_context_data'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Completely recreate interview_sessions table to fix context_data issues."""
    
    # Drop the existing table (cascade will handle foreign keys)
    op.drop_table('interview_sessions')
    
    # Recreate the table from scratch
    op.create_table(
        'interview_sessions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('job_description_id', sa.String(length=36), nullable=True),
        sa.Column('overall_score', sa.Numeric(precision=3, scale=2), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='in_progress'),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('context_data', sa.Text(), nullable=True),
        sa.CheckConstraint("overall_score IS NULL OR (overall_score >= 0.00 AND overall_score <= 1.00)", name='check_overall_score_range'),
        sa.CheckConstraint("status IN ('in_progress', 'completed', 'abandoned')", name='check_session_status'),
        sa.ForeignKeyConstraint(['job_description_id'], ['job_descriptions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('idx_interview_sessions_user_id', 'interview_sessions', ['user_id'])
    op.create_index('idx_interview_sessions_status', 'interview_sessions', ['status'])


def downgrade() -> None:
    """Revert to previous table structure."""
    op.drop_index('idx_interview_sessions_status', table_name='interview_sessions')
    op.drop_index('idx_interview_sessions_user_id', table_name='interview_sessions')
    op.drop_table('interview_sessions')
    
    # Recreate old table (simplified - would need full recreation)
    op.create_table(
        'interview_sessions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('job_description_id', sa.String(length=36), nullable=True),
        sa.Column('overall_score', sa.Numeric(precision=3, scale=2), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='in_progress'),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('context_data', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['job_description_id'], ['job_descriptions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
