import pytest
from sqlalchemy import delete, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.home import HomeContent
from app.infra.models import HomeContentModel
from app.infra.repositories.home import HomeContentRepository

pytestmark = pytest.mark.anyio

VALID = {"en": "x", "fr": "x"}


async def test_get_returns_the_placeholder_as_a_domain_entity(session: AsyncSession) -> None:
    content = await HomeContentRepository(session).get()

    assert isinstance(content, HomeContent)
    assert content.headline == {"en": "Fullstack developer", "fr": "Développeur fullstack"}
    assert content.github_url == "https://github.com/drakaull"


async def test_get_returns_none_without_a_row(session: AsyncSession) -> None:
    await session.execute(delete(HomeContentModel))

    assert await HomeContentRepository(session).get() is None


@pytest.mark.parametrize(
    "row",
    [
        {"id": 2, "headline": VALID, "intro": VALID},  # a second home page
        {"id": 1, "headline": {"en": "x"}, "intro": VALID},  # headline without French
        {"id": 1, "headline": VALID, "intro": {"fr": "x"}},  # intro without English
    ],
)
async def test_database_rejects_invalid_rows(session: AsyncSession, row: dict) -> None:
    await session.execute(delete(HomeContentModel))
    session.add(HomeContentModel(**row, linkedin_url="https://l", github_url="https://g"))

    with pytest.raises(IntegrityError):
        await session.flush()


# The two tests below run in file order: the second proves the first one's change was rolled back.
async def test_isolation_writes_data(session: AsyncSession) -> None:
    await session.execute(update(HomeContentModel).values(github_url="https://changed"))
    await session.commit()


async def test_isolation_previous_write_was_rolled_back(session: AsyncSession) -> None:
    content = await HomeContentRepository(session).get()

    assert content is not None
    assert content.github_url == "https://github.com/drakaull"
