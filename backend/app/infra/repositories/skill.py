from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.skill import CATEGORIES, Skill, SkillIcon, SkillNameTakenError
from app.infra.models import SkillModel


def _to_domain(row: SkillModel) -> Skill:
    icon = (
        None
        if row.icon_slug is None
        else SkillIcon(slug=row.icon_slug, hex=row.icon_hex or "", path=row.icon_path or "")
    )
    return Skill(id=row.id, name=row.name, category=row.category, icon=icon)


def _copy(skill: Skill, row: SkillModel) -> None:
    row.name = skill.name
    row.category = skill.category
    row.icon_slug = skill.icon.slug if skill.icon else None
    row.icon_hex = skill.icon.hex if skill.icon else None
    row.icon_path = skill.icon.path if skill.icon else None


class SkillRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list(self) -> list[Skill]:
        """Every skill, by category (fixed order) then by position."""
        rows = await self._session.scalars(select(SkillModel).order_by(SkillModel.position))
        ordered = sorted(rows, key=lambda row: CATEGORIES.index(row.category))  # stable sort
        return [_to_domain(row) for row in ordered]

    async def get(self, skill_id: int) -> Skill | None:
        row = await self._session.get(SkillModel, skill_id)
        return None if row is None else _to_domain(row)

    async def create(self, skill: Skill) -> Skill:
        """Store the skill last of its category; returns it with its id."""
        await self._check_name_free(skill)
        row = SkillModel(position=await self._next_position(skill.category))
        _copy(skill, row)
        self._session.add(row)
        await self._session.flush()
        return _to_domain(row)

    async def update(self, skill: Skill) -> None:
        """Replace the skill found by id; moving it to another category puts it last there."""
        row = await self._session.get(SkillModel, skill.id)
        if row is None:
            raise LookupError(f"Unknown skill {skill.id}")
        await self._check_name_free(skill)
        if row.category != skill.category:
            row.position = await self._next_position(skill.category)
        _copy(skill, row)
        await self._session.flush()

    async def delete(self, skill_id: int) -> bool:
        """Delete the skill; False when there was none."""
        row = await self._session.get(SkillModel, skill_id)
        if row is None:
            return False
        await self._session.delete(row)
        await self._session.flush()
        return True

    async def move(self, skill_id: int, direction: Literal["up", "down"]) -> bool:
        """Swap the skill with its neighbour in its category; False when the skill is unknown.

        At the edge of its category there is no neighbour, and nothing changes.
        """
        row = await self._session.get(SkillModel, skill_id)
        if row is None:
            return False
        same_category = select(SkillModel).where(SkillModel.category == row.category)
        neighbour = await self._session.scalar(
            same_category.where(SkillModel.position < row.position)
            .order_by(SkillModel.position.desc())
            .limit(1)
            if direction == "up"
            else same_category.where(SkillModel.position > row.position)
            .order_by(SkillModel.position)
            .limit(1)
        )
        if neighbour is not None:
            row.position, neighbour.position = neighbour.position, row.position
            await self._session.flush()
        return True

    async def commit(self) -> None:
        await self._session.commit()

    async def _next_position(self, category: str) -> int:
        last = await self._session.scalar(
            select(func.max(SkillModel.position)).where(SkillModel.category == category)
        )
        return 0 if last is None else last + 1

    async def _check_name_free(self, skill: Skill) -> None:
        # Single admin, so checking first is enough; the unique index still guards the rest.
        query = select(SkillModel.id).where(
            SkillModel.category == skill.category,
            func.lower(SkillModel.name) == skill.name.lower(),
        )
        if skill.id is not None:
            query = query.where(SkillModel.id != skill.id)
        if await self._session.scalar(query) is not None:
            raise SkillNameTakenError(skill.name)
