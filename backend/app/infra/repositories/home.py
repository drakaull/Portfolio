from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.home import HomeContent
from app.infra.models import HomeContentModel


class HomeContentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self) -> HomeContent | None:
        row = await self._session.get(HomeContentModel, 1)
        if row is None:
            return None
        return HomeContent(
            headline=row.headline,
            intro=row.intro,
            linkedin_url=row.linkedin_url,
            github_url=row.github_url,
        )
