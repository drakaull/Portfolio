from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict

from app.api.dependencies import admin_router, get_contact_repository
from app.domain.contact import RETENTION, ContactMessage
from app.domain.language import Lang
from app.infra.repositories.contact import ContactMessageRepository

router = admin_router()

Repository = Annotated[ContactMessageRepository, Depends(get_contact_repository)]


class MessageOut(BaseModel):
    id: int
    name: str
    email: str
    message: str
    lang: Lang
    created_at: datetime
    read: bool

    @classmethod
    def from_domain(cls, message: ContactMessage) -> "MessageOut":
        assert message.id is not None and message.created_at is not None  # stored messages
        return cls(
            id=message.id,
            name=message.name,
            email=message.email,
            message=message.message,
            lang=message.lang,
            created_at=message.created_at,
            read=message.read,
        )


class InboxOut(BaseModel):
    unread: int
    messages: list[MessageOut]  # newest first


class ReadIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    read: bool


def _not_found() -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, detail="Message not found")


@router.get("/messages")
async def inbox(repository: Repository) -> InboxOut:
    # Messages are kept 12 months (privacy page): older ones go before anyone reads the list.
    await repository.purge(datetime.now(UTC) - RETENTION)
    await repository.commit()
    return InboxOut(
        unread=await repository.unread_count(),
        messages=[MessageOut.from_domain(message) for message in await repository.list()],
    )


@router.get("/messages/{message_id}")
async def read_message(message_id: int, repository: Repository) -> MessageOut:
    """The message, now marked as read."""
    if not await repository.set_read(message_id, True):
        raise _not_found()
    message = await repository.get(message_id)
    assert message is not None
    await repository.commit()
    return MessageOut.from_domain(message)


@router.put("/messages/{message_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def set_read(message_id: int, body: ReadIn, repository: Repository) -> None:
    if not await repository.set_read(message_id, body.read):
        raise _not_found()
    await repository.commit()


@router.delete("/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(message_id: int, repository: Repository) -> None:
    if not await repository.delete(message_id):
        raise _not_found()
    await repository.commit()
