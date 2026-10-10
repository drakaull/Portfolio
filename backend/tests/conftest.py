from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import make_url, text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine

from app.api.dependencies import get_session
from app.infra.config import settings
from app.main import app

TEST_DATABASE = "portfolio_test"
TEST_DATABASE_URL = make_url(settings.database_url).set(database=TEST_DATABASE)

# Never let a test touch the development database (tests roll back, but CREATE/DROP are not undone).
assert make_url(settings.database_url).database != TEST_DATABASE, (
    "DATABASE_URL must not be the test DB"
)


@pytest.fixture(scope="session")
def anyio_backend() -> str:
    return "asyncio"


async def _create_test_database() -> None:
    # CREATE DATABASE cannot run inside a transaction, hence AUTOCOMMIT on the dev database.
    admin = create_async_engine(settings.database_url, isolation_level="AUTOCOMMIT")
    async with admin.connect() as conn:
        exists = await conn.scalar(
            text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": TEST_DATABASE}
        )
        if not exists:
            await conn.execute(text(f'CREATE DATABASE "{TEST_DATABASE}"'))
    await admin.dispose()


@pytest.fixture(scope="session")
async def engine() -> AsyncIterator[AsyncEngine]:
    await _create_test_database()
    test_engine = create_async_engine(TEST_DATABASE_URL)
    yield test_engine
    await test_engine.dispose()


@pytest.fixture
async def session(engine: AsyncEngine) -> AsyncIterator[AsyncSession]:
    """Session whose work is rolled back after the test, even if the code under test commits."""
    async with engine.connect() as conn:
        transaction = await conn.begin()
        test_session = AsyncSession(
            bind=conn, join_transaction_mode="create_savepoint", expire_on_commit=False
        )
        yield test_session
        await test_session.close()
        await transaction.rollback()


@pytest.fixture
async def client(session: AsyncSession) -> AsyncIterator[AsyncClient]:
    async def override_get_session() -> AsyncIterator[AsyncSession]:
        yield session

    app.dependency_overrides[get_session] = override_get_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as http:
        yield http
    app.dependency_overrides.clear()
