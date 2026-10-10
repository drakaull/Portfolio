from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.auth import AdminUser
from app.infra.models import AdminSessionModel, AdminUserModel


def _to_domain(row: AdminUserModel) -> AdminUser:
    return AdminUser(id=row.id, username=row.username)


class AdminRepository:
    """Admin accounts and their sessions. The caller decides when to commit."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_credentials(self, username: str) -> tuple[AdminUser, str] | None:
        """The user and their password hash, or None if the username is unknown."""
        row = await self._session.scalar(
            select(AdminUserModel).where(AdminUserModel.username == username)
        )
        return None if row is None else (_to_domain(row), row.password_hash)

    async def save_user(self, username: str, password_hash: str) -> AdminUser:
        """Create the user, or change their password and revoke all their sessions."""
        row = await self._session.scalar(
            select(AdminUserModel).where(AdminUserModel.username == username)
        )
        if row is None:
            row = AdminUserModel(username=username, password_hash=password_hash)
            self._session.add(row)
        else:
            row.password_hash = password_hash
            await self._session.execute(
                delete(AdminSessionModel).where(AdminSessionModel.admin_user_id == row.id)
            )
        await self._session.flush()
        return _to_domain(row)

    async def create_session(self, user: AdminUser, token_hash: str, expires_at: datetime) -> None:
        self._session.add(
            AdminSessionModel(token_hash=token_hash, admin_user_id=user.id, expires_at=expires_at)
        )
        await self._session.flush()

    async def get_session_user(self, token_hash: str, now: datetime) -> AdminUser | None:
        """The user owning this session, if it exists and has not expired."""
        row = await self._session.scalar(
            select(AdminUserModel)
            .join(AdminSessionModel)
            .where(AdminSessionModel.token_hash == token_hash, AdminSessionModel.expires_at > now)
        )
        return None if row is None else _to_domain(row)

    async def delete_session(self, token_hash: str) -> None:
        await self._session.execute(
            delete(AdminSessionModel).where(AdminSessionModel.token_hash == token_hash)
        )

    async def commit(self) -> None:
        await self._session.commit()

    async def delete_expired_sessions(self, now: datetime) -> None:
        await self._session.execute(
            delete(AdminSessionModel).where(AdminSessionModel.expires_at <= now)
        )
