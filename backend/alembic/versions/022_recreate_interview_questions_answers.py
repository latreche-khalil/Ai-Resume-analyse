"""recreate interview_questions and interview_answers tables

Revision ID: 022_recreate_interview_questions_answers
Revises: 021_recreate_interview_sessions
Create Date: 2026-05-28

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '022_recreate_interview_questions_answers'
down_revision = '021_recreate_interview_sessions'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Recreate interview_questions and interview_answers tables."""
    
    # Drop existing tables if they exist
    op.execute("DROP TABLE IF EXISTS interview_answers")
    op.execute("DROP TABLE IF EXISTS interview_questions")
    
    # Recreate interview_questions table
    op.create_table(
        'interview_questions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('session_id', sa.String(length=36), nullable=False),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('question_type', sa.String(length=20), nullable=True),
        sa.Column('difficulty_level', sa.Integer(), nullable=True),
        sa.Column('sequence_number', sa.Integer(), nullable=False),
        sa.CheckConstraint("question_type IN ('behavioral', 'technical', 'situational', 'adaptive') OR question_type IS NULL", name='check_question_type'),
        sa.CheckConstraint("difficulty_level IS NULL OR (difficulty_level >= 1 AND difficulty_level <= 10)", name='check_difficulty_level'),
        sa.ForeignKeyConstraint(['session_id'], ['interview_sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create index
    op.create_index('idx_interview_questions_session_id', 'interview_questions', ['session_id'])
    
    # Recreate interview_answers table
    op.create_table(
        'interview_answers',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('question_id', sa.String(length=36), nullable=False),
        sa.Column('answer_text', sa.Text(), nullable=False),
        sa.Column('relevance_score', sa.Numeric(precision=3, scale=2), nullable=True),
        sa.Column('completeness_score', sa.Numeric(precision=3, scale=2), nullable=True),
        sa.Column('clarity_score', sa.Numeric(precision=3, scale=2), nullable=True),
        sa.Column('feedback', sa.Text(), nullable=True),
        sa.Column('strengths', sa.Text(), nullable=True),  # JSON as Text for SQLite
        sa.Column('improvements', sa.Text(), nullable=True),  # JSON as Text for SQLite
        sa.CheckConstraint("relevance_score IS NULL OR (relevance_score >= 0.00 AND relevance_score <= 1.00)", name='check_relevance_score_range'),
        sa.CheckConstraint("completeness_score IS NULL OR (completeness_score >= 0.00 AND completeness_score <= 1.00)", name='check_completeness_score_range'),
        sa.CheckConstraint("clarity_score IS NULL OR (clarity_score >= 0.00 AND clarity_score <= 1.00)", name='check_clarity_score_range'),
        sa.ForeignKeyConstraint(['question_id'], ['interview_questions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('question_id', name='unique_answer_per_question')
    )
    
    # Create index
    op.create_index('idx_interview_answers_question_id', 'interview_answers', ['question_id'])


def downgrade() -> None:
    """Drop interview_questions and interview_answers tables."""
    op.drop_index('idx_interview_answers_question_id', table_name='interview_answers')
    op.drop_table('interview_answers')
    op.drop_index('idx_interview_questions_session_id', table_name='interview_questions')
    op.drop_table('interview_questions')
