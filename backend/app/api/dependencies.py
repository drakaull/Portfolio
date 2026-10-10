from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession

from app.infra.database import SessionFactory


async def get_session() -> AsyncIterator[AsyncSession]:
    """One database session per request, closed when the response is sent."""
    async with SessionFactory() as session:
        yield session
