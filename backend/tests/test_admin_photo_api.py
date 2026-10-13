import io
import stat
import sys
from pathlib import Path

import pytest
from httpx import AsyncClient
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import assert_committed

pytestmark = pytest.mark.anyio

URL = "/api/admin/photo"


def jpeg_from_a_phone(width: int = 400, height: int = 300) -> bytes:
    """A landscape JPEG that a phone marked "rotate 90°", with a GPS position in its EXIF."""
    image = Image.new("RGB", (width, height), (200, 80, 40))
    exif = Image.Exif()
    exif[0x0112] = 6  # Orientation: rotate 90° clockwise to display
    exif[0x010F] = "PhoneMaker"  # Make
    gps = exif.get_ifd(0x8825)
    gps[1], gps[2] = "N", (50.0, 27.0, 15.0)  # GPSLatitudeRef, GPSLatitude
    gps[3], gps[4] = "E", (3.0, 57.0, 10.0)  # GPSLongitudeRef, GPSLongitude
    output = io.BytesIO()
    image.save(output, format="JPEG", exif=exif.tobytes())
    return output.getvalue()


def image_bytes(fmt: str, size: tuple[int, int] = (300, 300), mode: str = "RGB") -> bytes:
    output = io.BytesIO()
    color = (10, 120, 200, 0) if mode == "RGBA" else (10, 120, 200)
    Image.new(mode, size, color).save(output, format=fmt)
    return output.getvalue()


async def upload(client: AsyncClient, data: bytes, name: str = "me.jpg", kind: str = "image/jpeg"):
    return await client.put(URL, files={"file": (name, data, kind)})


def saved(storage_dir: Path) -> Image.Image:
    return Image.open(storage_dir / "photo.webp")


async def test_phone_photo_is_upright_webp_without_any_metadata(
    admin_client: AsyncClient, storage_dir: Path
) -> None:
    response = await upload(admin_client, jpeg_from_a_phone())

    assert response.status_code == 204
    assert [path.name for path in storage_dir.iterdir()] == ["photo.webp"]  # upload not kept
    photo = saved(storage_dir)
    assert photo.format == "WEBP"
    assert photo.size == (300, 400)  # turned upright from 400x300
    assert dict(photo.getexif()) == {}  # no GPS, no camera, nothing
    assert not ({"exif", "icc_profile", "xmp"} & set(photo.info))
    raw = (storage_dir / "photo.webp").read_bytes()
    assert b"EXIF" not in raw and b"PhoneMaker" not in raw


async def test_large_photo_is_resized_small_one_kept(
    admin_client: AsyncClient, storage_dir: Path
) -> None:
    await upload(admin_client, image_bytes("PNG", (3000, 1500)), "big.png", "image/png")
    assert saved(storage_dir).size == (1200, 600)

    await upload(admin_client, image_bytes("WEBP", (200, 100)), "small.webp", "image/webp")
    assert saved(storage_dir).size == (200, 100)  # never enlarged


async def test_transparent_png_keeps_its_transparency(
    admin_client: AsyncClient, storage_dir: Path
) -> None:
    await upload(admin_client, image_bytes("PNG", mode="RGBA"), "logo.png", "image/png")

    assert saved(storage_dir).mode == "RGBA"


@pytest.mark.parametrize(
    ("data", "name", "kind", "status"),
    [
        (b"not an image at all", "fake.jpg", "image/jpeg", 415),
        (b"", "empty.jpg", "image/jpeg", 415),
        (image_bytes("GIF"), "anim.gif", "image/gif", 415),  # format outside the allow-list
        (image_bytes("BMP"), "photo.jpg", "image/jpeg", 415),  # renamed: content decides
        (b"\xff\xd8\xff" + b"0" * (5 * 1024 * 1024), "huge.jpg", "image/jpeg", 413),
    ],
    ids=["text", "empty", "gif", "renamed-bmp", "over-5-mb"],
)
async def test_invalid_uploads_are_refused_and_keep_the_current_photo(
    admin_client: AsyncClient,
    storage_dir: Path,
    data: bytes,
    name: str,
    kind: str,
    status: int,
) -> None:
    await upload(admin_client, jpeg_from_a_phone())
    before = (storage_dir / "photo.webp").read_bytes()

    response = await upload(admin_client, data, name, kind)

    assert response.status_code == status
    assert (storage_dir / "photo.webp").read_bytes() == before
    assert [path.name for path in storage_dir.iterdir()] == ["photo.webp"]


async def test_too_many_pixels_is_refused_before_decoding(
    admin_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.infra import storage

    monkeypatch.setattr(storage, "PHOTO_MAX_PIXELS", 100 * 100)

    response = await upload(admin_client, image_bytes("PNG", (101, 100)), "wide.png", "image/png")

    assert response.status_code == 413


async def test_public_photo_url_is_versioned_and_served(admin_client: AsyncClient) -> None:
    assert (await admin_client.get("/api/photo")).status_code == 404
    assert (await admin_client.get("/api/home", params={"lang": "fr"})).json()["photo_url"] is None

    await upload(admin_client, jpeg_from_a_phone())
    url = (await admin_client.get("/api/home", params={"lang": "fr"})).json()["photo_url"]
    assert url.startswith("/api/photo?v=")
    assert (await admin_client.get("/api/admin/home")).json()["photo_url"] == url

    photo = await admin_client.get(url)
    assert photo.status_code == 200
    assert photo.headers["content-type"] == "image/webp"
    assert photo.headers["x-content-type-options"] == "nosniff"

    await upload(admin_client, image_bytes("PNG"), "other.png", "image/png")
    new_url = (await admin_client.get("/api/home", params={"lang": "fr"})).json()["photo_url"]
    assert new_url != url  # a replaced photo gets a new address: no stale cache


async def test_remove_photo(admin_client: AsyncClient, storage_dir: Path) -> None:
    await upload(admin_client, jpeg_from_a_phone())

    response = await admin_client.delete(URL)

    assert response.status_code == 204
    assert list(storage_dir.iterdir()) == []
    assert (await admin_client.delete(URL)).status_code == 204  # nothing to remove: fine


async def test_photo_routes_need_a_session(client: AsyncClient) -> None:
    assert (await upload(client, jpeg_from_a_phone())).status_code == 401
    assert (await client.delete(URL)).status_code == 401


@pytest.mark.skipif(sys.platform == "win32", reason="Windows does not use POSIX permissions")
async def test_stored_photo_is_readable_by_other_processes(
    admin_client: AsyncClient, storage_dir: Path
) -> None:
    await upload(admin_client, jpeg_from_a_phone())

    assert stat.S_IMODE((storage_dir / "photo.webp").stat().st_mode) == 0o644


async def test_only_versioned_addresses_are_cached_for_long(admin_client: AsyncClient) -> None:
    await upload(admin_client, jpeg_from_a_phone())

    versioned = await admin_client.get("/api/photo", params={"v": "123"})
    unversioned = await admin_client.get("/api/photo", params={"preview": "0"})

    assert "max-age=31536000" in versioned.headers["cache-control"]
    assert unversioned.headers["cache-control"] == "no-cache"  # the admin preview stays fresh


async def test_a_new_photo_is_framed_from_the_centre(
    admin_client: AsyncClient, session: AsyncSession
) -> None:
    home = (await admin_client.get("/api/admin/home")).json()
    framed = {**home, "photo_focus": {"x": 10, "y": 90}}
    for key in ("has_cv", "photo_url"):
        framed.pop(key)
    await admin_client.put("/api/admin/home", json=framed)

    await upload(admin_client, jpeg_from_a_phone())
    assert_committed(session)

    assert (await admin_client.get("/api/admin/home")).json()["photo_focus"] == {"x": 50, "y": 50}
