import os
from datetime import UTC, datetime

import httpx
import pytest

from app.infra.github import GitHubClient, GitHubUnavailable

pytestmark = pytest.mark.anyio


def repo(repo_id: int, name: str, **changes: object) -> dict:
    return {
        "id": repo_id,
        "name": name,
        "full_name": f"drakaull/{name}",
        "html_url": f"https://github.com/drakaull/{name}",
        "homepage": "",
        "description": "  Jeu de plateau  ",
        "fork": False,
        "archived": False,
        "topics": ["game"],
        "created_at": "2024-02-01T10:00:00Z",
        "pushed_at": "2025-03-04T11:00:00Z",
        "stargazers_count": 2,
    } | changes


def fake_github(pages: list[list[dict]], status: int = 200, headers: dict | None = None):
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if status != 200:
            return httpx.Response(status, headers=headers or {})
        if request.url.path.endswith("/languages"):
            return httpx.Response(200, json={"Java": 900, "CSS": 100})
        page = int(request.url.params["page"])
        return httpx.Response(200, json=pages[page - 1] if page <= len(pages) else [])

    return httpx.MockTransport(handler), requests


async def test_keeps_own_public_repositories_with_their_languages() -> None:
    transport, requests = fake_github(
        [[repo(1, "Projet_TTMC"), repo(2, "forked", fork=True), repo(3, "old", archived=True)]]
    )

    [found] = await GitHubClient("drakaull", transport).public_repositories()

    assert found.github_id == 1
    assert found.about == "Jeu de plateau"
    assert found.homepage is None  # GitHub sends "" when there is none
    assert found.languages == {"Java": 900, "CSS": 100}
    assert found.created_at == datetime(2024, 2, 1, 10, tzinfo=UTC)
    # Forks and archived repositories cost no languages request.
    assert [request.url.path for request in requests] == [
        "/users/drakaull/repos",
        "/repos/drakaull/Projet_TTMC/languages",
    ]
    assert requests[0].headers["user-agent"]


async def test_reads_every_page() -> None:
    first_page = [repo(index, f"repo{index}", fork=True) for index in range(100)]
    transport, _ = fake_github([first_page, [repo(500, "last")]])

    found = await GitHubClient("drakaull", transport).public_repositories()

    assert [entry.name for entry in found] == ["last"]


async def test_empty_about_is_none() -> None:
    transport, _ = fake_github([[repo(1, "x", description=None), repo(2, "y", description=" ")]])

    found = await GitHubClient("drakaull", transport).public_repositories()

    assert [entry.about for entry in found] == [None, None]


@pytest.mark.parametrize(
    ("status", "headers", "message"),
    [
        (403, {"x-ratelimit-remaining": "0"}, "rate limit"),
        (429, {"x-ratelimit-remaining": "0"}, "rate limit"),
        (404, {}, "HTTP 404"),
        (502, {}, "HTTP 502"),
    ],
)
async def test_errors_become_github_unavailable(status: int, headers: dict, message: str) -> None:
    transport, _ = fake_github([], status=status, headers=headers)

    with pytest.raises(GitHubUnavailable, match=message):
        await GitHubClient("drakaull", transport).public_repositories()


async def test_network_errors_and_odd_answers_become_github_unavailable() -> None:
    def timeout(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("too slow", request=request)

    with pytest.raises(GitHubUnavailable):
        await GitHubClient("drakaull", httpx.MockTransport(timeout)).public_repositories()

    transport, _ = fake_github([[{"id": 1, "fork": False, "archived": False}]])
    with pytest.raises(GitHubUnavailable):
        await GitHubClient("drakaull", transport).public_repositories()


@pytest.mark.skipif(not os.environ.get("GITHUB_LIVE_TEST"), reason="set GITHUB_LIVE_TEST=1")
async def test_live_github() -> None:
    found = await GitHubClient("drakaull").public_repositories()
    assert any(entry.name == "Portfolio" for entry in found)
