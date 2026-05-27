"""add testimonials table

Revision ID: 015_add_testimonials
Revises: 014_remove_unused_xai_fields
Create Date: 2026-05-10

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = '015_add_testimonials'
down_revision = '014'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add testimonials table"""
    op.create_table(
        'testimonials',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('role', sa.String(length=100), nullable=True),
        sa.Column('company', sa.String(length=100), nullable=True),
        sa.Column('avatar_url', sa.String(length=500), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('rating', sa.Float(), nullable=False),
        sa.Column('is_featured', sa.Boolean(), nullable=True, default=False),
        sa.Column('is_approved', sa.Boolean(), nullable=True, default=False),
        sa.Column('is_verified', sa.Boolean(), nullable=True, default=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_testimonials_id'), 'testimonials', ['id'], unique=False)


def downgrade() -> None:
    """Remove testimonials table"""
    op.drop_index(op.f('ix_testimonials_id'), table_name='testimonials')
    op.drop_table('testimonials')
