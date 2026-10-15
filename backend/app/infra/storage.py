import io
import os
import tempfile
from collections.abc import Awaitable, Callable
from pathlib import Path

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
    data = bytearray()
    while chunk := await read(_CHUNK_BYTES):
        data += chunk
        if len(data) > PHOTO_MAX_BYTES:
            raise PhotoTooLargeError
    if not data:
        raise NotAnImageError
    webp = await anyio.to_thread.run_sync(_clean_photo, bytes(data))
    _write_atomically(_photo_path(), webp)


def _clean_photo(data: bytes) -> bytes:
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
    clean.thumbnail((PHOTO_MAX_SIDE, PHOTO_MAX_SIDE))  # never enlarges
    clean.info.clear()  # nothing from the upload (EXIF, ICC, XMP) may reach the saved file
    output = io.BytesIO()
    clean.save(output, format="WEBP", quality=82, method=6, exif=b"", xmp=b"")
    return output.getvalue()


def _write_atomically(path: Path, data: bytes) -> None:
    """Write next to the target, then swap it in: readers never see a half-written file."""
    settings.storage_dir.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(dir=settings.storage_dir, suffix=".upload")
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
