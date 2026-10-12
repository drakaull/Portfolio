import smtplib
import ssl
from email.message import EmailMessage

import anyio

from app.domain.contact import ContactMessage

_TIMEOUT_SECONDS = 10


class MailUnavailable(Exception):
    """The email could not be sent: not configured, server unreachable, refused or timed out."""


class Mailer:
    """Sends contact messages to the site owner by SMTP (Mailpit locally).

    `smtplib` is blocking, so sending runs in a worker thread and never stalls the server.
    """

    def __init__(
        self,
        host: str,
        port: int,
        sender: str,
        recipient: str | None,
        username: str | None = None,
        password: str | None = None,
        starttls: bool = False,
    ) -> None:
        self._host = host
        self._port = port
        self._sender = sender
        self._recipient = recipient
        self._username = username
        self._password = password
        self._starttls = starttls

    def build(self, message: ContactMessage) -> EmailMessage:
        """Plain-text email; answering it replies to the visitor (Reply-To), while From stays the
        site's own address. Name and email never contain line breaks (validated), so no header
        can be injected; EmailMessage encodes non-ASCII names."""
        email = EmailMessage()
        email["Subject"] = f"Portfolio — message from {message.name}"
        email["From"] = self._sender
        email["To"] = self._recipient or ""
        email["Reply-To"] = message.email
        email.set_content(
            f"From: {message.name} <{message.email}>\n"
            f"Page language: {message.lang}\n\n"
            f"{message.message}\n"
        )
        return email

    async def send(self, message: ContactMessage) -> None:
        if not self._recipient:
            raise MailUnavailable("CONTACT_EMAIL is not configured")
        await anyio.to_thread.run_sync(self._send, self.build(message))

    def _send(self, email: EmailMessage) -> None:
        try:
            with smtplib.SMTP(self._host, self._port, timeout=_TIMEOUT_SECONDS) as smtp:
                if self._starttls:
                    smtp.starttls(context=ssl.create_default_context())
                if self._username:
                    smtp.login(self._username, self._password or "")
                smtp.send_message(email)
        except (smtplib.SMTPException, OSError) as error:  # OSError: refused, timeout, DNS
            raise MailUnavailable(f"SMTP failed: {type(error).__name__}") from error
