from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.auth import AdminUser
from app.infra.database import SessionFactory
from app.infra.repositories.admin import AdminRepository
from app.infra.repositories.home import HomeContentRepository
from app.infra.security import hash_token

ADMIN_COOKIE = "admin_session"


async def get_session() -> AsyncIterator[AsyncSession]:
    """One database session per request, closed when the response is sent."""
    async with SessionFactory() as session:
        yield session


def get_home_repository(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> HomeContentRepository:
    return HomeContentRepository(session)


def get_admin_repository(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> AdminRepository:
    return AdminRepository(session)


async def require_admin(
    repository: Annotated[AdminRepository, Depends(get_admin_repository)],
    token: Annotated[str | None, Cookie(alias=ADMIN_COOKIE)] = None,
) -> AdminUser:
    """The signed-in admin, or 401. Applied to every protected admin route."""
    user = token and await repository.get_session_user(hash_token(token), datetime.now(UTC))
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


def admin_router() -> APIRouter:
    """Router for admin routes: every route added to it requires a valid admin session."""
    return APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])
