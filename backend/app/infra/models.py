from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.experience import ORGANIZATION_MAX_LENGTH, SLUG_MAX_LENGTH
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


class ExperienceModel(Base):
    __tablename__ = "experiences"
    __table_args__ = (
        CheckConstraint("slug ~ '^[a-z0-9-]+$'", name="slug_format"),
        CheckConstraint(
            "kind IN ('job', 'student_job', 'internship', 'education')", name="kind_values"
        ),
        CheckConstraint("start_year BETWEEN 1950 AND 2100", name="start_year_range"),
        CheckConstraint("end_year IS NULL OR end_year >= start_year", name="end_after_start"),
        CheckConstraint("title ? 'fr' AND title ? 'en'", name="title_languages"),
        CheckConstraint("summary ? 'fr' AND summary ? 'en'", name="summary_languages"),
        CheckConstraint("description ? 'fr' AND description ? 'en'", name="description_languages"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(SLUG_MAX_LENGTH), unique=True)
    kind: Mapped[str] = mapped_column(String(20))
    title: Mapped[dict[str, str]] = mapped_column(JSONB)
    organization: Mapped[str] = mapped_column(String(ORGANIZATION_MAX_LENGTH))
    start_year: Mapped[int] = mapped_column(SmallInteger)
    end_year: Mapped[int | None] = mapped_column(SmallInteger)
    summary: Mapped[dict[str, str]] = mapped_column(JSONB)
    description: Mapped[dict[str, str]] = mapped_column(JSONB)
    technologies: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default="{}")
