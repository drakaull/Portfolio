import os
import smtplib
from datetime import UTC, datetime
from email.message import EmailMessage

import pytest

from app.domain.contact import ContactMessage
from app.infra import mail
from app.infra.mail import Mailer, MailUnavailable

pytestmark = pytest.mark.anyio

MESSAGE = ContactMessage(
    id=1,
    name="Zoë Dupont",
    email="zoe@example.com",
    message="Bonjour,\nune offre pour vous.",
    lang="fr",
    created_at=datetime(2026, 10, 12, tzinfo=UTC),
    read=False,
)


class FakeSMTP:
    """Records what the mailer does instead of talking to a server."""

    instances: list["FakeSMTP"] = []
    fail_with: Exception | None = None

    def __init__(self, host: str, port: int, timeout: float) -> None:
        if FakeSMTP.fail_with:
            raise FakeSMTP.fail_with
        self.address = (host, port, timeout)
        self.calls: list[tuple] = []
        FakeSMTP.instances.append(self)

    def __enter__(self) -> "FakeSMTP":
        return self

    def __exit__(self, *args: object) -> None:
        self.calls.append(("quit",))

    def starttls(self, context: object) -> None:
        self.calls.append(("starttls",))

    def login(self, username: str, password: str) -> None:
        self.calls.append(("login", username, password))

    def send_message(self, email: EmailMessage) -> None:
        self.calls.append(("send", email))


@pytest.fixture(autouse=True)
def fake_smtp(monkeypatch: pytest.MonkeyPatch) -> None:
    FakeSMTP.instances = []
    FakeSMTP.fail_with = None
    monkeypatch.setattr(mail.smtplib, "SMTP", FakeSMTP)


def mailer(**changes: object) -> Mailer:
    values = {
        "host": "mail.example.com",
        "port": 587,
        "sender": "portfolio@example.com",
        "recipient": "owner@example.com",
    } | changes
    return Mailer(**values)


def test_email_replies_to_the_visitor_and_comes_from_the_site() -> None:
    email = mailer().build(MESSAGE)

    assert email["From"] == "portfolio@example.com"
    assert email["To"] == "owner@example.com"
    assert email["Reply-To"] == "zoe@example.com"
    assert email["Subject"] == "Portfolio — message from Zoë Dupont"
    body = email.get_content()
    assert "Zoë Dupont <zoe@example.com>" in body
    assert "Bonjour,\nune offre pour vous." in body


async def test_sends_through_smtp_in_a_thread() -> None:
    await mailer().send(MESSAGE)

    [smtp] = FakeSMTP.instances
    assert smtp.address == ("mail.example.com", 587, 10)
    assert [call[0] for call in smtp.calls] == ["send", "quit"]


async def test_starttls_and_login_when_configured() -> None:
    await mailer(username="user", password="secret", starttls=True).send(MESSAGE)

    [smtp] = FakeSMTP.instances
    assert [call[0] for call in smtp.calls] == ["starttls", "login", "send", "quit"]
    assert smtp.calls[1] == ("login", "user", "secret")


@pytest.mark.parametrize(
    "error",
    [ConnectionRefusedError(), TimeoutError(), smtplib.SMTPRecipientsRefused({})],
)
async def test_failures_become_mail_unavailable(error: Exception) -> None:
    FakeSMTP.fail_with = error

    with pytest.raises(MailUnavailable):
        await mailer().send(MESSAGE)


async def test_without_recipient_nothing_is_sent() -> None:
    with pytest.raises(MailUnavailable, match="CONTACT_EMAIL"):
        await mailer(recipient=None).send(MESSAGE)
    assert FakeSMTP.instances == []


@pytest.mark.skipif(not os.environ.get("MAILPIT_LIVE_TEST"), reason="set MAILPIT_LIVE_TEST=1")
async def test_live_mailpit(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.undo()  # the real smtplib
    await Mailer("localhost", 1025, "portfolio@localhost", "owner@localhost").send(MESSAGE)
