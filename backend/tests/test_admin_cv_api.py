from collections.abc import AsyncIterator
from pathlib import Path

import pytest
from httpx import AsyncClient

from app.api.body_limit import MAX_BODY_BYTES
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


async def test_a_cv_of_exactly_5_mb_is_accepted(admin_client: AsyncClient) -> None:
    content = b"%PDF-" + b"x" * (CV_MAX_BYTES - 5)

    assert (await upload(admin_client, content)).status_code == 204


@pytest.mark.parametrize("declare_length", [True, False], ids=["content-length", "chunked"])
async def test_anonymous_oversized_bodies_are_cut_off_before_parsing(
    client: AsyncClient, storage_dir: Path, declare_length: bool
) -> None:
    size = MAX_BODY_BYTES + 1

    # A well-formed multipart start, then an endless file part: what an attacker would send.
    part_start = (
        b'--x\r\nContent-Disposition: form-data; name="file"; filename="cv.pdf"\r\n'
        b"Content-Type: application/pdf\r\n\r\n%PDF-"
    )

    async def chunks() -> AsyncIterator[bytes]:
        yield part_start
        for _ in range(size // 65536 + 1):
            yield b"x" * 65536

    headers = {"Content-Type": "multipart/form-data; boundary=x"}
    if declare_length:
        response = await client.put(
            "/api/admin/cv", content=part_start + b"x" * size, headers=headers
        )
    else:  # no Content-Length: the limit must hold while bytes arrive
        response = await client.put("/api/admin/cv", content=chunks(), headers=headers)

    assert response.status_code == 413
    assert list(storage_dir.iterdir()) == []
