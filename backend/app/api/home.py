from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field

from app.api.dependencies import get_home_repository
from app.domain.home import PHOTO_FOCUS_MAX, PHOTO_FOCUS_MIN, HomeContent
from app.domain.language import Lang, localize
from app.infra.repositories.home import HomeContentRepository
from app.infra.storage import cv_file, photo_file, photo_url

router = APIRouter(tags=["home"])


class PhotoFocus(BaseModel):
    """The point of the photo (in % of its width and height) kept in view by its frame."""

    model_config = ConfigDict(extra="forbid")  # also an admin input

    x: int = Field(ge=PHOTO_FOCUS_MIN, le=PHOTO_FOCUS_MAX)
    y: int = Field(ge=PHOTO_FOCUS_MIN, le=PHOTO_FOCUS_MAX)

    @classmethod
    def from_domain(cls, content: HomeContent) -> "PhotoFocus":
        return cls(x=content.photo_focus_x, y=content.photo_focus_y)


class HomeContentOut(BaseModel):
    headline: str
    intro: str  # Markdown
    linkedin_url: str
    github_url: str
    cv_url: str | None
    photo_url: str | None  # versioned: changes when the photo is replaced
    photo_focus: PhotoFocus

    @classmethod
    def from_domain(cls, content: HomeContent, lang: Lang, cv_url: str | None) -> "HomeContentOut":
        return cls(
            headline=localize(content.headline, lang),
            intro=localize(content.intro, lang),
            linkedin_url=content.linkedin_url,
            github_url=content.github_url,
            cv_url=cv_url,
            photo_url=photo_url(),
            photo_focus=PhotoFocus.from_domain(content),
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


@router.get("/photo", response_class=FileResponse)
async def get_photo(v: str | None = None) -> FileResponse:
    path = photo_file()
    if path is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Photo not found")
    # A versioned address (?v=…, from photo_url) changes with the photo: safe to cache for long.
    # Any other address (e.g. the admin preview) must be checked again each time.
    cache = "public, max-age=31536000, immutable" if v else "no-cache"
    return FileResponse(
        path,
        media_type="image/webp",
        headers={"X-Content-Type-Options": "nosniff", "Cache-Control": cache},
    )
