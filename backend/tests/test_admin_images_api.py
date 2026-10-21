import io
from pathlib import Path

import pytest
from httpx import AsyncClient
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import assert_committed
from tests.test_admin_photo_api import image_bytes, jpeg_from_a_phone
from tests.test_projects_api import FakeGitHub, github, synced  # noqa: F401 (github is a fixture)

pytestmark = pytest.mark.anyio

SLUG = "icare-student-job-2026"  # seeded experience


async def put(client: AsyncClient, url: str, data: bytes, kind: str = "image/png"):
    return await client.put(url, files={"file": ("upload.png", data, kind)})


def stored(storage_dir: Path, kind: str, key: str) -> Image.Image:
    return Image.open(storage_dir / "images" / kind / f"{key}.webp")


# --- logos ---------------------------------------------------------------------------------


async def test_logo_is_cleaned_kept_small_and_shown_with_its_experience(
    admin_client: AsyncClient, storage_dir: Path
) -> None:
    logo = image_bytes("PNG", (800, 400), mode="RGBA")
    assert (await put(admin_client, f"/api/admin/experiences/{SLUG}/logo", logo)).status_code == 204

    saved = stored(storage_dir, "logos", SLUG)
    assert (saved.format, max(saved.size)) == ("WEBP", 256)  # logos are shown small
    assert saved.mode == "RGBA"  # transparency kept
    public = (await admin_client.get("/api/experiences", params={"lang": "fr"})).json()
    url = next(e for e in public if e["slug"] == SLUG)["logo_url"]
    assert url.startswith(f"/api/images/logos/{SLUG}?v=")
    response = await admin_client.get(url)
    assert response.headers["content-type"] == "image/webp"
    assert "max-age=31536000" in response.headers["cache-control"]
    admin = (await admin_client.get(f"/api/admin/experiences/{SLUG}")).json()
    assert admin["logo_url"] == url


async def test_logo_is_removed_alone_or_with_its_experience(
    admin_client: AsyncClient, storage_dir: Path
) -> None:
    await put(admin_client, f"/api/admin/experiences/{SLUG}/logo", image_bytes("PNG"))
    assert (await admin_client.delete(f"/api/admin/experiences/{SLUG}/logo")).status_code == 204
    assert not (storage_dir / "images" / "logos" / f"{SLUG}.webp").exists()

    await put(admin_client, f"/api/admin/experiences/{SLUG}/logo", image_bytes("PNG"))
    assert (await admin_client.delete(f"/api/admin/experiences/{SLUG}")).status_code == 204
    assert not (storage_dir / "images" / "logos" / f"{SLUG}.webp").exists()


async def test_logo_of_an_unknown_experience_is_404(admin_client: AsyncClient) -> None:
    url = "/api/admin/experiences/nobody-2000/logo"
    assert (await put(admin_client, url, image_bytes("PNG"))).status_code == 404
    assert (await admin_client.delete(url)).status_code == 404


# --- project screenshots -------------------------------------------------------------------


async def test_screenshot_is_framed_from_the_centre_and_kept_across_syncs(
    admin_client: AsyncClient,
    session: AsyncSession,
    storage_dir: Path,
    github: FakeGitHub,  # noqa: F811
) -> None:
    ttmc = next(p for p in await synced(admin_client) if p["title"] == "Projet TTMC")
    details = {"title": "TTMC", "visible": True, "image_focus": {"x": 10, "y": 90}}
    await admin_client.put(f"/api/admin/projects/{ttmc['id']}", json=details)

    response = await put(
        admin_client, f"/api/admin/projects/{ttmc['id']}/image", jpeg_from_a_phone()
    )
    assert response.status_code == 204
    assert_committed(session)
    saved = stored(storage_dir, "projects", str(ttmc["id"]))
    assert (saved.format, saved.getexif()) == ("WEBP", {})  # no metadata kept

    await synced(admin_client)  # a new sync must not lose the screenshot or its framing
    admin = (await admin_client.get(f"/api/admin/projects/{ttmc['id']}")).json()
    assert admin["image_focus"] == {"x": 50, "y": 50}  # a new screenshot starts centred
    assert admin["image_url"].startswith(f"/api/images/projects/{ttmc['id']}?v=")
    public = (await admin_client.get("/api/projects", params={"lang": "fr"})).json()
    assert public[0]["image_url"] == admin["image_url"]
    assert public[0]["image_focus"] == {"x": 50, "y": 50}


async def test_screenshot_framing_is_saved_with_the_details_and_optional(
    admin_client: AsyncClient,
    github: FakeGitHub,  # noqa: F811
) -> None:
    ttmc = next(p for p in await synced(admin_client) if p["title"] == "Projet TTMC")
    url = f"/api/admin/projects/{ttmc['id']}"
    await admin_client.put(url, json={"title": "TTMC", "image_focus": {"x": 20, "y": 30}})
    await admin_client.put(url, json={"title": "TTMC again"})  # no framing sent: kept

    assert (await admin_client.get(url)).json()["image_focus"] == {"x": 20, "y": 30}
    bad = await admin_client.put(url, json={"title": "TTMC", "image_focus": {"x": 101, "y": 0}})
    assert bad.status_code == 422


async def test_screenshot_is_removed_alone_or_with_its_project(
    admin_client: AsyncClient,
    storage_dir: Path,
    github: FakeGitHub,  # noqa: F811
) -> None:
    ttmc = next(p for p in await synced(admin_client) if p["title"] == "Projet TTMC")
    url = f"/api/admin/projects/{ttmc['id']}"
    path = storage_dir / "images" / "projects" / f"{ttmc['id']}.webp"
    await put(admin_client, f"{url}/image", image_bytes("PNG"))
    assert (await admin_client.delete(f"{url}/image")).status_code == 204
    assert not path.exists()

    await put(admin_client, f"{url}/image", image_bytes("PNG"))
    assert (await admin_client.delete(url)).status_code == 204
    assert not path.exists()


# --- contact image -------------------------------------------------------------------------


async def test_contact_image_is_public_and_framed_from_the_centre(
    admin_client: AsyncClient, storage_dir: Path
) -> None:
    home = (await admin_client.get("/api/admin/home")).json()
    body = {k: home[k] for k in ("headline", "intro", "linkedin_url", "github_url", "photo_focus")}
    await admin_client.put("/api/admin/home", json={**body, "contact_focus": {"x": 5, "y": 5}})

    assert (
        await put(admin_client, "/api/admin/contact-image", image_bytes("JPEG", (2400, 3000)))
    ).status_code == 204
    assert max(stored(storage_dir, "contact", "page").size) == 1200
    public = (await admin_client.get("/api/home", params={"lang": "nl"})).json()
    assert public["contact_image_url"].startswith("/api/images/contact/page?v=")
    assert public["contact_focus"] == {"x": 50, "y": 50}

    assert (await admin_client.delete("/api/admin/contact-image")).status_code == 204
    assert (await admin_client.get("/api/home", params={"lang": "nl"})).json()[
        "contact_image_url"
    ] is None


# --- shared rules --------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("data", "status"),
    [
        (b"%PDF-1.7 not an image", 415),
        (b"", 415),
        (b"x" * (5 * 1024 * 1024 + 1), 413),
    ],
    ids=["not-an-image", "empty", "too-large"],
)
async def test_refused_uploads(admin_client: AsyncClient, data: bytes, status: int) -> None:
    response = await put(admin_client, "/api/admin/contact-image", data)

    assert response.status_code == status
    assert (await admin_client.get("/api/home", params={"lang": "fr"})).json()[
        "contact_image_url"
    ] is None


async def test_uploads_need_the_admin(client: AsyncClient) -> None:
    for url in ("/api/admin/contact-image", f"/api/admin/experiences/{SLUG}/logo"):
        assert (await put(client, url, image_bytes("PNG"))).status_code == 401


@pytest.mark.parametrize(
    "path",
    [
        "/api/images/logos/missing",
        "/api/images/other/x",
        "/api/images/logos/..%2Fcv",
        "/api/images/logos/A",
    ],
)
async def test_public_route_serves_only_existing_stored_images(
    client: AsyncClient, path: str
) -> None:
    assert (await client.get(path)).status_code in (404, 422)


async def test_unversioned_address_is_checked_again(admin_client: AsyncClient) -> None:
    await put(admin_client, "/api/admin/contact-image", image_bytes("PNG"))

    response = await admin_client.get("/api/images/contact/page")
    assert response.headers["cache-control"] == "no-cache"


def test_image_bytes_helper_makes_real_images() -> None:
    assert Image.open(io.BytesIO(image_bytes("PNG"))).format == "PNG"
