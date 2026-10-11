from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.experience import Experience
from app.infra.models import ExperienceModel

# Most recent first; entries of the same years keep insertion order (newest first).
_ORDER = (
    ExperienceModel.start_year.desc(),
    ExperienceModel.end_year.desc().nulls_first(),
    ExperienceModel.id.desc(),
)


def _to_domain(row: ExperienceModel) -> Experience:
    return Experience(
        slug=row.slug,
        kind=row.kind,
        title=row.title,
        organization=row.organization,
        start_year=row.start_year,
        end_year=row.end_year,
        summary=row.summary,
        description=row.description,
        technologies=tuple(row.technologies),
    )


class ExperienceRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list(self) -> list[Experience]:
        rows = await self._session.scalars(select(ExperienceModel).order_by(*_ORDER))
        return [_to_domain(row) for row in rows]

    async def get(self, slug: str) -> Experience | None:
        row = await self._session.scalar(
            select(ExperienceModel).where(ExperienceModel.slug == slug)
        )
        return None if row is None else _to_domain(row)

    async def save_texts(self, entry: Experience) -> None:
        """Update the translated texts of an existing entry, found by slug."""
        row = await self._session.scalar(
            select(ExperienceModel).where(ExperienceModel.slug == entry.slug)
        )
        if row is None:
            raise LookupError(f"Unknown experience {entry.slug!r}")
        row.title = dict(entry.title)
        row.summary = dict(entry.summary)
        row.description = dict(entry.description)
        await self._session.flush()
