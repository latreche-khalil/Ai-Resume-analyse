"""Fix Analysis Records schema

Revision ID: 018_fix_analysis_records
Revises: 017_fix_xai_reports
Create Date: 2026-05-11

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision = '018_fix_analysis_records'
down_revision = '017_fix_xai_reports'
branch_labels = None
depends_on = None


def _get_columns(table_name: str) -> list:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    return [c['name'] for c in inspector.get_columns(table_name)]


def upgrade() -> None:
    # --- Fix analysis_records ---
    ar_cols = _get_columns('analysis_records')

    ar_missing = {
        'is_binding':            sa.Column('is_binding', sa.Boolean(), nullable=True, server_default=sa.text('0')),
        'is_partial':            sa.Column('is_partial', sa.Boolean(), nullable=True, server_default=sa.text('0')),
        'rejection_reason':      sa.Column('rejection_reason', sa.Text(), nullable=True),
        'confidence_score':      sa.Column('confidence_score', sa.Numeric(3, 2), nullable=True),
        'requires_human_review': sa.Column('requires_human_review', sa.Boolean(), nullable=True, server_default=sa.text('0')),
        'human_review_status':   sa.Column('human_review_status', sa.String(20), nullable=True),
        'reviewed_by':           sa.Column('reviewed_by', sa.String(36), nullable=True),
        'reviewed_at':           sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        'reviewer_notes':        sa.Column('reviewer_notes', sa.Text(), nullable=True),
        'seniority_alignment':   sa.Column('seniority_alignment', sa.JSON(), nullable=True),
        'red_flags':             sa.Column('red_flags', sa.JSON(), nullable=True),
        'hiring_urgency':        sa.Column('hiring_urgency', sa.String(20), nullable=True),
    }

    for col_name, col_def in ar_missing.items():
        if col_name not in ar_cols:
            with op.batch_alter_table('analysis_records', schema=None) as batch_op:
                batch_op.add_column(col_def)

    # --- Fix gap_reports (re-verify in case 016 was partial) ---
    gr_cols = _get_columns('gap_reports')

    gr_missing = {
        'critical_gaps':              sa.Column('critical_gaps', sa.JSON(), nullable=True),
        'important_gaps':             sa.Column('important_gaps', sa.JSON(), nullable=True),
        'nice_to_have_gaps':          sa.Column('nice_to_have_gaps', sa.JSON(), nullable=True),
        'learning_roadmap':           sa.Column('learning_roadmap', sa.JSON(), nullable=True),
        'estimated_time_weeks':       sa.Column('estimated_time_weeks', sa.Integer(), nullable=True),
        'quick_wins':                 sa.Column('quick_wins', sa.JSON(), nullable=True),
        'competitive_differentiator': sa.Column('competitive_differentiator', sa.JSON(), nullable=True),
        'total_potential_improvement':sa.Column('total_potential_improvement', sa.Numeric(3, 2), nullable=True),
    }

    for col_name, col_def in gr_missing.items():
        if col_name not in gr_cols:
            with op.batch_alter_table('gap_reports', schema=None) as batch_op:
                batch_op.add_column(col_def)

    # --- Fix xai_reports (re-verify in case 017 was partial) ---
    xr_cols = _get_columns('xai_reports')

    xr_missing = {
        'overall_explanation': sa.Column('overall_explanation', sa.JSON(), nullable=True),
        'evidence_for_match':  sa.Column('evidence_for_match', sa.JSON(), nullable=False, server_default='[]'),
        'evidence_against_match': sa.Column('evidence_against_match', sa.JSON(), nullable=False, server_default='[]'),
        'key_achievements':    sa.Column('key_achievements', sa.JSON(), nullable=False, server_default='[]'),
        'counterfactuals':     sa.Column('counterfactuals', sa.JSON(), nullable=False, server_default='[]'),
        'visual_data':         sa.Column('visual_data', sa.JSON(), nullable=True),
        'force_plot_data':     sa.Column('force_plot_data', sa.JSON(), nullable=True),
        'waterfall_data':      sa.Column('waterfall_data', sa.JSON(), nullable=True),
        'summary_plot_data':   sa.Column('summary_plot_data', sa.JSON(), nullable=True),
        'credibility_analysis':sa.Column('credibility_analysis', sa.JSON(), nullable=True),
    }

    for col_name, col_def in xr_missing.items():
        if col_name not in xr_cols:
            with op.batch_alter_table('xai_reports', schema=None) as batch_op:
                batch_op.add_column(col_def)


def downgrade() -> None:
    # Simplified downgrade - not critical for dev environment
    pass
