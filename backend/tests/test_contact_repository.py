from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import inspect, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.contact import ContactMessage
from app.infra.models import ContactMessageModel
from app.infra.repositories.contact import ContactMessageRepository

pytestmark = pytest.mark.anyio


def message(name: str = "Ada", **changes: object) -> ContactMessage:
    values = {
        "id": None,
        "name": name,
        "email": "ada@example.com",
        "message": "Bonjour, une question sur votre parcours.",
        "lang": "fr",
        "created_at": None,
        "read": False,
    } | changes
    return ContactMessage(**values)


async def test_add_list_newest_first_and_get(session: AsyncSession) -> None:
    repository = ContactMessageRepository(session)

    first = await repository.add(message("First"))
    second = await repository.add(message("Second"))

    assert first.id is not None and first.created_at is not None
    assert first.read is False
    assert [entry.name for entry in await repository.list()] == ["Second", "First"]
    assert await repository.get(second.id) == second
    assert await repository.get(999_999) is None


async def test_read_flag_unread_count_and_delete(session: AsyncSession) -> None:
    repository = ContactMessageRepository(session)
    first = await repository.add(message("First"))
    await repository.add(message("Second"))

    assert await repository.set_read(first.id, True) is True
    assert await repository.unread_count() == 1
    assert (await repository.get(first.id)).read is True
    assert await repository.set_read(999_999, True) is False

    assert await repository.delete(first.id) is True
    assert await repository.delete(first.id) is False
    assert [entry.name for entry in await repository.list()] == ["Second"]


async def test_purge_deletes_only_older_messages(session: AsyncSession) -> None:
    repository = ContactMessageRepository(session)
    old = await repository.add(message("Old"))
    await repository.add(message("Recent"))
    now = datetime.now(UTC)
    await session.execute(
        update(ContactMessageModel)
        .where(ContactMessageModel.id == old.id)
        .values(created_at=now - timedelta(days=400))
    )

    assert await repository.purge(now - timedelta(days=365)) == 1
    assert [entry.name for entry in await repository.list()] == ["Recent"]


def test_no_ip_address_is_stored() -> None:
    columns = {column.key for column in inspect(ContactMessageModel).columns}
    assert columns == {"id", "name", "email", "message", "lang", "created_at", "read"}
