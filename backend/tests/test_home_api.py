import pytest
from httpx import AsyncClient
from sqlalchemy import delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.infra.models import HomeContentModel

pytestmark = pytest.mark.anyio


@pytest.mark.parametrize(
    ("lang", "headline", "intro"),
    [
        ("en", "Fullstack developer", "Introduction coming soon."),
        ("fr", "Développeur fullstack", "Présentation à venir."),
    ],
)
async def test_home_returns_content_in_requested_language(
    client: AsyncClient, lang: str, headline: str, intro: str
) -> None:
    response = await client.get("/api/home", params={"lang": lang})

    assert response.status_code == 200
    assert response.json() == {
        "headline": headline,
        "intro": intro,
        "linkedin_url": "https://www.linkedin.com/in/l%C3%A9onard-fontaine-80902437b/",
        "github_url": "https://github.com/drakaull",
        "cv_url": None,
    }


async def test_home_falls_back_to_english(client: AsyncClient, session: AsyncSession) -> None:
    await session.execute(update(HomeContentModel).values(headline={"en": "Developer", "fr": ""}))

    response = await client.get("/api/home", params={"lang": "fr"})

    assert response.json()["headline"] == "Developer"


@pytest.mark.parametrize("params", [{}, {"lang": "de"}, {"lang": "FR"}])
async def test_home_rejects_missing_or_unknown_language(client: AsyncClient, params: dict) -> None:
    response = await client.get("/api/home", params=params)

    assert response.status_code == 422


async def test_home_returns_404_without_content(client: AsyncClient, session: AsyncSession) -> None:
    await session.execute(delete(HomeContentModel))

    response = await client.get("/api/home", params={"lang": "en"})

    assert response.status_code == 404
