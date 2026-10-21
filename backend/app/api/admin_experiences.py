from typing import Annotated

from fastapi import Depends, HTTPException, Path, status
from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, field_validator

from app.api.dependencies import admin_router, get_experience_repository, get_translator
from app.domain.experience import (
    DESCRIPTION_MAX_LENGTH,
    ORGANIZATION_MAX_LENGTH,
    RESERVED_SLUGS,
    SLUG_MAX_LENGTH,
    SLUG_PATTERN,
    SUMMARY_MAX_LENGTH,
    TECHNOLOGIES_MAX_COUNT,
    TECHNOLOGY_MAX_LENGTH,
    TITLE_MAX_LENGTH,
    TRANSLATED_FIELDS,
    YEAR_MAX,
    YEAR_MIN,
    Experience,
    ExperienceKind,
    ExperienceSlugTakenError,
)
from app.domain.language import Lang, with_every_lang
from app.infra.repositories.experience import ExperienceRepository
from app.infra.storage import delete_image, image_url
from app.infra.translation import Translator, fill_missing

router = admin_router()

Repository = Annotated[ExperienceRepository, Depends(get_experience_repository)]
Slug = Annotated[str, Path(max_length=SLUG_MAX_LENGTH, pattern=SLUG_PATTERN)]
Year = Annotated[int, Field(ge=YEAR_MIN, le=YEAR_MAX)]
Technology = Annotated[str, Field(min_length=1, max_length=TECHNOLOGY_MAX_LENGTH)]


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


# French (the source) is required for title and summary; empty translations are filled on save.
class TitleIn(_StrictModel):
    fr: str = Field(min_length=1, max_length=TITLE_MAX_LENGTH)
    en: str = Field(default="", max_length=TITLE_MAX_LENGTH)
    nl: str = Field(default="", max_length=TITLE_MAX_LENGTH)


class SummaryIn(_StrictModel):
    fr: str = Field(min_length=1, max_length=SUMMARY_MAX_LENGTH)
    en: str = Field(default="", max_length=SUMMARY_MAX_LENGTH)
    nl: str = Field(default="", max_length=SUMMARY_MAX_LENGTH)


class DescriptionIn(_StrictModel):  # optional Markdown
    fr: str = Field(default="", max_length=DESCRIPTION_MAX_LENGTH)
    en: str = Field(default="", max_length=DESCRIPTION_MAX_LENGTH)
    nl: str = Field(default="", max_length=DESCRIPTION_MAX_LENGTH)


class ExperienceIn(_StrictModel):
    kind: ExperienceKind
    organization: str = Field(min_length=1, max_length=ORGANIZATION_MAX_LENGTH)
    start_year: Year
    end_year: Year | None = None  # None while ongoing
    technologies: list[Technology] = Field(default=[], max_length=TECHNOLOGIES_MAX_COUNT)
    title: TitleIn
    summary: SummaryIn
    description: DescriptionIn = DescriptionIn()

    @field_validator("end_year")
    @classmethod
    def _ends_after_start(cls, end_year: int | None, info: ValidationInfo) -> int | None:
        start_year = info.data.get("start_year")
        if end_year is not None and start_year is not None and end_year < start_year:
            raise ValueError("The end year cannot be before the start year")
        return end_year

    @field_validator("technologies")
    @classmethod
    def _without_duplicates(cls, technologies: list[str]) -> list[str]:
        return list(dict.fromkeys(technologies))

    def to_domain(self, slug: str, texts: dict[str, dict[str, str]]) -> Experience:
        return Experience(
            slug=slug,
            kind=self.kind,
            organization=self.organization,
            start_year=self.start_year,
            end_year=self.end_year,
            technologies=tuple(self.technologies),
            title=texts["title"],
            summary=texts["summary"],
            description=texts["description"],
        )


class ExperienceCreateIn(ExperienceIn):
    slug: str = Field(max_length=SLUG_MAX_LENGTH, pattern=SLUG_PATTERN)

    @field_validator("slug")
    @classmethod
    def _not_reserved(cls, slug: str) -> str:
        if slug in RESERVED_SLUGS:
            raise ValueError("This address is reserved")
        return slug


class AdminExperienceOut(BaseModel):
    slug: str
    kind: ExperienceKind
    organization: str
    start_year: int
    end_year: int | None
    technologies: list[str]
    title: dict[str, str]
    summary: dict[str, str]
    description: dict[str, str]
    logo_url: str | None

    @classmethod
    def from_domain(cls, entry: Experience) -> "AdminExperienceOut":
        return cls(
            slug=entry.slug,
            kind=entry.kind,
            organization=entry.organization,
            start_year=entry.start_year,
            end_year=entry.end_year,
            technologies=list(entry.technologies),
            title=with_every_lang(entry.title),
            summary=with_every_lang(entry.summary),
            description=with_every_lang(entry.description),
            logo_url=image_url("logos", entry.slug),
        )


class AdminExperienceSaveOut(AdminExperienceOut):
    auto_translated: list[Lang]  # languages whose empty texts were generated on this save
    translation_failed: bool


async def _translated(
    body: ExperienceIn, slug: str, translator: Translator
) -> tuple[Experience, list[Lang], bool]:
    texts = {field: getattr(body, field).model_dump() for field in TRANSLATED_FIELDS}
    # Saving must not fail because of DeepL: on failure the public site shows French meanwhile.
    filled, failed = await fill_missing(texts, TRANSLATED_FIELDS, translator)
    return body.to_domain(slug, texts), sorted(filled), failed


def _not_found() -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, detail="Experience not found")


@router.get("/experiences")
async def list_experiences(repository: Repository) -> list[AdminExperienceOut]:
    return [AdminExperienceOut.from_domain(entry) for entry in await repository.list()]


@router.get("/experiences/{slug}")
async def get_experience(slug: Slug, repository: Repository) -> AdminExperienceOut:
    entry = await repository.get(slug)
    if entry is None:
        raise _not_found()
    return AdminExperienceOut.from_domain(entry)


@router.post("/experiences", status_code=status.HTTP_201_CREATED)
async def create_experience(
    body: ExperienceCreateIn,
    repository: Repository,
    translator: Annotated[Translator, Depends(get_translator)],
) -> AdminExperienceSaveOut:
    if await repository.get(body.slug) is not None:  # before spending DeepL characters
        raise HTTPException(status.HTTP_409_CONFLICT, detail="This address is already used")
    entry, auto_translated, failed = await _translated(body, body.slug, translator)
    try:
        await repository.create(entry)
    except ExperienceSlugTakenError as error:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=str(error)) from error
    await repository.commit()
    return AdminExperienceSaveOut(
        **AdminExperienceOut.from_domain(entry).model_dump(),
        auto_translated=auto_translated,
        translation_failed=failed,
    )


@router.put("/experiences/{slug}")
async def update_experience(
    slug: Slug,
    body: ExperienceIn,
    repository: Repository,
    translator: Annotated[Translator, Depends(get_translator)],
) -> AdminExperienceSaveOut:
    if await repository.get(slug) is None:
        raise _not_found()
    entry, auto_translated, failed = await _translated(body, slug, translator)
    await repository.update(entry)
    await repository.commit()
    return AdminExperienceSaveOut(
        **AdminExperienceOut.from_domain(entry).model_dump(),
        auto_translated=auto_translated,
        translation_failed=failed,
    )


@router.delete("/experiences/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_experience(slug: Slug, repository: Repository) -> None:
    if not await repository.delete(slug):
        raise _not_found()
    await repository.commit()
    delete_image("logos", slug)  # after the commit: a failed delete keeps the logo
