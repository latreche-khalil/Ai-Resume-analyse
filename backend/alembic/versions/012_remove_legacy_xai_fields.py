"""remove legacy xai fields

Revision ID: 012
Revises: 011
Create Date: 2026-05-02

Remove redundant/legacy fields from xai_reports:
1. feature_importance (redundant with evidence_for_match)
2. positive_contributions (redundant with evidence_for_match)
3. negative_contributions (redundant with evidence_against_match)
4. Move visualization fields to separate endpoint (keep in DB for now)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '012'
down_revision = '011'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Remove legacy/redundant fields from xai_reports.
    
    Note: Visualization fields (visual_data, force_plot_data, etc.) are kept
    in database but will be served through separate endpoint.
    """
    # Detect database type
    bind = op.get_bind()
    dialect_name = bind.dialect.name
    
    # Get existing columns
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    xai_columns = [c['name'] for c in inspector.get_columns('xai_reports')]
    
    # Remove legacy fields from xai_reports (if they exist)
    with op.batch_alter_table('xai_reports', schema=None) as batch_op:
        # These are redundant with evidence_for_match / evidence_against_match
        if 'feature_importance' in xai_columns:
            batch_op.drop_column('feature_importance')
        if 'positive_contributions' in xai_columns:
            batch_op.drop_column('positive_contributions')
        if 'negative_contributions' in xai_columns:
            batch_op.drop_column('negative_contributions')
        
        # Note: counterfactuals is kept (useful for candidates)
        # Note: visualization fields are kept in DB but served separately


def downgrade() -> None:
    """Restore legacy fields to xai_reports."""
    # Detect database type
    bind = op.get_bind()
    dialect_name = bind.dialect.name
    
    # Restore legacy fields
    with op.batch_alter_table('xai_reports', schema=None) as batch_op:
        if dialect_name == 'postgresql':
            batch_op.add_column(sa.Column('feature_importance', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Legacy: Top 10 features with importance weights'))
            batch_op.add_column(sa.Column('positive_contributions', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Legacy: Features that increased match score'))
            batch_op.add_column(sa.Column('negative_contributions', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Legacy: Features that decreased match score'))
        else:
            # SQLite uses JSON type
            batch_op.add_column(sa.Column('feature_importance', sa.JSON(), nullable=True, comment='Legacy: Top 10 features with importance weights'))
            batch_op.add_column(sa.Column('positive_contributions', sa.JSON(), nullable=True, comment='Legacy: Features that increased match score'))
            batch_op.add_column(sa.Column('negative_contributions', sa.JSON(), nullable=True, comment='Legacy: Features that decreased match score'))
