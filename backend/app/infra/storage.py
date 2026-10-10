from pathlib import Path

from app.infra.config import settings


def cv_file() -> Path | None:
    """Path of the CV PDF if one has been placed in the storage folder."""
    # Fixed file name: no part of the path ever comes from the request.
    path = settings.storage_dir / "cv.pdf"
    return path if path.is_file() else None
