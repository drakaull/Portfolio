from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.dependencies import get_home_repository
from app.domain.home import HomeContent
from app.domain.language import Lang, localize
from app.infra.repositories.home import HomeContentRepository

router = APIRouter(tags=["home"])


class HomeContentOut(BaseModel):
    headline: str
    intro: str  # Markdown
    linkedin_url: str
    github_url: str
    cv_url: str | None

    @classmethod
    def from_domain(cls, content: HomeContent, lang: Lang, cv_url: str | None) -> "HomeContentOut":
        return cls(
            headline=localize(content.headline, lang),
            intro=localize(content.intro, lang),
            linkedin_url=content.linkedin_url,
            github_url=content.github_url,
            cv_url=cv_url,
        )


@router.get("/home")
async def get_home(
    lang: Lang, repository: Annotated[HomeContentRepository, Depends(get_home_repository)]
) -> HomeContentOut:
    content = await repository.get()
    if content is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Home content not found")
    return HomeContentOut.from_domain(content, lang, cv_url=None)
