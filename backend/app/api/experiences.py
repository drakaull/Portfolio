from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, status
from pydantic import BaseModel

from app.api.dependencies import get_experience_repository
from app.api.home import PhotoFocus
from app.domain.experience import SLUG_MAX_LENGTH, SLUG_PATTERN, Experience, ExperienceKind
from app.domain.language import Lang, localize
from app.infra.repositories.experience import ExperienceRepository
from app.infra.storage import image_url

router = APIRouter(tags=["experiences"])

Repository = Annotated[ExperienceRepository, Depends(get_experience_repository)]


class ExperienceOut(BaseModel):
    slug: str
    kind: ExperienceKind
    title: str
    organization: str
    start_year: int
    end_year: int | None
    summary: str
    technologies: list[str]
    logo_url: str | None  # the organisation's image, versioned
    logo_focus: PhotoFocus

    @classmethod
    def from_domain(cls, entry: Experience, lang: Lang) -> "ExperienceOut":
        return cls(
            slug=entry.slug,
            kind=entry.kind,
            title=localize(entry.title, lang),
            organization=entry.organization,
            start_year=entry.start_year,
            end_year=entry.end_year,
            summary=localize(entry.summary, lang),
            technologies=list(entry.technologies),
            logo_url=image_url("logos", entry.slug),
            logo_focus=PhotoFocus(x=entry.logo_focus_x, y=entry.logo_focus_y),
        )


class ExperienceDetailOut(ExperienceOut):
    description: str  # Markdown

    @classmethod
    def from_domain(cls, entry: Experience, lang: Lang) -> "ExperienceDetailOut":
        return cls(
            **ExperienceOut.from_domain(entry, lang).model_dump(),
            description=localize(entry.description, lang),
        )


@router.get("/experiences")
async def list_experiences(lang: Lang, repository: Repository) -> list[ExperienceOut]:
    return [ExperienceOut.from_domain(entry, lang) for entry in await repository.list()]


@router.get("/experiences/{slug}")
async def get_experience(
    slug: Annotated[str, Path(max_length=SLUG_MAX_LENGTH, pattern=SLUG_PATTERN)],
    lang: Lang,
    repository: Repository,
) -> ExperienceDetailOut:
    entry = await repository.get(slug)
    if entry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Experience not found")
    return ExperienceDetailOut.from_domain(entry, lang)
