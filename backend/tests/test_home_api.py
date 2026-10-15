import os
from pathlib import Path

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
        "photo_url": None,
        "photo_focus": {"x": 50, "y": 50},
    }


async def test_home_falls_back_to_french(client: AsyncClient, session: AsyncSession) -> None:
    await session.execute(update(HomeContentModel).values(headline={"en": "", "fr": "Développeur"}))

    response = await client.get("/api/home", params={"lang": "en"})

    assert response.json()["headline"] == "Développeur"


@pytest.mark.parametrize("params", [{}, {"lang": "de"}, {"lang": "FR"}])
async def test_home_rejects_missing_or_unknown_language(client: AsyncClient, params: dict) -> None:
    response = await client.get("/api/home", params=params)

    assert response.status_code == 422


async def test_home_returns_404_without_content(client: AsyncClient, session: AsyncSession) -> None:
    await session.execute(delete(HomeContentModel))

    response = await client.get("/api/home", params={"lang": "en"})

    assert response.status_code == 404


async def test_cv_returns_404_and_no_cv_url_without_file(client: AsyncClient) -> None:
    assert (await client.get("/api/cv")).status_code == 404
    home = await client.get("/api/home", params={"lang": "en"})
    assert home.json()["cv_url"] is None


async def test_cv_is_served_inline_when_present(client: AsyncClient, storage_dir: Path) -> None:
    (storage_dir / "cv.pdf").write_bytes(b"%PDF-1.7 fake")

    response = await client.get("/api/cv")

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["content-disposition"].startswith("inline")
    assert "Leonard_Fontaine_CV.pdf" in response.headers["content-disposition"]
    assert response.content == b"%PDF-1.7 fake"
    assert response.headers["content-security-policy"] == "sandbox"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["cache-control"] == "no-cache"  # unversioned: always checked again
    home = await client.get("/api/home", params={"lang": "en"})
    assert home.json()["cv_url"].startswith("/api/cv?v=")


async def test_a_new_cv_gets_a_new_address(client: AsyncClient, storage_dir: Path) -> None:
    cv = storage_dir / "cv.pdf"
    cv.write_bytes(b"%PDF-1.7 old")
    first = (await client.get("/api/home", params={"lang": "en"})).json()["cv_url"]
    cv.write_bytes(b"%PDF-1.7 new")
    os.utime(cv, ns=(cv.stat().st_atime_ns, cv.stat().st_mtime_ns + 1_000_000))

    second = (await client.get("/api/home", params={"lang": "en"})).json()["cv_url"]
    assert second != first  # a cached old CV can never be shown under the new address
    versioned = await client.get(second)
    assert "max-age=31536000" in versioned.headers["cache-control"]
    assert versioned.content == b"%PDF-1.7 new"
