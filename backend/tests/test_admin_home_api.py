import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import assert_committed

pytestmark = pytest.mark.anyio

VALID = {
    "headline": {"en": "Fullstack developer", "fr": "Développeur fullstack"},
    "intro": {"en": "I build **web apps**.", "fr": ""},
    "linkedin_url": "https://www.linkedin.com/in/someone",
    "github_url": "https://github.com/someone",
}


def with_changes(**changes: object) -> dict:
    return {**VALID, **changes}


async def test_admin_reads_both_languages(admin_client: AsyncClient) -> None:
    response = await admin_client.get("/api/admin/home")

    assert response.status_code == 200
    assert response.json() == {
        "headline": {"en": "Fullstack developer", "fr": "Développeur fullstack"},
        "intro": {"en": "Introduction coming soon.", "fr": "Présentation à venir."},
        "linkedin_url": "https://www.linkedin.com/in/l%C3%A9onard-fontaine-80902437b/",
        "github_url": "https://github.com/drakaull",
        "has_cv": False,
    }


async def test_saved_content_is_public_immediately(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    saved = await admin_client.put("/api/admin/home", json=VALID)
    assert_committed(session)

    assert saved.status_code == 200
    assert saved.json() == {**VALID, "has_cv": False}
    public = (await admin_client.get("/api/home", params={"lang": "fr"})).json()
    assert public["headline"] == "Développeur fullstack"
    assert public["intro"] == "I build **web apps**."  # empty French falls back to English
    assert public["github_url"] == "https://github.com/someone"


async def test_surrounding_spaces_are_trimmed(admin_client: AsyncClient) -> None:
    body = with_changes(headline={"en": "  Developer  ", "fr": " Développeur "})

    saved = await admin_client.put("/api/admin/home", json=body)

    assert saved.json()["headline"] == {"en": "Developer", "fr": "Développeur"}


@pytest.mark.parametrize(
    ("body", "field"),
    [
        (with_changes(headline={"en": "", "fr": "x"}), "en"),
        (with_changes(headline={"en": "   ", "fr": "x"}), "en"),
        (with_changes(headline={"en": "x" * 121, "fr": "x"}), "en"),
        (with_changes(intro={"en": "x" * 5001, "fr": ""}), "en"),
        (with_changes(headline={"en": "x", "fr": "x", "nl": "x"}), "nl"),
        (with_changes(linkedin_url="http://www.linkedin.com/in/someone"), "linkedin_url"),
        (with_changes(github_url="javascript:alert(1)"), "github_url"),
        (with_changes(github_url="https://" + "x" * 250), "github_url"),
        (with_changes(has_cv=True), "has_cv"),
    ],
)
async def test_invalid_content_is_refused(
    admin_client: AsyncClient, body: dict, field: str
) -> None:
    response = await admin_client.put("/api/admin/home", json=body)

    assert response.status_code == 422
    assert any(error["loc"][-1] == field for error in response.json()["detail"])
    # Nothing was saved.
    public = (await admin_client.get("/api/home", params={"lang": "en"})).json()
    assert public["headline"] == "Fullstack developer"
    assert public["github_url"] == "https://github.com/drakaull"
