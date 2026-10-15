import anyio
import pytest
from alembic import command
from sqlalchemy.ext.asyncio import AsyncEngine

from tests.conftest import alembic_config

pytestmark = pytest.mark.anyio


async def test_migrations_upgrade_and_downgrade_cleanly(engine: AsyncEngine) -> None:
    # The engine fixture already ran "upgrade head"; prove every migration can be undone and redone.
    config = alembic_config()
    await anyio.to_thread.run_sync(command.downgrade, config, "base")
    await anyio.to_thread.run_sync(command.upgrade, config, "head")
