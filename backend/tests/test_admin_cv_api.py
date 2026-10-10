from pathlib import Path

import pytest
from httpx import AsyncClient

from app.infra.storage import CV_MAX_BYTES

pytestmark = pytest.mark.anyio

PDF = b"%PDF-1.7\nfake but well-signed content"


async def upload(client: AsyncClient, content: bytes, content_type: str = "application/pdf"):
    return await client.put("/api/admin/cv", files={"file": ("cv.pdf", content, content_type)})


async def test_uploaded_cv_is_served_publicly(admin_client: AsyncClient) -> None:
    assert (await upload(admin_client, PDF)).status_code == 204

    assert (await admin_client.get("/api/cv")).content == PDF
    assert (await admin_client.get("/api/admin/home")).json()["has_cv"] is True


@pytest.mark.parametrize(
    ("content", "content_type", "status"),
    [
        (PDF, "text/html", 415),  # wrong declared type
        (b"<html><script>alert(1)</script>", "application/pdf", 415),  # renamed non-PDF
        (b"", "application/pdf", 415),  # empty file
        (b"%PDF-" + b"x" * CV_MAX_BYTES, "application/pdf", 413),  # over 5 MB
    ],
    # Short ids: pytest would otherwise put the 5 MB payload in the test name.
    ids=["declared-html", "renamed-non-pdf", "empty", "too-large"],
)
async def test_rejected_upload_keeps_the_current_cv_and_leaves_no_temp_file(
    admin_client: AsyncClient, storage_dir: Path, content: bytes, content_type: str, status: int
) -> None:
    await upload(admin_client, PDF)

    assert (await upload(admin_client, content, content_type)).status_code == status

    assert (await admin_client.get("/api/cv")).content == PDF
    assert [path.name for path in storage_dir.iterdir()] == ["cv.pdf"]


async def test_cv_can_be_removed(admin_client: AsyncClient) -> None:
    await upload(admin_client, PDF)

    assert (await admin_client.delete("/api/admin/cv")).status_code == 204
    assert (await admin_client.get("/api/cv")).status_code == 404
    assert (await admin_client.delete("/api/admin/cv")).status_code == 204  # already gone
