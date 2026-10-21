from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, status
from fastapi.responses import FileResponse

from app.api.home import cache_control
from app.infra.storage import ImageKind, image_file

router = APIRouter(tags=["images"])

# Experience slugs, project ids or "page" (contact): checked before any file path is built.
ImageKey = Annotated[str, Path(pattern=r"^[a-z0-9-]{1,100}$")]


@router.get("/images/{kind}/{key}", response_class=FileResponse)
async def get_image(kind: ImageKind, key: ImageKey, v: str | None = None) -> FileResponse:
    path = image_file(kind, key)
    if path is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Image not found")
    return FileResponse(
        path,
        media_type="image/webp",
        headers={"X-Content-Type-Options": "nosniff", "Cache-Control": cache_control(v)},
    )
