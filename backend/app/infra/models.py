from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.infra.database import Base


class HomeContentModel(Base):
    __tablename__ = "home_content"
    __table_args__ = (
        CheckConstraint("id = 1", name="single_row"),
        # Translated JSON fields must always contain the two base languages.
        CheckConstraint("headline ? 'en' AND headline ? 'fr'", name="headline_languages"),
        CheckConstraint("intro ? 'en' AND intro ? 'fr'", name="intro_languages"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=False, default=1)
    headline: Mapped[dict[str, str]] = mapped_column(JSONB)
    intro: Mapped[dict[str, str]] = mapped_column(JSONB)
    linkedin_url: Mapped[str] = mapped_column(String(255))
    github_url: Mapped[str] = mapped_column(String(255))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class AdminUserModel(Base):
    __tablename__ = "admin_users"
    __table_args__ = (
        CheckConstraint("char_length(username) BETWEEN 3 AND 50", name="username_length"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AdminSessionModel(Base):
    __tablename__ = "admin_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    # SHA-256 hex of the cookie token; the token itself is never stored.
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    admin_user_id: Mapped[int] = mapped_column(
        ForeignKey("admin_users.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
