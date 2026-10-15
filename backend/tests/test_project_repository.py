from dataclasses import replace
from datetime import UTC, datetime

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.project import GitHubRepository, Project, title_from_name
from app.infra.models import ProjectModel
from app.infra.repositories.project import ProjectRepository

pytestmark = pytest.mark.anyio

WHEN = datetime(2026, 1, 2, tzinfo=UTC)


def project(github_id: int, name: str = "Projet_TTMC", **changes: object) -> Project:
    repository = GitHubRepository(
        github_id=github_id,
        name=name,
        url=f"https://github.com/drakaull/{name}",
        homepage=None,
        about="Jeu de plateau",
        languages={"Java": 900, "CSS": 100},
        topics=("game",),
        created_at=WHEN,
        pushed_at=WHEN,
        stars=1,
    )
    values = {
        "id": None,
        "repository": repository,
        "about_lang": "fr",
        "summary": {"fr": "Jeu de plateau", "en": "Board game", "nl": "Bordspel"},
        "title": title_from_name(name),
        "context": None,
        "team_size": None,
        "visible": False,
        "missing": False,
    } | changes
    return Project(**values)


@pytest.mark.parametrize(
    ("name", "title"),
    [
        ("Projet_TTMC", "Projet TTMC"),
        ("AemtHackatonBackend", "Aemt Hackaton Backend"),
        ("OTEAL_ceremony", "OTEAL ceremony"),
        ("my-api.v2", "my api v2"),
    ],
)
def test_title_from_name(name: str, title: str) -> None:
    assert title_from_name(name) == title


async def test_add_appends_and_get_returns_everything(session: AsyncSession) -> None:
    repository = ProjectRepository(session)

    first = await repository.add(project(1, "First"))
    second = await repository.add(project(2, "Second"))

    assert await repository.get(first.id) == first
    assert [entry.repository.name for entry in await repository.list()] == ["First", "Second"]
    assert second.repository.languages == {"Java": 900, "CSS": 100}


async def test_github_and_admin_fields_are_saved_separately(session: AsyncSession) -> None:
    repository = ProjectRepository(session)
    stored = await repository.add(project(1))
    await repository.save_details(
        replace(stored, title="TTMC", context="school", team_size=4, visible=True)
    )

    refreshed = replace(stored.repository, about="Nouveau", stars=9)
    # A sync carries the old admin fields: they must not overwrite the new ones.
    await repository.save_github(replace(stored, repository=refreshed, title="ignored"))

    saved = await repository.get(stored.id)
    assert (saved.title, saved.context, saved.team_size, saved.visible) == (
        "TTMC",
        "school",
        4,
        True,
    )
    assert (saved.repository.about, saved.repository.stars) == ("Nouveau", 9)


async def test_a_missing_project_is_hidden(session: AsyncSession) -> None:
    repository = ProjectRepository(session)
    stored = await repository.add(project(1))
    await repository.save_details(replace(stored, visible=True))

    await repository.save_github(replace(stored, missing=True))

    saved = await repository.get(stored.id)
    assert (saved.missing, saved.visible) == (True, False)


async def test_move_and_delete(session: AsyncSession) -> None:
    repository = ProjectRepository(session)
    first = await repository.add(project(1, "First"))
    second = await repository.add(project(2, "Second"))

    assert await repository.move(second.id, "up") is True
    await repository.move(second.id, "up")  # already first: nothing changes
    assert [entry.repository.name for entry in await repository.list()] == ["Second", "First"]

    assert await repository.delete(first.id) is True
    assert await repository.delete(first.id) is False
    assert await repository.move(first.id, "down") is False
    with pytest.raises(LookupError):
        await repository.save_details(first)


@pytest.mark.parametrize(
    "changes",
    [
        {"context": "hobby"},
        {"team_size": 0},
        {"visible": True, "missing": True},
        {"github_id": 1},  # duplicate
    ],
    ids=["context", "team-size", "visible-missing", "duplicate"],
)
async def test_database_rejects_invalid_rows(session: AsyncSession, changes: dict) -> None:
    await ProjectRepository(session).add(project(1))
    values = {
        "github_id": 2,
        "name": "x",
        "url": "https://github.com/x",
        "github_created_at": WHEN,
        "pushed_at": WHEN,
        "title": "x",
        "position": 5,
    } | changes
    session.add(ProjectModel(**values))

    with pytest.raises(IntegrityError):
        await session.flush()
