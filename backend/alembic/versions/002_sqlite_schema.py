"""SQLite compatible schema

Revision ID: 002_sqlite_schema
Revises: 
Create Date: 2025-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002_sqlite_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all tables for SQLite."""
    
    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('first_name', sa.String(100)),
        sa.Column('last_name', sa.String(100)),
        sa.Column('role', sa.String(50), nullable=False, server_default='candidate'),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='1'),
        sa.Column('email_verified', sa.Boolean, nullable=False, server_default='0'),
        sa.Column('preferred_language', sa.String(10), server_default='en'),
        sa.Column('last_login_at', sa.DateTime),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('deleted_at', sa.DateTime),
    )
    
    # CV Documents table
    op.create_table(
        'cv_documents',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('original_filename', sa.String(255), nullable=False),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('file_size_bytes', sa.Integer, nullable=False),
        sa.Column('file_format', sa.String(10), nullable=False),
        sa.Column('extracted_text', sa.Text),
        sa.Column('masked_text', sa.Text),
        sa.Column('detected_language', sa.String(2)),
        sa.Column('word_count', sa.Integer),
        sa.Column('processing_status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('virus_scan_status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('status_message', sa.String(255)),
        sa.Column('virus_scan_at', sa.DateTime),
        sa.Column('retention_until', sa.DateTime, nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('deleted_at', sa.DateTime),
    )
    
    # Skill Reports table
    op.create_table(
        'skill_reports',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('document_id', sa.String(36), sa.ForeignKey('cv_documents.id'), nullable=False),
        sa.Column('skills', sa.JSON),
        sa.Column('job_titles', sa.JSON),
        sa.Column('companies', sa.JSON),
        sa.Column('education', sa.JSON),
        sa.Column('certifications', sa.JSON),
        sa.Column('total_experience_months', sa.Integer),
        sa.Column('extraction_confidence', sa.Float),
        sa.Column('flagged_for_review', sa.Boolean, server_default='0'),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    
    # Job Descriptions table
    op.create_table(
        'job_descriptions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('recruiter_id', sa.String(36), sa.ForeignKey('users.id')),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('required_skills', sa.JSON, nullable=False),
        sa.Column('preferred_skills', sa.JSON, nullable=False),
        sa.Column('experience_level', sa.String(20)),
        sa.Column('education_requirements', sa.JSON),
        sa.Column('work_arrangement', sa.String(20)),
        sa.Column('salary_range_min', sa.Integer),
        sa.Column('salary_range_max', sa.Integer),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='1'),
        sa.Column('is_archived', sa.Boolean, nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('deleted_at', sa.DateTime),
    )
    
    # Analysis Records table
    op.create_table(
        'analysis_records',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('cv_document_id', sa.String(36), sa.ForeignKey('cv_documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('job_description_id', sa.String(36), sa.ForeignKey('job_descriptions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('match_score', sa.Float, nullable=False, server_default='0.0'),
        sa.Column('matching_skills', sa.JSON, nullable=False, server_default='[]'),
        sa.Column('missing_skills', sa.JSON, nullable=False, server_default='[]'),
        sa.Column('transferable_skills', sa.JSON, nullable=False, server_default='[]'),
        sa.Column('processing_status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('processing_started_at', sa.DateTime),
        sa.Column('processing_completed_at', sa.DateTime),
        sa.Column('error_message', sa.Text),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    
    # Gap Reports table
    op.create_table(
        'gap_reports',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('analysis_record_id', sa.String(36), sa.ForeignKey('analysis_records.id', ondelete='CASCADE'), nullable=False),
        sa.Column('missing_skills', sa.JSON),
        sa.Column('skill_gaps', sa.JSON),
        sa.Column('recommendations', sa.JSON),
        sa.Column('priority_skills', sa.JSON),
        sa.Column('learning_resources', sa.JSON),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    
    # XAI Reports table
    op.create_table(
        'xai_reports',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('analysis_record_id', sa.String(36), sa.ForeignKey('analysis_records.id', ondelete='CASCADE'), nullable=False),
        sa.Column('feature_importance', sa.JSON),
        sa.Column('positive_contributions', sa.JSON),
        sa.Column('negative_contributions', sa.JSON),
        sa.Column('explanation_text', sa.Text),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    
    # Chat Sessions table
    op.create_table(
        'chat_sessions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('title', sa.String(255)),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    
    # Chat Messages table
    op.create_table(
        'chat_messages',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('session_id', sa.String(36), sa.ForeignKey('chat_sessions.id'), nullable=False),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    
    # Interview Sessions table
    op.create_table(
        'interview_sessions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('job_description_id', sa.String(36), sa.ForeignKey('job_descriptions.id')),
        sa.Column('status', sa.String(50), nullable=False, server_default='in_progress'),
        sa.Column('overall_score', sa.Float),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('completed_at', sa.DateTime),
    )
    
    # Audit Logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id')),
        sa.Column('operation', sa.String(100), nullable=False),
        sa.Column('resource_type', sa.String(100)),
        sa.Column('resource_id', sa.String(36)),
        sa.Column('entity_type', sa.String(20)),
        sa.Column('confidence_score', sa.Numeric(3, 2)),
        sa.Column('legal_basis', sa.String(100)),
        sa.Column('ip_address', sa.String(45)),
        sa.Column('user_agent', sa.Text),
        sa.Column('operation_metadata', sa.JSON),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    
    # Feedback table
    op.create_table(
        'feedback',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('analysis_record_id', sa.String(36), sa.ForeignKey('analysis_records.id')),
        sa.Column('rating', sa.Integer),
        sa.Column('feedback_text', sa.Text),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    



def downgrade() -> None:
    """Drop all tables."""
    # op.drop_table('pii_mappings') # Handled by migration 004
    op.drop_table('feedback')
    op.drop_table('audit_logs')
    op.drop_table('interview_sessions')
    op.drop_table('chat_messages')
    op.drop_table('chat_sessions')
    op.drop_table('xai_reports')
    op.drop_table('gap_reports')
    op.drop_table('analysis_records')
    op.drop_table('job_descriptions')
    op.drop_table('skill_reports')
    op.drop_table('cv_documents')
    op.drop_table('users')
