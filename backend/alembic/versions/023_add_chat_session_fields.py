"""add chat session fields

Revision ID: 023_add_chat_session_fields
Revises: 022_recreate_interview_questions_answers
Create Date: 2026-05-28 14:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '023_add_chat_session_fields'
down_revision = '022_recreate_interview_questions_answers'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add missing columns to chat_sessions table
    with op.batch_alter_table('chat_sessions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('context_data', sa.Text, nullable=True))
        batch_op.add_column(sa.Column('message_count', sa.Integer, nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('is_active', sa.Boolean, nullable=False, server_default='1'))
    
    # Add message_metadata column to chat_messages table
    with op.batch_alter_table('chat_messages', schema=None) as batch_op:
        batch_op.add_column(sa.Column('message_metadata', sa.Text, nullable=True))
        batch_op.add_column(sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')))


def downgrade() -> None:
    with op.batch_alter_table('chat_messages', schema=None) as batch_op:
        batch_op.drop_column('updated_at')
        batch_op.drop_column('message_metadata')
    
    with op.batch_alter_table('chat_sessions', schema=None) as batch_op:
        batch_op.drop_column('is_active')
        batch_op.drop_column('message_count')
        batch_op.drop_column('context_data')
