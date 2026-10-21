import io
import os
import re
import tempfile
from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import Literal

import anyio
from PIL import Image, ImageOps, UnidentifiedImageError

from app.infra.config import settings

CV_MAX_BYTES = 5 * 1024 * 1024
_CHUNK_BYTES = 64 * 1024


class NotAPdfError(Exception):
    pass


class CvTooLargeError(Exception):
    pass


def _cv_path() -> Path:
    # Fixed file name: no part of the path ever comes from the request.
    return settings.storage_dir / "cv.pdf"


def cv_file() -> Path | None:
    """Path of the CV PDF if one is stored."""
    path = _cv_path()
    return path if path.is_file() else None


def cv_url() -> str | None:
    """Public URL of the CV, versioned so a replaced CV is never hidden by a cache."""
    path = cv_file()
    return None if path is None else f"/api/cv?v={path.stat().st_mtime_ns}"


async def save_cv(read: Callable[[int], Awaitable[bytes]]) -> None:
    """Store the uploaded CV, reading it chunk by chunk with `read(size)`.

    The file is written next to the CV and swapped in atomically once fully checked, so a rejected
    or interrupted upload never replaces or damages the current CV.
    """
    settings.storage_dir.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(dir=settings.storage_dir, suffix=".upload")
    try:
        with os.fdopen(fd, "wb") as temp_file:
            size = 0
            while chunk := await read(_CHUNK_BYTES):
                # The declared type proves nothing: real PDFs start with this signature.
                if size == 0 and not chunk.startswith(b"%PDF-"):
                    raise NotAPdfError
                size += len(chunk)
                if size > CV_MAX_BYTES:
                    raise CvTooLargeError
                temp_file.write(chunk)
        if size == 0:
            raise NotAPdfError
        # mkstemp creates the file as 0600; make it readable like a normal file (e.g. by nginx).
        os.chmod(temp_name, 0o644)
        os.replace(temp_name, _cv_path())
    except BaseException:
        Path(temp_name).unlink(missing_ok=True)
        raise


def delete_cv() -> None:
    _cv_path().unlink(missing_ok=True)


# --- Home photo -------------------------------------------------------------------------------

PHOTO_MAX_BYTES = 5 * 1024 * 1024
# A small file can decode into a huge picture ("decompression bomb"): refused before decoding.
PHOTO_MAX_PIXELS = 40_000_000
PHOTO_MAX_SIDE = 1200
_PHOTO_FORMATS = ("JPEG", "PNG", "WEBP")


class NotAnImageError(Exception):
    pass


class PhotoTooLargeError(Exception):
    pass


def _photo_path() -> Path:
    # Fixed file name: no part of the path ever comes from the request.
    return settings.storage_dir / "photo.webp"


def photo_file() -> Path | None:
    """Path of the processed photo if one is stored."""
    path = _photo_path()
    return path if path.is_file() else None


def photo_url() -> str | None:
    """Public URL of the photo, versioned so a replaced photo is never hidden by a cache."""
    path = photo_file()
    return None if path is None else f"/api/photo?v={path.stat().st_mtime_ns}"


async def save_photo(read: Callable[[int], Awaitable[bytes]]) -> None:
    """Store an uploaded photo as a clean WebP: upright, at most 1,200 px, without metadata.

    Only the processed image is kept, never the upload (phone photos often carry the GPS
    position where they were taken). Decoding runs in a worker thread.
    """
    await _save_image_upload(_photo_path(), PHOTO_MAX_SIDE, read)


async def _save_image_upload(
    path: Path, max_side: int, read: Callable[[int], Awaitable[bytes]]
) -> None:
    data = bytearray()
    while chunk := await read(_CHUNK_BYTES):
        data += chunk
        if len(data) > PHOTO_MAX_BYTES:
            raise PhotoTooLargeError
    if not data:
        raise NotAnImageError
    webp = await anyio.to_thread.run_sync(_clean_image, bytes(data), max_side)
    _write_atomically(path, webp)


def _clean_image(data: bytes, max_side: int) -> bytes:
    try:
        # `formats`: the content decides, whatever the file is called or claims to be.
        with Image.open(io.BytesIO(data), formats=_PHOTO_FORMATS) as image:
            if image.width * image.height > PHOTO_MAX_PIXELS:
                raise PhotoTooLargeError
            image.load()
            upright = ImageOps.exif_transpose(image)
            has_alpha = upright.mode in ("RGBA", "LA") or "transparency" in upright.info
            clean = upright.convert("RGBA" if has_alpha else "RGB")
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as error:
        raise NotAnImageError from error
    clean.thumbnail((max_side, max_side))  # never enlarges
    clean.info.clear()  # nothing from the upload (EXIF, ICC, XMP) may reach the saved file
    output = io.BytesIO()
    clean.save(output, format="WEBP", quality=82, method=6, exif=b"", xmp=b"")
    return output.getvalue()


def _write_atomically(path: Path, data: bytes) -> None:
    """Write next to the target, then swap it in: readers never see a half-written file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(dir=path.parent, suffix=".upload")
    try:
        with os.fdopen(fd, "wb") as temp_file:
            temp_file.write(data)
        os.chmod(temp_name, 0o644)  # mkstemp creates 0600; readable like a normal file
        os.replace(temp_name, path)
    except BaseException:
        Path(temp_name).unlink(missing_ok=True)
        raise


def delete_photo() -> None:
    _photo_path().unlink(missing_ok=True)


# --- Other images: experience logos, project screenshots, contact page image -------------------

# Longest side kept for each kind: every image fills a card or a page column.
IMAGE_MAX_SIDE = {"logos": PHOTO_MAX_SIDE, "projects": PHOTO_MAX_SIDE, "contact": PHOTO_MAX_SIDE}
ImageKind = Literal["logos", "projects", "contact"]
# Image keys are experience slugs, project ids or "page": never anything from the upload.
_IMAGE_KEY = re.compile(r"[a-z0-9-]{1,100}")


def _image_path(kind: ImageKind, key: str) -> Path:
    if kind not in IMAGE_MAX_SIDE or not _IMAGE_KEY.fullmatch(key):
        raise ValueError(f"invalid image {kind}/{key}")
    return settings.storage_dir / "images" / kind / f"{key}.webp"


def image_file(kind: ImageKind, key: str) -> Path | None:
    path = _image_path(kind, key)
    return path if path.is_file() else None


def image_url(kind: ImageKind, key: str) -> str | None:
    """Public URL of an image, versioned so a replaced image is never hidden by a cache."""
    path = image_file(kind, key)
    return None if path is None else f"/api/images/{kind}/{key}?v={path.stat().st_mtime_ns}"


async def save_image(kind: ImageKind, key: str, read: Callable[[int], Awaitable[bytes]]) -> None:
    """Store an uploaded image cleaned like the photo (upright, resized, WebP, no metadata)."""
    await _save_image_upload(_image_path(kind, key), IMAGE_MAX_SIDE[kind], read)


def delete_image(kind: ImageKind, key: str) -> None:
    _image_path(kind, key).unlink(missing_ok=True)
