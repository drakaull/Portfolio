from typing import Annotated

from fastapi import Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from app.api.dependencies import admin_router, get_home_repository
from app.domain.home import HEADLINE_MAX_LENGTH, INTRO_MAX_LENGTH, URL_MAX_LENGTH, HomeContent
from app.infra.repositories.home import HomeContentRepository
from app.infra.storage import cv_file

router = admin_router()

# https only: rejects http:// and javascript: links.
HttpsUrl = Annotated[str, Field(max_length=URL_MAX_LENGTH, pattern=r"^https://[^\s/?#]+\S*$")]


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


# One field per supported language; English is required, French falls back to English when empty.
class HeadlineIn(_StrictModel):
    en: str = Field(min_length=1, max_length=HEADLINE_MAX_LENGTH)
    fr: str = Field(max_length=HEADLINE_MAX_LENGTH)


class IntroIn(_StrictModel):
    en: str = Field(min_length=1, max_length=INTRO_MAX_LENGTH)
    fr: str = Field(max_length=INTRO_MAX_LENGTH)


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
        return cls(
            headline=dict(content.headline),
            intro=dict(content.intro),
            linkedin_url=content.linkedin_url,
            github_url=content.github_url,
            has_cv=cv_file() is not None,
        )


Repository = Annotated[HomeContentRepository, Depends(get_home_repository)]


@router.get("/home")
async def get_home_content(repository: Repository) -> AdminHomeContentOut:
    content = await repository.get()
    if content is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Home content not found")
    return AdminHomeContentOut.from_domain(content)


@router.put("/home")
async def save_home_content(body: HomeContentIn, repository: Repository) -> AdminHomeContentOut:
    content = HomeContent(
        headline=body.headline.model_dump(),
        intro=body.intro.model_dump(),
        linkedin_url=body.linkedin_url,
        github_url=body.github_url,
    )
    await repository.save(content)
    await repository.commit()
    return AdminHomeContentOut.from_domain(content)
