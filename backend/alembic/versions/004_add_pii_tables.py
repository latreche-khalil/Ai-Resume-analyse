"""Add PII tables (pii_mappings and pii_audit_trail)

Revision ID: 004_add_pii_tables
Revises: 003_make_recruiter_id_nullable
Create Date: 2025-01-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004_add_pii_tables'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create PII tables."""
    
    # PII Mappings table
    op.create_table(
        'pii_mappings',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('document_id', sa.String(36), sa.ForeignKey('cv_documents.id', ondelete='CASCADE'), nullable=True, index=True),
        sa.Column('masked_token', sa.String(100), nullable=False, index=True, comment='Token like EMAIL_1, PHONE_2'),
        sa.Column('entity_type', sa.String(50), nullable=False, index=True, comment='EMAIL, PHONE, NAME, etc.'),
        sa.Column('encrypted_value', sa.LargeBinary, nullable=False, comment='AES-256-GCM encrypted PII'),
        sa.Column('encryption_key_id', sa.String(50), nullable=False, comment='Key version for rotation'),
        sa.Column('confidence_score', sa.Numeric(3, 2), nullable=True, comment='Detection confidence (0.0-1.0)'),
        sa.Column('flagged_for_review', sa.Boolean, nullable=False, server_default='0', comment='Manual review needed'),
        sa.Column('retention_until', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP'), comment='Auto-deletion date'),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    
    # Create composite index for token lookup
    op.create_index('idx_pii_user_token', 'pii_mappings', ['user_id', 'masked_token'])
    
    # PII Audit Trail table
    op.create_table(
        'pii_audit_trail',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('mapping_id', sa.String(36), sa.ForeignKey('pii_mappings.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True, comment='User who performed the action'),
        sa.Column('document_id', sa.String(36), sa.ForeignKey('cv_documents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('action', sa.String(50), nullable=False, comment='MASKED, UNMASKED, ACCESSED, DELETED'),
        sa.Column('purpose', sa.String(255), nullable=False, comment='Reason for action (e.g., JD Matching, Recruiter Review)'),
        sa.Column('legal_basis', sa.String(255), nullable=True, comment='GDPR Legal basis (e.g., Consent, Contract, Legitimate Interest)'),
        sa.Column('timestamp', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(255), nullable=True),
        sa.Column('extra_details', sa.JSON, nullable=True),
    )
    
    # Create indexes for audit queries
    op.create_index('idx_pii_audit_action', 'pii_audit_trail', ['action'])
    op.create_index('idx_pii_audit_timestamp', 'pii_audit_trail', ['timestamp'])


def downgrade() -> None:
    """Drop PII tables."""
    op.drop_table('pii_audit_trail')
    op.drop_table('pii_mappings')
