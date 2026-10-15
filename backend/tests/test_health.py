from collections.abc import AsyncIterator

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.api.dependencies import get_session
from app.main import app

pytestmark = pytest.mark.anyio


async def test_health_reports_database_ok(client: AsyncClient) -> None:
    response = await client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


async def test_health_reports_unreachable_database_without_details(client: AsyncClient) -> None:
    # Nothing listens on port 1: the connection is refused, like a stopped database.
    unreachable = create_async_engine("postgresql+asyncpg://user:secret@127.0.0.1:1/none")

    async def broken_session() -> AsyncIterator[AsyncSession]:
        async with async_sessionmaker(unreachable)() as session:
            yield session

    app.dependency_overrides[get_session] = broken_session
    response = await client.get("/api/health")
    await unreachable.dispose()

    assert response.status_code == 503
    assert response.json() == {"status": "degraded", "database": "unreachable"}
