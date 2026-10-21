from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.experience import Experience, ExperienceSlugTakenError
from app.infra.models import ExperienceModel

# Most recent first; entries of the same years keep insertion order (newest first).
_ORDER = (
    ExperienceModel.start_year.desc(),
    ExperienceModel.end_year.desc().nulls_first(),
    ExperienceModel.id.desc(),
)


def _copy(entry: Experience, row: ExperienceModel) -> None:
    row.kind = entry.kind
    row.title = dict(entry.title)
    row.organization = entry.organization
    row.start_year = entry.start_year
    row.end_year = entry.end_year
    row.summary = dict(entry.summary)
    row.description = dict(entry.description)
    row.technologies = list(entry.technologies)
    row.logo_focus_x = entry.logo_focus_x
    row.logo_focus_y = entry.logo_focus_y


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
        logo_focus_x=row.logo_focus_x,
        logo_focus_y=row.logo_focus_y,
    )


class ExperienceRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list(self) -> list[Experience]:
        rows = await self._session.scalars(select(ExperienceModel).order_by(*_ORDER))
        return [_to_domain(row) for row in rows]

    async def get(self, slug: str) -> Experience | None:
        row = await self._row(slug)
        return None if row is None else _to_domain(row)

    async def create(self, entry: Experience) -> None:
        # Single admin, so checking first is enough; the unique constraint still guards the rest.
        if await self._row(entry.slug) is not None:
            raise ExperienceSlugTakenError(entry.slug)
        row = ExperienceModel(slug=entry.slug)
        _copy(entry, row)
        self._session.add(row)
        await self._session.flush()

    async def update(self, entry: Experience) -> None:
        """Replace everything but the slug, which identifies the entry and never changes."""
        row = await self._row(entry.slug)
        if row is None:
            raise LookupError(f"Unknown experience {entry.slug!r}")
        _copy(entry, row)
        await self._session.flush()

    async def delete(self, slug: str) -> bool:
        """Delete the entry; False when there was none."""
        row = await self._row(slug)
        if row is None:
            return False
        await self._session.delete(row)
        await self._session.flush()
        return True

    async def commit(self) -> None:
        await self._session.commit()

    async def _row(self, slug: str) -> ExperienceModel | None:
        return await self._session.scalar(
            select(ExperienceModel).where(ExperienceModel.slug == slug)
        )
