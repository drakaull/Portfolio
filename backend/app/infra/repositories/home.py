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
            photo_focus_x=row.photo_focus_x,
            photo_focus_y=row.photo_focus_y,
            contact_focus_x=row.contact_focus_x,
            contact_focus_y=row.contact_focus_y,
        )

    async def save(self, content: HomeContent) -> None:
        row = await self._session.get(HomeContentModel, 1) or HomeContentModel(id=1)
        row.headline = dict(content.headline)
        row.intro = dict(content.intro)
        row.linkedin_url = content.linkedin_url
        row.github_url = content.github_url
        row.photo_focus_x = content.photo_focus_x
        row.photo_focus_y = content.photo_focus_y
        row.contact_focus_x = content.contact_focus_x
        row.contact_focus_y = content.contact_focus_y
        self._session.add(row)
        await self._session.flush()

    async def commit(self) -> None:
        await self._session.commit()
