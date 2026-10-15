from itertools import groupby
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.dependencies import get_skill_repository
from app.domain.skill import Skill, SkillCategory, SkillIcon
from app.infra.repositories.skill import SkillRepository

router = APIRouter(tags=["skills"])

Repository = Annotated[SkillRepository, Depends(get_skill_repository)]


class SkillIconOut(BaseModel):
    slug: str
    hex: str
    path: str  # SVG path data, rendered only as a <path d="..."> attribute

    @classmethod
    def from_domain(cls, icon: SkillIcon | None) -> "SkillIconOut | None":
        return None if icon is None else cls(slug=icon.slug, hex=icon.hex, path=icon.path)


class SkillOut(BaseModel):
    name: str
    icon: SkillIconOut | None

    @classmethod
    def from_domain(cls, skill: Skill) -> "SkillOut":
        return cls(name=skill.name, icon=SkillIconOut.from_domain(skill.icon))


class SkillCategoryOut(BaseModel):
    category: SkillCategory
    skills: list[SkillOut]


@router.get("/skills")
async def list_skills(repository: Repository) -> list[SkillCategoryOut]:
    """Categories in display order, each with its skills in order; empty categories omitted."""
    return [
        SkillCategoryOut(category=category, skills=[SkillOut.from_domain(s) for s in skills])
        # The repository already sorts by category then position.
        for category, skills in groupby(await repository.list(), key=lambda s: s.category)
    ]
