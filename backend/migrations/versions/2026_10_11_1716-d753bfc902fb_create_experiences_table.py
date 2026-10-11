"""create experiences table

Revision ID: d753bfc902fb
Revises: b7f39b834364
Create Date: 2026-10-11 17:16:16.827571

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "d753bfc902fb"
down_revision: str | Sequence[str] | None = "b7f39b834364"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    experiences = op.create_table(
        "experiences",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("title", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("organization", sa.String(length=120), nullable=False),
        sa.Column("start_year", sa.SmallInteger(), nullable=False),
        sa.Column("end_year", sa.SmallInteger(), nullable=True),
        sa.Column("summary", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("description", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("technologies", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=False),
        sa.CheckConstraint(
            "description ? 'fr' AND description ? 'en'",
            name=op.f("ck_experiences_description_languages"),
        ),
        sa.CheckConstraint(
            "kind IN ('job', 'student_job', 'internship', 'education')",
            name=op.f("ck_experiences_kind_values"),
        ),
        sa.CheckConstraint("slug ~ '^[a-z0-9-]+$'", name=op.f("ck_experiences_slug_format")),
        sa.CheckConstraint(
            "summary ? 'fr' AND summary ? 'en'", name=op.f("ck_experiences_summary_languages")
        ),
        sa.CheckConstraint(
            "title ? 'fr' AND title ? 'en'", name=op.f("ck_experiences_title_languages")
        ),
        sa.CheckConstraint(
            "end_year IS NULL OR end_year >= start_year",
            name=op.f("ck_experiences_end_after_start"),
        ),
        sa.CheckConstraint(
            "start_year BETWEEN 1950 AND 2100", name=op.f("ck_experiences_start_year_range")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_experiences")),
        sa.UniqueConstraint("slug", name=op.f("uq_experiences_slug")),
    )

    # Initial entries taken from Léonard's CV, oldest first: same-year entries are ordered by
    # insertion (newest first), so the 2026 student job is shown before the 2026 internship.
    icare_summary = {
        "fr": "Conception et mise en place d'une solution de stockage hybride chaud/froid "
        "pour des données IoT industrielles.",
        "en": "Design and implementation of a hybrid hot/cold storage solution "
        "for industrial IoT data.",
    }
    icare_technologies = ["Amazon S3", "Python", "NoSQL", "Docker", "FastAPI"]
    entries = [
        {
            "slug": "college-saint-stanislas",
            "kind": "education",
            "title": {"fr": "Enseignement secondaire général", "en": "General secondary education"},
            "organization": "Collège Saint-Stanislas de Mons",
            "start_year": 2013,
            "end_year": 2019,
            "summary": {
                "fr": "Option sciences fortes avec immersion en anglais et mathématiques.",
                "en": "Advanced science option with English immersion and mathematics.",
            },
            "technologies": [],
        },
        {
            "slug": "ucl-fucam-business-engineering",
            "kind": "education",
            "title": {
                "fr": "Bachelier ingénieur de gestion",
                "en": "Bachelor's degree in Business Engineering",
            },
            "organization": "UCLouvain FUCaM Mons",
            "start_year": 2019,
            "end_year": 2023,
            "summary": {
                "fr": "Bachelier en ingénierie de gestion.",
                "en": "Bachelor's degree in business engineering.",
            },
            "technologies": [],
        },
        {
            "slug": "epicura-internship-2023",
            "kind": "internship",
            "title": {
                "fr": "Stage d'observation en contrôle de gestion",
                "en": "Observation internship in management control",
            },
            "organization": "EPICURA",
            "start_year": 2023,
            "end_year": 2023,
            "summary": {
                "fr": "Stage d'observation au sein du service de contrôle de gestion.",
                "en": "Observation internship in the management control department.",
            },
            "technologies": [],
        },
        {
            "slug": "helha-computer-science",
            "kind": "education",
            "title": {
                "fr": "Bachelier en informatique, orientation développement d'applications",
                "en": "Bachelor's degree in Computer Science, Application Development",
            },
            "organization": "Haute École Louvain en Hainaut (HELHa)",
            "start_year": 2023,
            "end_year": 2026,
            "summary": {
                "fr": "Études en informatique axées sur le développement d'applications.",
                "en": "Computer science studies focused on application development.",
            },
            "technologies": [],
        },
        {
            "slug": "fastai-training-2024",
            "kind": "education",
            "title": {"fr": "Formation Fast AI", "en": "Fast AI training"},
            "organization": "Ateliers Créatifs",
            "start_year": 2024,
            "end_year": 2024,
            "summary": {
                "fr": "Formation à la bibliothèque fastai pour créer et configurer "
                "des modèles d'intelligence artificielle.",
                "en": "Training in the fastai library to build and configure "
                "artificial intelligence models.",
            },
            "technologies": ["Fast AI"],
        },
        {
            "slug": "icare-internship-2026",
            "kind": "internship",
            "title": {"fr": "Ingénieur R&D", "en": "R&D Engineer"},
            "organization": "I-care Group",
            "start_year": 2026,
            "end_year": 2026,
            "summary": icare_summary,
            "technologies": icare_technologies,
        },
        {
            "slug": "icare-student-job-2026",
            "kind": "student_job",
            "title": {"fr": "Ingénieur R&D", "en": "R&D Engineer"},
            "organization": "I-care Group",
            "start_year": 2026,
            "end_year": 2026,
            "summary": icare_summary,
            "technologies": icare_technologies,
        },
    ]
    # The short summary is also the first description; Léonard rewrites both in the editor.
    op.bulk_insert(experiences, [{**entry, "description": entry["summary"]} for entry in entries])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("experiences")
