from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.infra.models import AdminSessionModel, AdminUserModel
from app.infra.repositories.admin import AdminRepository

pytestmark = pytest.mark.anyio

NOW = datetime(2026, 1, 1, 12, tzinfo=UTC)


async def test_save_user_creates_then_reads_credentials(session: AsyncSession) -> None:
    repo = AdminRepository(session)
    user = await repo.save_user("leonard", "hash-1")

    assert await repo.get_credentials("leonard") == (user, "hash-1")
    assert await repo.get_credentials("unknown") is None


async def test_usernames_are_unique(session: AsyncSession) -> None:
    session.add_all(
        [
            AdminUserModel(username="leonard", password_hash="a"),
            AdminUserModel(username="leonard", password_hash="b"),
        ]
    )
    with pytest.raises(IntegrityError):
        await session.flush()


async def test_valid_session_returns_its_user(session: AsyncSession) -> None:
    repo = AdminRepository(session)
    user = await repo.save_user("leonard", "hash")
    await repo.create_session(user, "token-hash", NOW + timedelta(hours=1))

    assert await repo.get_session_user("token-hash", NOW) == user
    assert await repo.get_session_user("other-hash", NOW) is None


async def test_expired_or_deleted_session_gives_no_user(session: AsyncSession) -> None:
    repo = AdminRepository(session)
    user = await repo.save_user("leonard", "hash")
    await repo.create_session(user, "expired", NOW)
    await repo.create_session(user, "deleted", NOW + timedelta(hours=1))

    await repo.delete_session("deleted")

    assert await repo.get_session_user("expired", NOW) is None
    assert await repo.get_session_user("deleted", NOW) is None


async def test_password_change_revokes_all_sessions(session: AsyncSession) -> None:
    repo = AdminRepository(session)
    user = await repo.save_user("leonard", "old-hash")
    await repo.create_session(user, "token-hash", NOW + timedelta(hours=1))

    await repo.save_user("leonard", "new-hash")

    assert await repo.get_session_user("token-hash", NOW) is None
    assert (await repo.get_credentials("leonard"))[1] == "new-hash"


async def test_delete_expired_sessions_keeps_valid_ones(session: AsyncSession) -> None:
    repo = AdminRepository(session)
    user = await repo.save_user("leonard", "hash")
    await repo.create_session(user, "expired", NOW - timedelta(minutes=1))
    await repo.create_session(user, "valid", NOW + timedelta(hours=1))

    await repo.delete_expired_sessions(NOW)

    hashes = await session.scalars(select(AdminSessionModel.token_hash))
    assert list(hashes) == ["valid"]


async def test_sessions_are_deleted_with_their_user(session: AsyncSession) -> None:
    repo = AdminRepository(session)
    user = await repo.save_user("leonard", "hash")
    await repo.create_session(user, "token-hash", NOW + timedelta(hours=1))

    await session.execute(delete(AdminUserModel))

    assert await session.scalar(select(func.count()).select_from(AdminSessionModel)) == 0
