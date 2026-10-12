from typing import Annotated

from fastapi import Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from app.api.common import MoveIn
from app.api.dependencies import admin_router, get_skill_repository
from app.api.skills import SkillIconOut
from app.domain.skill import (
    ICON_PATH_MAX_LENGTH,
    ICON_SLUG_MAX_LENGTH,
    NAME_MAX_LENGTH,
    Skill,
    SkillCategory,
    SkillIcon,
    SkillNameTakenError,
)
from app.infra.repositories.skill import SkillRepository

router = admin_router()

Repository = Annotated[SkillRepository, Depends(get_skill_repository)]


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class SkillIconIn(_StrictModel):
    slug: str = Field(min_length=1, max_length=ICON_SLUG_MAX_LENGTH, pattern=r"^[a-z0-9_]+$")
    hex: str = Field(pattern=r"^[0-9A-Fa-f]{6}$")
    # SVG path commands, numbers and separators only: nothing that could become markup.
    path: str = Field(
        min_length=1,
        max_length=ICON_PATH_MAX_LENGTH,
        pattern=r"^[MmLlHhVvCcSsQqTtAaZzEe0-9.,+\- ]+$",
    )


class SkillIn(_StrictModel):
    name: str = Field(min_length=1, max_length=NAME_MAX_LENGTH)
    category: SkillCategory
    icon: SkillIconIn | None = None

    def to_domain(self, skill_id: int | None) -> Skill:
        icon = None if self.icon is None else SkillIcon(**self.icon.model_dump())
        return Skill(id=skill_id, name=self.name, category=self.category, icon=icon)


class AdminSkillOut(BaseModel):
    id: int
    name: str
    category: SkillCategory
    icon: SkillIconOut | None

    @classmethod
    def from_domain(cls, skill: Skill) -> "AdminSkillOut":
        assert skill.id is not None  # stored skills always have one
        return cls(
            id=skill.id,
            name=skill.name,
            category=skill.category,
            icon=SkillIconOut.from_domain(skill.icon),
        )


def _not_found() -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, detail="Skill not found")


def _name_taken(error: SkillNameTakenError) -> HTTPException:
    return HTTPException(status.HTTP_409_CONFLICT, detail=str(error))


@router.get("/skills")
async def list_skills(repository: Repository) -> list[AdminSkillOut]:
    return [AdminSkillOut.from_domain(skill) for skill in await repository.list()]


@router.get("/skills/{skill_id}")
async def get_skill(skill_id: int, repository: Repository) -> AdminSkillOut:
    skill = await repository.get(skill_id)
    if skill is None:
        raise _not_found()
    return AdminSkillOut.from_domain(skill)


@router.post("/skills", status_code=status.HTTP_201_CREATED)
async def create_skill(body: SkillIn, repository: Repository) -> AdminSkillOut:
    try:
        skill = await repository.create(body.to_domain(None))
    except SkillNameTakenError as error:
        raise _name_taken(error) from error
    await repository.commit()
    return AdminSkillOut.from_domain(skill)


@router.put("/skills/{skill_id}")
async def update_skill(skill_id: int, body: SkillIn, repository: Repository) -> AdminSkillOut:
    skill = body.to_domain(skill_id)
    try:
        await repository.update(skill)
    except LookupError as error:
        raise _not_found() from error
    except SkillNameTakenError as error:
        raise _name_taken(error) from error
    await repository.commit()
    return AdminSkillOut.from_domain(skill)


@router.delete("/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_skill(skill_id: int, repository: Repository) -> None:
    if not await repository.delete(skill_id):
        raise _not_found()
    await repository.commit()


@router.post("/skills/{skill_id}/move", status_code=status.HTTP_204_NO_CONTENT)
async def move_skill(skill_id: int, body: MoveIn, repository: Repository) -> None:
    if not await repository.move(skill_id, body.direction):
        raise _not_found()
    await repository.commit()
