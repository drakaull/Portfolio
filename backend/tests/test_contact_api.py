from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_mailer
from app.domain.contact import ContactMessage
from app.infra.mail import MailUnavailable
from app.infra.models import ContactMessageModel
from app.infra.rate_limit import contact_limiter
from app.main import app
from tests.conftest import assert_committed

pytestmark = pytest.mark.anyio

URL = "/api/contact"
OWNER_EMAIL = "owner-secret@example.com"
BODY = {
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "message": "Bonjour, une question sur votre parcours.",
    "lang": "fr",
}


class FakeMailer:
    def __init__(self) -> None:
        self.sent: list[ContactMessage] = []
        self.fail = False

    async def send(self, message: ContactMessage) -> None:
        if self.fail:
            raise MailUnavailable("fake failure")
        self.sent.append(message)


@pytest.fixture(autouse=True)
def mailer() -> Iterator[FakeMailer]:
    fake = FakeMailer()
    app.dependency_overrides[get_mailer] = lambda: fake
    contact_limiter.reset()
    yield fake
    contact_limiter.reset()
    app.dependency_overrides.pop(get_mailer, None)


async def inbox(client: AsyncClient) -> dict:
    return (await client.get("/api/admin/messages")).json()


async def test_message_is_saved_then_emailed(
    admin_client: AsyncClient, session: AsyncSession, mailer: FakeMailer
) -> None:
    response = await admin_client.post(URL, json={**BODY, "name": "  Ada Lovelace "})
    assert_committed(session)

    assert response.status_code == 204
    [sent] = mailer.sent
    assert (sent.name, sent.email, sent.lang) == ("Ada Lovelace", "ada@example.com", "fr")
    saved = await inbox(admin_client)
    assert saved["unread"] == 1
    assert saved["messages"][0]["message"] == BODY["message"]


async def test_email_failure_keeps_the_message(
    admin_client: AsyncClient, mailer: FakeMailer, caplog: pytest.LogCaptureFixture
) -> None:
    mailer.fail = True

    response = await admin_client.post(URL, json=BODY)

    assert response.status_code == 204
    assert len((await inbox(admin_client))["messages"]) == 1
    assert "saved but not emailed" in caplog.text


async def test_trap_field_drops_the_message_silently(
    admin_client: AsyncClient, mailer: FakeMailer
) -> None:
    response = await admin_client.post(URL, json={**BODY, "leave_empty": "http://spam.example"})

    assert response.status_code == 204  # the robot believes it worked
    assert mailer.sent == []
    assert (await inbox(admin_client))["messages"] == []


async def test_sixth_message_within_an_hour_is_refused(
    client: AsyncClient, mailer: FakeMailer
) -> None:
    for _ in range(5):
        assert (await client.post(URL, json=BODY)).status_code == 204

    response = await client.post(URL, json=BODY)

    assert response.status_code == 429
    assert len(mailer.sent) == 5


@pytest.mark.parametrize(
    ("changes", "field"),
    [
        ({"name": " "}, "name"),
        ({"name": "x" * 101}, "name"),
        ({"name": "Ada\nBcc: victim@example.com"}, "name"),  # header injection
        ({"email": "not-an-email"}, "email"),
        ({"email": "ada@example.com\nBcc: victim@example.com"}, "email"),
        ({"email": "a" * 250 + "@x.be"}, "email"),
        ({"message": "too short"}, "message"),
        ({"message": "x" * 5001}, "message"),
        ({"lang": "de"}, "lang"),
        ({"extra": 1}, "extra"),
    ],
)
async def test_invalid_messages_are_refused(
    client: AsyncClient, mailer: FakeMailer, changes: dict, field: str
) -> None:
    response = await client.post(URL, json={**BODY, **changes})

    assert response.status_code == 422
    assert any(error["loc"][-1] == field for error in response.json()["detail"])
    assert mailer.sent == []


async def test_inbox_read_unread_delete(admin_client: AsyncClient, session: AsyncSession) -> None:
    await admin_client.post(URL, json=BODY)
    [message] = (await inbox(admin_client))["messages"]
    url = f"/api/admin/messages/{message['id']}"

    opened = (await admin_client.get(url)).json()
    assert_committed(session)
    assert opened["read"] is True
    assert (await inbox(admin_client))["unread"] == 0

    assert (await admin_client.put(f"{url}/read", json={"read": False})).status_code == 204
    assert (await inbox(admin_client))["unread"] == 1

    assert (await admin_client.delete(url)).status_code == 204
    assert (await inbox(admin_client))["messages"] == []
    assert (await admin_client.get(url)).status_code == 404
    assert (await admin_client.delete(url)).status_code == 404
    assert (await admin_client.put(f"{url}/read", json={"read": True})).status_code == 404


async def test_messages_older_than_a_year_are_purged(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    await admin_client.post(URL, json={**BODY, "name": "Old"})
    await session.execute(
        update(ContactMessageModel).values(created_at=datetime.now(UTC) - timedelta(days=366))
    )
    await admin_client.post(URL, json={**BODY, "name": "Recent"})

    names = [message["name"] for message in (await inbox(admin_client))["messages"]]

    assert names == ["Recent"]


async def test_owner_address_is_never_returned(
    admin_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.infra.config import settings

    monkeypatch.setattr(settings, "contact_email", OWNER_EMAIL)
    sent = await admin_client.post(URL, json=BODY)
    listed = await admin_client.get("/api/admin/messages")
    opened = await admin_client.get(f"/api/admin/messages/{listed.json()['messages'][0]['id']}")

    for response in (sent, listed, opened):
        assert OWNER_EMAIL not in response.text
