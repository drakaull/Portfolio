import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict, Field

from app.api.dependencies import get_contact_repository, get_mailer
from app.domain.contact import (
    EMAIL_MAX_LENGTH,
    MESSAGE_MAX_LENGTH,
    MESSAGE_MIN_LENGTH,
    NAME_MAX_LENGTH,
    RETENTION,
    ContactMessage,
)
from app.domain.language import Lang
from app.infra.mail import Mailer, MailUnavailable
from app.infra.rate_limit import contact_limiter
from app.infra.repositories.contact import ContactMessageRepository

logger = logging.getLogger(__name__)
router = APIRouter(tags=["contact"])

# "something@domain.tld" without spaces or line breaks; the real check is that a reply arrives.
_EMAIL = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
# No line break in what becomes an email header (name, Reply-To): no header injection.
_ONE_LINE = r"^[^\r\n]*$"


class ContactIn(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=NAME_MAX_LENGTH, pattern=_ONE_LINE)
    email: str = Field(max_length=EMAIL_MAX_LENGTH, pattern=_EMAIL)
    message: str = Field(min_length=MESSAGE_MIN_LENGTH, max_length=MESSAGE_MAX_LENGTH)
    lang: Lang
    # Trap: hidden from people, filled in by robots that complete every field.
    website: str = Field(default="", max_length=200)


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


@router.post("/contact", status_code=status.HTTP_204_NO_CONTENT)
async def send_message(
    body: ContactIn,
    request: Request,
    repository: Annotated[ContactMessageRepository, Depends(get_contact_repository)],
    mailer: Annotated[Mailer, Depends(get_mailer)],
) -> Response:
    if body.website:
        # A robot: it is told "sent" so it does not adapt, but nothing is kept or emailed.
        logger.info("Contact message dropped by the trap field")
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    ip = _client_ip(request)
    if contact_limiter.is_blocked(ip):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many messages; try again later"
        )
    contact_limiter.record_failure(ip)  # every accepted message counts towards the limit

    message = await repository.add(
        ContactMessage(
            id=None,
            name=body.name,
            email=body.email,
            message=body.message,
            lang=body.lang,
            created_at=None,
            read=False,
        )
    )
    assert message.created_at is not None  # set by the database on insert
    await repository.purge(message.created_at - RETENTION)
    # Saved before emailing: an email failure never loses a message.
    await repository.commit()

    try:
        await mailer.send(message)
    except MailUnavailable as error:
        logger.warning("Contact message %s saved but not emailed: %s", message.id, error)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
