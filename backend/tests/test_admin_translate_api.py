import pytest
from httpx import AsyncClient

from tests.conftest import FakeTranslator

pytestmark = pytest.mark.anyio

ITEMS = [
    {"text": "Développeur fullstack", "format": "plain"},
    {"text": "Je suis **développeur**.", "format": "markdown"},
]


async def test_translates_items_in_order(
    admin_client: AsyncClient, fake_translator: FakeTranslator
) -> None:
    response = await admin_client.post(
        "/api/admin/translate", json={"target": "en", "items": ITEMS}
    )

    assert response.status_code == 200
    assert response.json() == {
        "translations": ["[en] Développeur fullstack", "[en] Je suis **développeur**."]
    }
    assert fake_translator.calls == [
        ([("Développeur fullstack", "plain"), ("Je suis **développeur**.", "markdown")], "en")
    ]


async def test_reports_unavailable_translation(
    admin_client: AsyncClient, fake_translator: FakeTranslator
) -> None:
    fake_translator.fail = True

    response = await admin_client.post(
        "/api/admin/translate", json={"target": "en", "items": ITEMS}
    )

    assert response.status_code == 503
    assert response.json() == {"detail": "Translation unavailable"}


async def test_without_a_key_translation_is_unavailable(admin_client: AsyncClient) -> None:
    # No fake: the real translator runs with the key removed by the test setup (no network call).
    response = await admin_client.post(
        "/api/admin/translate", json={"target": "en", "items": ITEMS}
    )

    assert response.status_code == 503


@pytest.mark.parametrize(
    "body",
    [
        {"target": "en", "items": []},
        {"target": "en", "items": [{"text": "x", "format": "plain"}] * 11},
        {"target": "en", "items": [{"text": "x" * 5001, "format": "plain"}]},
        {"target": "en", "items": [{"text": "x", "format": "html"}]},
        {"target": "de", "items": ITEMS},
        {"target": "fr", "items": ITEMS},
        {"target": "en", "items": ITEMS, "extra": True},
    ],
    ids=["no-items", "too-many", "too-long", "bad-format", "unknown-lang", "source-lang", "extra"],
)
async def test_rejects_invalid_requests(
    admin_client: AsyncClient, fake_translator: FakeTranslator, body: dict
) -> None:
    response = await admin_client.post("/api/admin/translate", json=body)

    assert response.status_code == 422
    assert fake_translator.calls == []
