"""simplify agent outputs

Revision ID: 011
Revises: 010
Create Date: 2026-05-01

Simplification changes:
1. Remove cultural_fit_indicators from analysis_records (moved to XAI)
2. Remove competitive_advantage from analysis_records (moved to XAI)
3. Remove important_gaps from gap_reports (merged with critical/nice_to_have)
4. Remove estimated_time_weeks from gap_reports (not used)
5. Remove competitive_differentiator from gap_reports (moved to XAI)
6. Remove total_potential_improvement from gap_reports (not used)
7. Add competitive_advantage to xai_reports
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '011'
down_revision = '010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Detect database type
    bind = op.get_bind()
    dialect_name = bind.dialect.name
    
    # Get existing columns to check what exists
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # Remove unused fields from analysis_records (if they exist)
    analysis_columns = [c['name'] for c in inspector.get_columns('analysis_records')]
    with op.batch_alter_table('analysis_records', schema=None) as batch_op:
        if 'cultural_fit_indicators' in analysis_columns:
            batch_op.drop_column('cultural_fit_indicators')
        if 'competitive_advantage' in analysis_columns:
            batch_op.drop_column('competitive_advantage')
    
    # Remove unused fields from gap_reports (if they exist)
    gap_columns = [c['name'] for c in inspector.get_columns('gap_reports')]
    with op.batch_alter_table('gap_reports', schema=None) as batch_op:
        if 'important_gaps' in gap_columns:
            batch_op.drop_column('important_gaps')
        if 'estimated_time_weeks' in gap_columns:
            batch_op.drop_column('estimated_time_weeks')
        if 'competitive_differentiator' in gap_columns:
            batch_op.drop_column('competitive_differentiator')
        if 'total_potential_improvement' in gap_columns:
            batch_op.drop_column('total_potential_improvement')
    
    # Add competitive_advantage to xai_reports (if not exists)
    xai_columns = [c['name'] for c in inspector.get_columns('xai_reports')]
    if 'competitive_advantage' not in xai_columns:
        with op.batch_alter_table('xai_reports', schema=None) as batch_op:
            if dialect_name == 'postgresql':
                batch_op.add_column(sa.Column('competitive_advantage', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Competitive advantage analysis (moved from Gap Agent)'))
            else:
                # SQLite uses JSON type
                batch_op.add_column(sa.Column('competitive_advantage', sa.JSON(), nullable=True, comment='Competitive advantage analysis (moved from Gap Agent)'))


def downgrade() -> None:
    # Detect database type
    bind = op.get_bind()
    dialect_name = bind.dialect.name
    
    # Restore fields to analysis_records
    with op.batch_alter_table('analysis_records', schema=None) as batch_op:
        if dialect_name == 'postgresql':
            batch_op.add_column(sa.Column('cultural_fit_indicators', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Cultural fit indicators'))
            batch_op.add_column(sa.Column('competitive_advantage', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Competitive advantage analysis'))
        else:
            batch_op.add_column(sa.Column('cultural_fit_indicators', sa.JSON(), nullable=True, comment='Cultural fit indicators'))
            batch_op.add_column(sa.Column('competitive_advantage', sa.JSON(), nullable=True, comment='Competitive advantage analysis'))
    
    # Restore fields to gap_reports
    with op.batch_alter_table('gap_reports', schema=None) as batch_op:
        if dialect_name == 'postgresql':
            batch_op.add_column(sa.Column('important_gaps', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='List of important skill gaps (highly desired)'))
            batch_op.add_column(sa.Column('competitive_differentiator', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Competitive differentiator analysis'))
        else:
            batch_op.add_column(sa.Column('important_gaps', sa.JSON(), nullable=True, comment='List of important skill gaps (highly desired)'))
            batch_op.add_column(sa.Column('competitive_differentiator', sa.JSON(), nullable=True, comment='Competitive differentiator analysis'))
        
        batch_op.add_column(sa.Column('estimated_time_weeks', sa.Integer(), nullable=True, comment='Estimated time to close all gaps (in weeks)'))
        batch_op.add_column(sa.Column('total_potential_improvement', sa.Numeric(precision=3, scale=2), nullable=True, comment='Total potential score improvement'))
    
    # Remove competitive_advantage from xai_reports
    with op.batch_alter_table('xai_reports', schema=None) as batch_op:
        batch_op.drop_column('competitive_advantage')
