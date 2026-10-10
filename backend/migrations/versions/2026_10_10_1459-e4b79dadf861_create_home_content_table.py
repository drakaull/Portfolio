"""create home_content table

Revision ID: e4b79dadf861
Revises:
Create Date: 2026-10-10 14:59:24.675810

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "e4b79dadf861"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    home_content = op.create_table(
        "home_content",
        sa.Column("id", sa.Integer(), autoincrement=False, nullable=False),
        sa.Column("headline", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("intro", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("linkedin_url", sa.String(length=255), nullable=False),
        sa.Column("github_url", sa.String(length=255), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "headline ? 'en' AND headline ? 'fr'", name=op.f("ck_home_content_headline_languages")
        ),
        sa.CheckConstraint(
            "intro ? 'en' AND intro ? 'fr'", name=op.f("ck_home_content_intro_languages")
        ),
        sa.CheckConstraint("id = 1", name=op.f("ck_home_content_single_row")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_home_content")),
    )
    # Placeholder content so a fresh database serves a valid home page; edited later in the admin.
    op.bulk_insert(
        home_content,
        [
            {
                "id": 1,
                "headline": {"en": "Fullstack developer", "fr": "Développeur fullstack"},
                "intro": {"en": "Introduction coming soon.", "fr": "Présentation à venir."},
                "linkedin_url": "https://www.linkedin.com/in/l%C3%A9onard-fontaine-80902437b/",
                "github_url": "https://github.com/drakaull",
            }
        ],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("home_content")
