from collections.abc import AsyncIterator
from pathlib import Path

import anyio
import pytest
from alembic import command
from alembic.config import Config
from httpx import ASGITransport, AsyncClient
from sqlalchemy import make_url, text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine

from app.api.dependencies import get_session
from app.infra.config import settings
from app.infra.repositories.admin import AdminRepository
from app.infra.security import hash_password
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


@pytest.fixture(autouse=True)
def storage_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Empty storage folder per test, so a real CV in backend/storage never affects tests."""
    monkeypatch.setattr(settings, "storage_dir", tmp_path)
    return tmp_path


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


def alembic_config() -> Config:
    """Alembic config targeting the test database."""
    config = Config("alembic.ini")
    url = TEST_DATABASE_URL.render_as_string(hide_password=False)
    config.set_main_option("sqlalchemy.url", url.replace("%", "%%"))
    return config


@pytest.fixture(scope="session")
async def engine() -> AsyncIterator[AsyncEngine]:
    await _create_test_database()
    # Alembic's env.py calls asyncio.run(), which cannot run inside this event loop: use a thread.
    await anyio.to_thread.run_sync(command.upgrade, alembic_config(), "head")
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
    async with AsyncClient(transport=ASGITransport(app=app), base_url="https://test") as http:
        yield http
    app.dependency_overrides.clear()


ADMIN_PASSWORD = "correct horse battery"


@pytest.fixture
async def admin_client(client: AsyncClient, session: AsyncSession) -> AsyncClient:
    """HTTP client already signed in as the admin."""
    await AdminRepository(session).save_user("leonard", hash_password(ADMIN_PASSWORD))
    response = await client.post(
        "/api/admin/login", json={"username": "leonard", "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 204
    return client
