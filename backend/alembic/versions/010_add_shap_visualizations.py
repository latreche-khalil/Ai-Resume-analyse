"""add SHAP visualizations to xai_reports

Revision ID: 010
Revises: 009
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '010'
down_revision = '009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add SHAP-style visualization columns to xai_reports table."""
    
    # Add force_plot_data column
    op.add_column(
        'xai_reports',
        sa.Column(
            'force_plot_data',
            sa.JSON(),
            nullable=True,
            comment='SHAP-style force plot data showing feature contributions'
        )
    )
    
    # Add waterfall_data column
    op.add_column(
        'xai_reports',
        sa.Column(
            'waterfall_data',
            sa.JSON(),
            nullable=True,
            comment='SHAP-style waterfall chart showing cumulative effects'
        )
    )
    
    # Add summary_plot_data column
    op.add_column(
        'xai_reports',
        sa.Column(
            'summary_plot_data',
            sa.JSON(),
            nullable=True,
            comment='SHAP-style summary plot with feature importance and direction'
        )
    )


def downgrade() -> None:
    """Remove SHAP visualization columns."""
    
    op.drop_column('xai_reports', 'summary_plot_data')
    op.drop_column('xai_reports', 'waterfall_data')
    op.drop_column('xai_reports', 'force_plot_data')
