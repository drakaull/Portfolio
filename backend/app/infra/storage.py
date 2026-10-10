import os
import tempfile
from collections.abc import Awaitable, Callable
from pathlib import Path

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
        os.replace(temp_name, _cv_path())
    except BaseException:
        Path(temp_name).unlink(missing_ok=True)
        raise


def delete_cv() -> None:
    _cv_path().unlink(missing_ok=True)
