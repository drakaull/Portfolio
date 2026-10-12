from dataclasses import replace
from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.project import GitHubRepository
from app.infra.github import GitHubUnavailable
from app.infra.project_sync import sync_projects
from app.infra.repositories.project import ProjectRepository
from tests.conftest import FakeTranslator, assert_committed

pytestmark = pytest.mark.anyio

WHEN = datetime(2026, 1, 2, tzinfo=UTC)


def repo(github_id: int, name: str, about: str | None = "Jeu de plateau") -> GitHubRepository:
    return GitHubRepository(
        github_id=github_id,
        name=name,
        url=f"https://github.com/drakaull/{name}",
        homepage=None,
        about=about,
        languages={"Java": 1},
        topics=(),
        created_at=WHEN,
        pushed_at=WHEN,
        stars=0,
    )


class FakeGitHub:
    def __init__(self, repositories: list[GitHubRepository]) -> None:
        self.repositories = repositories
        self.fail = False

    async def public_repositories(self) -> list[GitHubRepository]:
        if self.fail:
            raise GitHubUnavailable("fake failure")
        return list(self.repositories)


async def sync(session: AsyncSession, github: FakeGitHub, translator: FakeTranslator):
    return await sync_projects(ProjectRepository(session), github, translator)


async def test_first_sync_imports_hidden_projects_with_a_translated_about(
    session: AsyncSession,
) -> None:
    github = FakeGitHub([repo(1, "Projet_TTMC"), repo(2, "Portfolio", about=None)])
    translator = FakeTranslator()

    report = await sync(session, github, translator)
    assert_committed(session)

    assert (report.new, report.updated, report.missing) == (2, 0, 0)
    ttmc, portfolio = await ProjectRepository(session).list()
    assert (ttmc.title, ttmc.visible, ttmc.missing) == ("Projet TTMC", False, False)
    assert ttmc.about_lang == "fr"
    assert ttmc.summary == {
        "fr": "Jeu de plateau",  # written in French: kept as is
        "en": "[en] Jeu de plateau",
        "nl": "[nl] Jeu de plateau",
    }
    assert (portfolio.about_lang, portfolio.summary) == (None, {})


async def test_an_english_about_is_kept_in_english(session: AsyncSession) -> None:
    translator = FakeTranslator()
    translator.detected = "en"

    await sync(session, FakeGitHub([repo(1, "Portfolio", about="Personal portfolio")]), translator)

    [portfolio] = await ProjectRepository(session).list()
    assert portfolio.about_lang == "en"
    assert portfolio.summary == {
        "fr": "[fr] Personal portfolio",
        "en": "Personal portfolio",
        "nl": "[nl] Personal portfolio",
    }


async def test_second_sync_keeps_admin_fields_and_translates_only_changes(
    session: AsyncSession,
) -> None:
    github = FakeGitHub([repo(1, "Projet_TTMC"), repo(2, "Other")])
    translator = FakeTranslator()
    await sync(session, github, translator)
    repository = ProjectRepository(session)
    ttmc, _ = await repository.list()
    await repository.save_details(replace(ttmc, title="TTMC", context="school", visible=True))

    github.repositories = [replace(repo(1, "Projet_TTMC"), stars=5), repo(2, "Other", "Nouveau")]
    translator.calls.clear()
    report = await sync(session, github, translator)

    assert (report.new, report.updated, report.missing) == (0, 2, 0)
    ttmc, other = await repository.list()
    assert (ttmc.title, ttmc.context, ttmc.visible) == ("TTMC", "school", True)
    assert ttmc.repository.stars == 5
    assert other.summary["en"] == "[en] Nouveau"
    # Only the changed "About" was sent to DeepL.
    assert {items[0][0] for items, _ in translator.calls} == {"Nouveau"}


async def test_a_gone_repository_is_hidden_and_marked_until_it_comes_back(
    session: AsyncSession,
) -> None:
    github = FakeGitHub([repo(1, "Projet_TTMC")])
    translator = FakeTranslator()
    await sync(session, github, translator)
    repository = ProjectRepository(session)
    [ttmc] = await repository.list()
    await repository.save_details(replace(ttmc, visible=True))

    github.repositories = []
    report = await sync(session, github, translator)
    [ttmc] = await repository.list()
    assert report.missing == 1
    assert (ttmc.missing, ttmc.visible) == (True, False)
    assert (await sync(session, github, translator)).missing == 0  # counted once

    github.repositories = [repo(1, "Projet_TTMC")]
    await sync(session, github, translator)
    [ttmc] = await repository.list()
    assert (ttmc.missing, ttmc.visible) == (False, False)  # back, still hidden


async def test_github_failure_changes_nothing(session: AsyncSession) -> None:
    github = FakeGitHub([repo(1, "Projet_TTMC")])
    github.fail = True

    with pytest.raises(GitHubUnavailable):
        await sync(session, github, FakeTranslator())

    assert await ProjectRepository(session).list() == []


async def test_deepl_failure_keeps_the_original_and_retries_next_time(
    session: AsyncSession,
) -> None:
    github = FakeGitHub([repo(1, "Projet_TTMC")])
    translator = FakeTranslator()
    translator.fail = True

    report = await sync(session, github, translator)
    [ttmc] = await ProjectRepository(session).list()
    assert report.translation_failed is True
    assert (ttmc.repository.about, ttmc.about_lang, ttmc.summary) == ("Jeu de plateau", None, {})

    translator.fail = False
    await sync(session, github, translator)
    [ttmc] = await ProjectRepository(session).list()
    assert ttmc.summary["en"] == "[en] Jeu de plateau"
