"""Fix XAI Report schema v3 (Safe)

Revision ID: 017_fix_xai_reports
Revises: 016_fix_gap_reports
Create Date: 2026-05-11

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision = '017_fix_xai_reports'
down_revision = '016_fix_gap_reports'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    columns = [c['name'] for c in inspector.get_columns('xai_reports')]
    
    # Add missing columns only if they don't exist
    if 'overall_explanation' not in columns:
        with op.batch_alter_table('xai_reports', schema=None) as batch_op:
            batch_op.add_column(sa.Column('overall_explanation', sa.JSON(), nullable=True))
    
    if 'force_plot_data' not in columns:
        with op.batch_alter_table('xai_reports', schema=None) as batch_op:
            batch_op.add_column(sa.Column('force_plot_data', sa.JSON(), nullable=True))
            
    if 'waterfall_data' not in columns:
        with op.batch_alter_table('xai_reports', schema=None) as batch_op:
            batch_op.add_column(sa.Column('waterfall_data', sa.JSON(), nullable=True))
            
    if 'summary_plot_data' not in columns:
        with op.batch_alter_table('xai_reports', schema=None) as batch_op:
            batch_op.add_column(sa.Column('summary_plot_data', sa.JSON(), nullable=True))
            
    if 'credibility_analysis' not in columns:
        with op.batch_alter_table('xai_reports', schema=None) as batch_op:
            batch_op.add_column(sa.Column('credibility_analysis', sa.JSON(), nullable=True))
            
    if 'updated_at' not in columns:
        with op.batch_alter_table('xai_reports', schema=None) as batch_op:
            batch_op.add_column(sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')))


def downgrade() -> None:
    # Downgrade logic (simplified)
    with op.batch_alter_table('xai_reports', schema=None) as batch_op:
        try:
            batch_op.drop_column('updated_at')
        except: pass
        try:
            batch_op.drop_column('credibility_analysis')
        except: pass
        try:
            batch_op.drop_column('summary_plot_data')
        except: pass
        try:
            batch_op.drop_column('waterfall_data')
        except: pass
        try:
            batch_op.drop_column('force_plot_data')
        except: pass
        try:
            batch_op.drop_column('overall_explanation')
        except: pass
