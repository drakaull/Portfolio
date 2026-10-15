from datetime import datetime

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.contact import ContactMessage
from app.infra.models import ContactMessageModel


def _to_domain(row: ContactMessageModel) -> ContactMessage:
    return ContactMessage(
        id=row.id,
        name=row.name,
        email=row.email,
        message=row.message,
        lang=row.lang,
        created_at=row.created_at,
        read=row.read,
    )


class ContactMessageRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, message: ContactMessage) -> ContactMessage:
        """Store a new message; returns it with its id and date."""
        row = ContactMessageModel(
            name=message.name, email=message.email, message=message.message, lang=message.lang
        )
        self._session.add(row)
        await self._session.flush()
        await self._session.refresh(row)
        return _to_domain(row)

    async def list(self) -> list[ContactMessage]:
        """Newest first."""
        rows = await self._session.scalars(
            select(ContactMessageModel).order_by(
                ContactMessageModel.created_at.desc(), ContactMessageModel.id.desc()
            )
        )
        return [_to_domain(row) for row in rows]

    async def get(self, message_id: int) -> ContactMessage | None:
        row = await self._session.get(ContactMessageModel, message_id)
        return None if row is None else _to_domain(row)

    async def set_read(self, message_id: int, read: bool) -> bool:
        """Mark the message read or unread; False when there is none."""
        row = await self._session.get(ContactMessageModel, message_id)
        if row is None:
            return False
        row.read = read
        await self._session.flush()
        return True

    async def delete(self, message_id: int) -> bool:
        """Delete the message; False when there was none."""
        row = await self._session.get(ContactMessageModel, message_id)
        if row is None:
            return False
        await self._session.delete(row)
        await self._session.flush()
        return True

    async def purge(self, older_than: datetime) -> int:
        """Delete the messages received before `older_than`; returns how many."""
        result = await self._session.execute(
            delete(ContactMessageModel).where(ContactMessageModel.created_at < older_than)
        )
        return result.rowcount

    async def unread_count(self) -> int:
        return await self._session.scalar(
            select(func.count()).select_from(ContactMessageModel).where(~ContactMessageModel.read)
        )

    async def commit(self) -> None:
        await self._session.commit()
