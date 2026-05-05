"""
Base model configuration for SQLAlchemy models.

Provides the declarative base and common mixins (UUID PK, timestamps, soft-delete).

UUID strategy:
- PostgreSQL → native UUID column (most efficient)
- SQLite     → String(36) storing the UUID as text (SQLite has no UUID type)
  The switch is automatic via _uuid_column().
"""
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4, UUID as PythonUUID

from sqlalchemy import DateTime, String, func, event
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, declared_attr
from sqlalchemy import TypeDecorator, CHAR
import uuid


# ──────────────────────────────────────────────────────────────────────────────
# Cross-dialect UUID type
# ──────────────────────────────────────────────────────────────────────────────
class UUIDType(TypeDecorator):
    """
    Platform-independent UUID type.

    - PostgreSQL: uses the native UUID column type.
    - Other DBs (SQLite, MySQL…): stores as CHAR(36) text.

    Always returns Python uuid.UUID objects.
    """

    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql":
            return value if isinstance(value, PythonUUID) else PythonUUID(str(value))
        return str(value) if isinstance(value, PythonUUID) else str(uuid.UUID(str(value)))

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return value if isinstance(value, PythonUUID) else PythonUUID(str(value))


# ──────────────────────────────────────────────────────────────────────────────
# Declarative base
# ──────────────────────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    """Base class for all database models."""
    __allow_unmapped__ = True


# ──────────────────────────────────────────────────────────────────────────────
# Mixins
# ──────────────────────────────────────────────────────────────────────────────
class UUIDMixin:
    """Adds a cross-dialect UUID primary key to any model."""

    @declared_attr
    def id(cls) -> Mapped[PythonUUID]:
        return mapped_column(
            UUIDType(),
            primary_key=True,
            default=uuid4,
            comment="Unique identifier for the record",
        )


class TimestampMixin:
    """Adds created_at / updated_at timestamps to models."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Timestamp when the record was created",
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
        comment="Timestamp when the record was last updated",
    )


class SoftDeleteMixin:
    """Adds soft-delete support to models."""

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when the record was soft deleted",
    )

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    def soft_delete(self) -> None:
        """Mark the record as deleted (timezone-aware)."""
        self.deleted_at = datetime.now(timezone.utc)

    def restore(self) -> None:
        """Restore a soft-deleted record."""
        self.deleted_at = None
