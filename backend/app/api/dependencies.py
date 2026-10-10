from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.infra.database import SessionFactory
from app.infra.repositories.home import HomeContentRepository


async def get_session() -> AsyncIterator[AsyncSession]:
    """One database session per request, closed when the response is sent."""
    async with SessionFactory() as session:
        yield session


def get_home_repository(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> HomeContentRepository:
    return HomeContentRepository(session)
