import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import FakeTranslator, assert_committed

pytestmark = pytest.mark.anyio

VALID = {
    "headline": {"en": "Fullstack developer", "fr": "Développeur fullstack"},
    "intro": {"en": "", "fr": "Je crée des **applications web**."},
    "linkedin_url": "https://www.linkedin.com/in/someone",
    "github_url": "https://github.com/someone",
    "photo_focus": {"x": 30, "y": 20},
}


def with_changes(**changes: object) -> dict:
    return {**VALID, **changes}


async def test_admin_reads_both_languages(admin_client: AsyncClient) -> None:
    response = await admin_client.get("/api/admin/home")

    assert response.status_code == 200
    assert response.json() == {
        # The seeded row has no Dutch: every language is still present, empty.
        "headline": {"en": "Fullstack developer", "fr": "Développeur fullstack", "nl": ""},
        "intro": {"en": "Introduction coming soon.", "fr": "Présentation à venir.", "nl": ""},
        "linkedin_url": "https://www.linkedin.com/in/l%C3%A9onard-fontaine-80902437b/",
        "github_url": "https://github.com/drakaull",
        "has_cv": False,
        "photo_url": None,
        "photo_focus": {"x": 50, "y": 50},  # centred by default
    }


async def test_saved_content_is_public_immediately(
    admin_client: AsyncClient, session: AsyncSession, fake_translator: FakeTranslator
) -> None:
    saved = await admin_client.put("/api/admin/home", json=VALID)
    assert_committed(session)

    assert saved.status_code == 200
    # Empty translations were generated from French; the English headline written was kept.
    assert saved.json() == {
        **VALID,
        "headline": {
            "en": "Fullstack developer",
            "fr": "Développeur fullstack",
            "nl": "[nl] Développeur fullstack",
        },
        "intro": {
            "en": "[en] Je crée des **applications web**.",
            "fr": "Je crée des **applications web**.",
            "nl": "[nl] Je crée des **applications web**.",
        },
        "has_cv": False,
        "photo_url": None,
        "auto_translated": ["en", "nl"],
        "translation_failed": False,
    }
    assert fake_translator.calls == [
        ([("Je crée des **applications web**.", "markdown")], "en"),
        (
            [("Développeur fullstack", "plain"), ("Je crée des **applications web**.", "markdown")],
            "nl",
        ),
    ]
    public = (await admin_client.get("/api/home", params={"lang": "en"})).json()
    assert public["headline"] == "Fullstack developer"
    assert public["intro"] == "[en] Je crée des **applications web**."


async def test_written_translations_are_never_replaced(
    admin_client: AsyncClient, fake_translator: FakeTranslator
) -> None:
    body = with_changes(
        headline={"en": "Developer", "fr": "Développeur", "nl": "Ontwikkelaar"},
        intro={"en": "My own English.", "fr": "Mon français.", "nl": "Mijn Nederlands."},
    )

    saved = (await admin_client.put("/api/admin/home", json=body)).json()

    assert saved["intro"]["en"] == "My own English."
    assert saved["intro"]["nl"] == "Mijn Nederlands."
    assert saved["auto_translated"] == []
    assert fake_translator.calls == []


async def test_saving_works_when_translation_fails(
    admin_client: AsyncClient, fake_translator: FakeTranslator
) -> None:
    fake_translator.fail = True

    saved = await admin_client.put("/api/admin/home", json=VALID)

    assert saved.status_code == 200
    assert saved.json()["translation_failed"] is True
    assert saved.json()["intro"]["en"] == ""
    public = (await admin_client.get("/api/home", params={"lang": "en"})).json()
    assert public["intro"] == "Je crée des **applications web**."  # French shown meanwhile
    assert public["github_url"] == "https://github.com/someone"


async def test_surrounding_spaces_are_trimmed(admin_client: AsyncClient) -> None:
    body = with_changes(
        headline={"en": "  Developer  ", "fr": " Développeur ", "nl": " Ontwikkelaar "}
    )

    saved = await admin_client.put("/api/admin/home", json=body)

    assert saved.json()["headline"] == {
        "en": "Developer",
        "fr": "Développeur",
        "nl": "Ontwikkelaar",
    }


@pytest.mark.parametrize(
    ("body", "field"),
    [
        (with_changes(headline={"en": "x", "fr": ""}), "fr"),
        (with_changes(headline={"en": "x", "fr": "   "}), "fr"),
        (with_changes(headline={"en": "x" * 121, "fr": "x"}), "en"),
        (with_changes(intro={"en": "", "fr": "x" * 5001}), "fr"),
        (with_changes(headline={"en": "x", "fr": "x", "de": "x"}), "de"),
        (with_changes(linkedin_url="http://www.linkedin.com/in/someone"), "linkedin_url"),
        (with_changes(github_url="javascript:alert(1)"), "github_url"),
        (with_changes(github_url="https://" + "x" * 250), "github_url"),
        (with_changes(has_cv=True), "has_cv"),
        (with_changes(photo_focus={"x": -1, "y": 50}), "x"),
        (with_changes(photo_focus={"x": 50, "y": 101}), "y"),
        (with_changes(photo_focus={"x": 50, "y": 50, "z": 1}), "z"),
        ({k: v for k, v in VALID.items() if k != "photo_focus"}, "photo_focus"),
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


async def test_photo_framing_is_saved_and_public(admin_client: AsyncClient) -> None:
    await admin_client.put("/api/admin/home", json=VALID)

    admin = (await admin_client.get("/api/admin/home")).json()
    public = (await admin_client.get("/api/home", params={"lang": "fr"})).json()
    assert admin["photo_focus"] == public["photo_focus"] == {"x": 30, "y": 20}
