import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import FakeTranslator, assert_committed

pytestmark = [pytest.mark.anyio, pytest.mark.usefixtures("fake_translator")]

NEW = {
    "slug": "acme-developer",
    "kind": "job",
    "organization": "Acme",
    "start_year": 2027,
    "end_year": None,
    "technologies": ["Python", "React", "Python"],
    "title": {"fr": "Développeur", "en": "Developer"},
    "summary": {"fr": "Je développe des **applications**."},
    "description": {"fr": "## Missions\n\n- API"},
}
URL = "/api/admin/experiences"


def without_slug(body: dict) -> dict:
    return {key: value for key, value in body.items() if key != "slug"}


async def test_list_has_every_language_in_public_order(admin_client: AsyncClient) -> None:
    entries = (await admin_client.get(URL)).json()

    public = (await admin_client.get("/api/experiences", params={"lang": "fr"})).json()
    assert [entry["slug"] for entry in entries] == [entry["slug"] for entry in public]
    assert set(entries[0]["title"]) == {"fr", "en", "nl"}


async def test_get_one_or_404(admin_client: AsyncClient) -> None:
    entry = (await admin_client.get(f"{URL}/icare-internship-2026")).json()
    assert entry["title"] == {"fr": "Ingénieur R&D", "en": "R&D Engineer", "nl": ""}

    assert (await admin_client.get(f"{URL}/unknown")).status_code == 404


async def test_created_entry_is_public_and_translated(
    admin_client: AsyncClient, session: AsyncSession, fake_translator: FakeTranslator
) -> None:
    response = await admin_client.post(URL, json=NEW)
    assert_committed(session)

    assert response.status_code == 201
    saved = response.json()
    assert saved["technologies"] == ["Python", "React"]  # duplicate removed
    assert saved["title"] == {"fr": "Développeur", "en": "Developer", "nl": "[nl] Développeur"}
    assert saved["summary"]["en"] == "[en] Je développe des **applications**."
    assert saved["auto_translated"] == ["en", "nl"]
    assert saved["translation_failed"] is False
    public = (await admin_client.get("/api/experiences", params={"lang": "nl"})).json()
    assert public[0]["slug"] == "acme-developer"  # ongoing 2027: top of the timeline
    assert public[0]["title"] == "[nl] Développeur"


async def test_creating_a_taken_slug_is_refused(
    admin_client: AsyncClient, fake_translator: FakeTranslator
) -> None:
    response = await admin_client.post(URL, json={**NEW, "slug": "icare-internship-2026"})

    assert response.status_code == 409
    assert fake_translator.calls == []  # refused before spending DeepL characters


async def test_update_replaces_everything_but_the_slug(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    await admin_client.post(URL, json=NEW)
    changes = {
        **without_slug(NEW),
        "kind": "internship",
        "end_year": 2028,
        "title": {"fr": "Stagiaire", "en": "Intern", "nl": "Stagiair"},
    }

    response = await admin_client.put(f"{URL}/acme-developer", json=changes)
    assert_committed(session)

    assert response.status_code == 200
    entry = (await admin_client.get(f"{URL}/acme-developer")).json()
    assert entry["kind"] == "internship"
    assert entry["end_year"] == 2028
    assert entry["title"] == {"fr": "Stagiaire", "en": "Intern", "nl": "Stagiair"}


async def test_slug_cannot_change_on_update(admin_client: AsyncClient) -> None:
    response = await admin_client.put(
        f"{URL}/icare-internship-2026", json={**NEW, "slug": "renamed"}
    )

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"][-1] == "slug"


async def test_updating_an_unknown_entry_is_404(
    admin_client: AsyncClient, fake_translator: FakeTranslator
) -> None:
    assert (await admin_client.put(f"{URL}/unknown", json=without_slug(NEW))).status_code == 404
    assert fake_translator.calls == []


async def test_written_translations_are_kept(
    admin_client: AsyncClient, fake_translator: FakeTranslator
) -> None:
    body = {
        **NEW,
        "title": {"fr": "Développeur", "en": "Developer", "nl": "Ontwikkelaar"},
        "summary": {"fr": "Résumé", "en": "Summary", "nl": "Samenvatting"},
        "description": {"fr": "", "en": "", "nl": ""},
    }

    saved = (await admin_client.post(URL, json=body)).json()

    assert saved["auto_translated"] == []
    assert fake_translator.calls == []  # nothing to translate: empty description stays empty


async def test_saving_works_when_translation_fails(
    admin_client: AsyncClient, fake_translator: FakeTranslator
) -> None:
    fake_translator.fail = True

    response = await admin_client.post(URL, json=NEW)

    assert response.status_code == 201
    assert response.json()["translation_failed"] is True
    public = (await admin_client.get("/api/experiences", params={"lang": "nl"})).json()
    assert public[0]["title"] == "Développeur"  # French shown meanwhile


async def test_delete_removes_the_entry_everywhere(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    response = await admin_client.delete(f"{URL}/icare-internship-2026")
    assert_committed(session)

    assert response.status_code == 204
    public = await admin_client.get("/api/experiences/icare-internship-2026", params={"lang": "en"})
    assert public.status_code == 404
    assert (await admin_client.delete(f"{URL}/icare-internship-2026")).status_code == 404


@pytest.mark.parametrize(
    ("changes", "field"),
    [
        ({"kind": "freelance"}, "kind"),
        ({"organization": "  "}, "organization"),
        ({"organization": "x" * 121}, "organization"),
        ({"start_year": 1949}, "start_year"),
        ({"end_year": 2101}, "end_year"),
        ({"start_year": 2022, "end_year": 2021}, "end_year"),
        ({"slug": "Not A Slug"}, "slug"),
        ({"slug": "x" * 81}, "slug"),
        ({"slug": "new"}, "slug"),  # the creation page's address
        ({"technologies": ["x"] * 16}, "technologies"),
        ({"technologies": ["x" * 41]}, 0),
        ({"technologies": [" "]}, 0),
        ({"title": {"fr": ""}}, "fr"),
        ({"title": {"fr": "x" * 121}}, "fr"),
        ({"summary": {"fr": "x", "nl": "x" * 221}}, "nl"),
        ({"description": {"fr": "x" * 5001}}, "fr"),
        ({"title": {"fr": "x", "de": "x"}}, "de"),
        ({"unknown": 1}, "unknown"),
    ],
)
async def test_invalid_entries_are_refused(
    admin_client: AsyncClient, changes: dict, field: str | int
) -> None:
    response = await admin_client.post(URL, json={**NEW, **changes})

    assert response.status_code == 422
    assert any(error["loc"][-1] == field for error in response.json()["detail"])
    assert (await admin_client.get(f"{URL}/acme-developer")).status_code == 404
