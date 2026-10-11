import pytest
from sqlalchemy import delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.experience import Experience
from app.infra.models import ExperienceModel
from app.infra.repositories.experience import ExperienceRepository

pytestmark = pytest.mark.anyio

TEXT = {"fr": "x", "en": "x"}


def row(**changes: object) -> ExperienceModel:
    values = {
        "slug": "some-entry",
        "kind": "job",
        "title": TEXT,
        "organization": "Org",
        "start_year": 2020,
        "end_year": 2021,
        "summary": TEXT,
        "description": TEXT,
        "technologies": [],
    } | changes
    return ExperienceModel(**values)


async def test_seed_lists_the_cv_entries_most_recent_first(session: AsyncSession) -> None:
    entries = await ExperienceRepository(session).list()

    assert [entry.slug for entry in entries] == [
        "icare-student-job-2026",  # same year as the internship, inserted after it
        "icare-internship-2026",
        "fastai-training-2024",
        "helha-computer-science",
        "epicura-internship-2023",
        "ucl-fucam-business-engineering",
        "college-saint-stanislas",
    ]
    assert all(isinstance(entry, Experience) for entry in entries)


async def test_ongoing_entries_come_first_within_a_start_year(session: AsyncSession) -> None:
    await session.execute(delete(ExperienceModel))
    session.add_all([row(slug="finished", end_year=2021), row(slug="ongoing", end_year=None)])
    await session.flush()

    entries = await ExperienceRepository(session).list()

    assert [entry.slug for entry in entries] == ["ongoing", "finished"]


async def test_get_returns_one_entry_or_none(session: AsyncSession) -> None:
    repository = ExperienceRepository(session)

    entry = await repository.get("icare-internship-2026")

    assert entry is not None
    assert entry.kind == "internship"
    assert entry.title == {"fr": "Ingénieur R&D", "en": "R&D Engineer"}
    assert entry.technologies == ("Amazon S3", "Python", "NoSQL", "Docker", "FastAPI")
    assert await repository.get("unknown") is None


@pytest.mark.parametrize(
    "changes",
    [
        {"slug": "icare-internship-2026"},  # duplicate slug
        {"slug": "Not A Slug"},
        {"kind": "freelance"},
        {"start_year": 1900},
        {"start_year": 2022, "end_year": 2021},
        {"title": {"fr": "x"}},
        {"summary": {"en": "x"}},
    ],
    ids=["duplicate", "slug-format", "kind", "year-range", "end-before-start", "title", "summary"],
)
async def test_database_rejects_invalid_entries(session: AsyncSession, changes: dict) -> None:
    session.add(row(**changes))

    with pytest.raises(IntegrityError):
        await session.flush()
