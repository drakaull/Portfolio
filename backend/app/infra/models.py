from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, String, func
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
