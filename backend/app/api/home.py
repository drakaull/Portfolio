from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.api.dependencies import get_home_repository
from app.domain.home import HomeContent
from app.domain.language import Lang, localize
from app.infra.repositories.home import HomeContentRepository
from app.infra.storage import cv_file

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
    return HomeContentOut.from_domain(content, lang, cv_url="/api/cv" if cv_file() else None)


@router.get("/cv", response_class=FileResponse)
async def get_cv() -> FileResponse:
    path = cv_file()
    if path is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="CV not found")
    # "inline" opens the PDF in the browser instead of forcing a download.
    return FileResponse(
        path,
        media_type="application/pdf",
        filename="Leonard_Fontaine_CV.pdf",
        content_disposition_type="inline",
        # Served from the site's own origin: forbid scripts and type sniffing on this response.
        headers={"Content-Security-Policy": "sandbox", "X-Content-Type-Options": "nosniff"},
    )
