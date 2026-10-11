from typing import Annotated, get_args

from fastapi import Depends, HTTPException, UploadFile, status
from pydantic import BaseModel, ConfigDict, Field

from app.api.dependencies import admin_router, get_home_repository, get_translator
from app.domain.home import (
    HEADLINE_MAX_LENGTH,
    INTRO_MAX_LENGTH,
    TRANSLATED_FIELDS,
    URL_MAX_LENGTH,
    HomeContent,
)
from app.domain.language import Lang
from app.infra.repositories.home import HomeContentRepository
from app.infra.storage import CvTooLargeError, NotAPdfError, cv_file, delete_cv, save_cv
from app.infra.translation import Translator, fill_missing

router = admin_router()

# https only: rejects http:// and javascript: links.
HttpsUrl = Annotated[str, Field(max_length=URL_MAX_LENGTH, pattern=r"^https://[^\s/?#]+\S*$")]


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


# One field per supported language; French (the source) is required, the others may be left
# empty (or omitted) and are then translated on save.
class HeadlineIn(_StrictModel):
    fr: str = Field(min_length=1, max_length=HEADLINE_MAX_LENGTH)
    en: str = Field(default="", max_length=HEADLINE_MAX_LENGTH)
    nl: str = Field(default="", max_length=HEADLINE_MAX_LENGTH)


class IntroIn(_StrictModel):
    fr: str = Field(min_length=1, max_length=INTRO_MAX_LENGTH)
    en: str = Field(default="", max_length=INTRO_MAX_LENGTH)
    nl: str = Field(default="", max_length=INTRO_MAX_LENGTH)


class HomeContentIn(_StrictModel):
    headline: HeadlineIn
    intro: IntroIn
    linkedin_url: HttpsUrl
    github_url: HttpsUrl


class AdminHomeContentOut(BaseModel):
    headline: dict[str, str]
    intro: dict[str, str]
    linkedin_url: str
    github_url: str
    has_cv: bool

    @classmethod
    def from_domain(cls, content: HomeContent) -> "AdminHomeContentOut":
        # Rows saved before a language was added lack its key: the editor gets "" instead.
        def every_lang(value: dict[str, str]) -> dict[str, str]:
            return {lang: value.get(lang, "") for lang in get_args(Lang)}

        return cls(
            headline=every_lang(content.headline),
            intro=every_lang(content.intro),
            linkedin_url=content.linkedin_url,
            github_url=content.github_url,
            has_cv=cv_file() is not None,
        )


class AdminHomeSaveOut(AdminHomeContentOut):
    auto_translated: list[Lang]  # languages whose empty texts were generated on this save
    translation_failed: bool


Repository = Annotated[HomeContentRepository, Depends(get_home_repository)]


@router.get("/home")
async def get_home_content(repository: Repository) -> AdminHomeContentOut:
    content = await repository.get()
    if content is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Home content not found")
    return AdminHomeContentOut.from_domain(content)


@router.put("/home")
async def save_home_content(
    body: HomeContentIn,
    repository: Repository,
    translator: Annotated[Translator, Depends(get_translator)],
) -> AdminHomeSaveOut:
    texts = {field: getattr(body, field).model_dump() for field in TRANSLATED_FIELDS}
    # Saving must not fail because of DeepL: on failure the public site shows French meanwhile.
    auto_translated, translation_failed = await fill_missing(texts, TRANSLATED_FIELDS, translator)

    content = HomeContent(
        headline=texts["headline"],
        intro=texts["intro"],
        linkedin_url=body.linkedin_url,
        github_url=body.github_url,
    )
    await repository.save(content)
    await repository.commit()
    return AdminHomeSaveOut(
        **AdminHomeContentOut.from_domain(content).model_dump(),
        auto_translated=sorted(auto_translated),
        translation_failed=translation_failed,
    )


@router.put("/cv", status_code=status.HTTP_204_NO_CONTENT)
async def upload_cv(file: UploadFile) -> None:
    if file.content_type != "application/pdf":
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="The CV must be a PDF")
    try:
        await save_cv(file.read)
    except NotAPdfError as error:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="The CV must be a PDF"
        ) from error
    except CvTooLargeError as error:
        raise HTTPException(
            status.HTTP_413_CONTENT_TOO_LARGE, detail="The CV must be 5 MB or less"
        ) from error


@router.delete("/cv", status_code=status.HTTP_204_NO_CONTENT)
async def remove_cv() -> None:
    delete_cv()
