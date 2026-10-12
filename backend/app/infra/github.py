from datetime import datetime

import httpx

from app.domain.project import GitHubRepository

_API = "https://api.github.com"
_TIMEOUT_SECONDS = 10
_PAGE_SIZE = 100  # GitHub's maximum
_HEADERS = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "leonard-fontaine-portfolio",  # GitHub refuses requests without one
}


class GitHubUnavailable(Exception):
    """GitHub could not answer: network error, timeout, rate limit or unexpected answer."""


class GitHubClient:
    """Reads a user's public repositories, without a token (60 requests per hour per IP)."""

    def __init__(self, username: str, transport: httpx.AsyncBaseTransport | None = None):
        self._username = username
        self._transport = transport  # tests inject a fake; production uses the network

    async def public_repositories(self) -> list[GitHubRepository]:
        """The user's own public repositories, forks and archived ones left out, each with its
        languages. One request per page of 100, plus one per repository kept."""
        async with httpx.AsyncClient(
            base_url=_API, headers=_HEADERS, timeout=_TIMEOUT_SECONDS, transport=self._transport
        ) as client:
            repositories: list[dict] = []
            page = 1
            while True:
                batch = await self._get(
                    client,
                    f"/users/{self._username}/repos",
                    {"type": "owner", "per_page": _PAGE_SIZE, "page": page},
                )
                repositories += batch
                if len(batch) < _PAGE_SIZE:
                    break
                page += 1

            kept = [repo for repo in repositories if not repo["fork"] and not repo["archived"]]
            try:
                return [
                    GitHubRepository(
                        github_id=repo["id"],
                        name=repo["name"],
                        url=repo["html_url"],
                        homepage=repo.get("homepage") or None,
                        about=(repo.get("description") or "").strip() or None,
                        languages=await self._get(client, f"/repos/{repo['full_name']}/languages"),
                        topics=tuple(repo.get("topics") or ()),
                        created_at=datetime.fromisoformat(repo["created_at"]),
                        pushed_at=datetime.fromisoformat(repo["pushed_at"]),
                        stars=repo["stargazers_count"],
                    )
                    for repo in kept
                ]
            except (KeyError, TypeError, ValueError) as error:  # not GitHub's shape
                raise GitHubUnavailable("GitHub sent an unexpected answer") from error

    @staticmethod
    async def _get(client: httpx.AsyncClient, path: str, params: dict | None = None):
        try:
            response = await client.get(path, params=params)
        except httpx.HTTPError as error:
            raise GitHubUnavailable(f"GitHub request failed: {type(error).__name__}") from error
        if (
            response.status_code in (403, 429)
            and response.headers.get("x-ratelimit-remaining") == "0"
        ):
            raise GitHubUnavailable("GitHub rate limit reached (60 requests per hour)")
        if response.status_code != 200:
            raise GitHubUnavailable(f"GitHub answered HTTP {response.status_code}")
        try:
            return response.json()
        except ValueError as error:
            raise GitHubUnavailable("GitHub sent an unexpected answer") from error
