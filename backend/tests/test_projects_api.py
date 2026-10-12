from datetime import UTC, datetime

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_github_client
from app.domain.project import GitHubRepository
from app.infra.github import GitHubUnavailable
from app.main import app
from tests.conftest import assert_committed

pytestmark = [pytest.mark.anyio, pytest.mark.usefixtures("fake_translator")]

URL = "/api/admin/projects"
WHEN = datetime(2026, 1, 2, tzinfo=UTC)


def repo(github_id: int, name: str, about: str | None = "Jeu de plateau") -> GitHubRepository:
    return GitHubRepository(
        github_id=github_id,
        name=name,
        url=f"https://github.com/drakaull/{name}",
        homepage=None,
        about=about,
        languages={"Java": 750, "CSS": 250},
        topics=("game",),
        created_at=WHEN,
        pushed_at=WHEN,
        stars=3,
    )


class FakeGitHub:
    def __init__(self) -> None:
        self.repositories = [repo(1, "Projet_TTMC"), repo(2, "Portfolio", about=None)]
        self.fail = False

    async def public_repositories(self) -> list[GitHubRepository]:
        if self.fail:
            raise GitHubUnavailable("GitHub rate limit reached (60 requests per hour)")
        return list(self.repositories)


@pytest.fixture
def github():
    fake = FakeGitHub()
    app.dependency_overrides[get_github_client] = lambda: fake
    yield fake
    app.dependency_overrides.pop(get_github_client, None)


async def synced(client: AsyncClient) -> list[dict]:
    response = await client.post(f"{URL}/sync")
    assert response.status_code == 200, response.text
    return (await client.get(URL)).json()


async def test_sync_reports_and_imports_hidden_projects(
    admin_client: AsyncClient, session: AsyncSession, github: FakeGitHub
) -> None:
    response = await admin_client.post(f"{URL}/sync")
    assert_committed(session)

    assert response.json() == {"new": 2, "updated": 0, "missing": 0, "translation_failed": False}
    ttmc, portfolio = (await admin_client.get(URL)).json()
    assert ttmc["title"] == "Projet TTMC"
    assert ttmc["visible"] is False
    assert ttmc["summary"] == {
        "fr": "Jeu de plateau",
        "en": "[en] Jeu de plateau",
        "nl": "[nl] Jeu de plateau",
    }
    assert ttmc["github"]["languages"] == {"Java": 750, "CSS": 250}
    assert portfolio["summary"] == {"fr": "", "en": "", "nl": ""}
    assert (await admin_client.get("/api/projects", params={"lang": "en"})).json() == []


async def test_sync_explains_when_github_is_unavailable(
    admin_client: AsyncClient, github: FakeGitHub
) -> None:
    github.fail = True

    response = await admin_client.post(f"{URL}/sync")

    assert response.status_code == 503
    assert "rate limit" in response.json()["detail"]
    assert (await admin_client.get(URL)).json() == []


async def test_details_update_and_public_list(
    admin_client: AsyncClient, session: AsyncSession, github: FakeGitHub
) -> None:
    ttmc, portfolio = await synced(admin_client)
    details = {"title": " TTMC ", "context": "school", "team_size": 4, "visible": True}

    response = await admin_client.put(f"{URL}/{ttmc['id']}", json=details)
    assert_committed(session)
    await admin_client.put(f"{URL}/{portfolio['id']}", json={"title": "Portfolio", "visible": True})

    assert response.status_code == 200
    assert response.json()["title"] == "TTMC"
    public = (await admin_client.get("/api/projects", params={"lang": "nl"})).json()
    assert [project["title"] for project in public] == ["TTMC", "Portfolio"]
    assert public[0]["summary"] == "[nl] Jeu de plateau"
    assert public[0]["languages"] == [
        {"name": "Java", "percent": 75.0},
        {"name": "CSS", "percent": 25.0},
    ]
    assert (public[0]["context"], public[0]["team_size"]) == ("school", 4)
    assert public[1]["summary"] is None  # no "About" on GitHub yet


async def test_move_and_delete(admin_client: AsyncClient, github: FakeGitHub) -> None:
    ttmc, portfolio = await synced(admin_client)

    response = await admin_client.post(f"{URL}/{portfolio['id']}/move", json={"direction": "up"})
    assert response.status_code == 204
    assert [project["id"] for project in (await admin_client.get(URL)).json()] == [
        portfolio["id"],
        ttmc["id"],
    ]

    assert (await admin_client.delete(f"{URL}/{ttmc['id']}")).status_code == 204
    assert len((await admin_client.get(URL)).json()) == 1


async def test_a_missing_project_cannot_be_shown(
    admin_client: AsyncClient, github: FakeGitHub
) -> None:
    ttmc, _ = await synced(admin_client)
    github.repositories = github.repositories[1:]
    await admin_client.post(f"{URL}/sync")

    response = await admin_client.put(f"{URL}/{ttmc['id']}", json={"title": "x", "visible": True})

    assert response.status_code == 409
    assert (await admin_client.get(f"{URL}/{ttmc['id']}")).json()["missing"] is True


@pytest.mark.parametrize(
    ("method", "path", "body"),
    [
        ("GET", "/999999", None),
        ("PUT", "/999999", {"title": "x"}),
        ("DELETE", "/999999", None),
        ("POST", "/999999/move", {"direction": "up"}),
    ],
)
async def test_unknown_project_is_404(
    admin_client: AsyncClient, method: str, path: str, body: dict | None
) -> None:
    response = await admin_client.request(method, URL + path, json=body)
    assert response.status_code == 404


@pytest.mark.parametrize(
    ("body", "field"),
    [
        ({"title": " "}, "title"),
        ({"title": "x" * 121}, "title"),
        ({"title": "x", "context": "hobby"}, "context"),
        ({"title": "x", "team_size": 0}, "team_size"),
        ({"title": "x", "team_size": 101}, "team_size"),
        ({"title": "x", "stars": 1000}, "stars"),  # GitHub data is not editable
    ],
)
async def test_invalid_details_are_refused(
    admin_client: AsyncClient, github: FakeGitHub, body: dict, field: str
) -> None:
    ttmc, _ = await synced(admin_client)

    response = await admin_client.put(f"{URL}/{ttmc['id']}", json=body)

    assert response.status_code == 422
    assert any(error["loc"][-1] == field for error in response.json()["detail"])


async def test_public_route_needs_a_supported_language(client: AsyncClient) -> None:
    assert (await client.get("/api/projects", params={"lang": "de"})).status_code == 422
