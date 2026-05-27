"""Fix Gap Report schema

Revision ID: 016_fix_gap_reports
Revises: 015_add_testimonials
Create Date: 2026-05-11

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '016_fix_gap_reports'
down_revision = '015_add_testimonials'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Use batch_alter_table for SQLite compatibility
    with op.batch_alter_table('gap_reports', schema=None) as batch_op:
        batch_op.add_column(sa.Column('critical_gaps', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('important_gaps', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('nice_to_have_gaps', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('learning_roadmap', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('estimated_time_weeks', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('quick_wins', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('competitive_differentiator', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('total_potential_improvement', sa.Numeric(precision=3, scale=2), nullable=True))
        batch_op.add_column(sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')))


def downgrade() -> None:
    with op.batch_alter_table('gap_reports', schema=None) as batch_op:
        batch_op.drop_column('updated_at')
        batch_op.drop_column('total_potential_improvement')
        batch_op.drop_column('competitive_differentiator')
        batch_op.drop_column('quick_wins')
        batch_op.drop_column('estimated_time_weeks')
        batch_op.drop_column('learning_roadmap')
        batch_op.drop_column('nice_to_have_gaps')
        batch_op.drop_column('important_gaps')
        batch_op.drop_column('critical_gaps')
