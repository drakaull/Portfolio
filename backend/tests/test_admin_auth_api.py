import logging
from collections.abc import Iterator

import anyio
import pytest
from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import admin_auth
from app.infra.models import AdminSessionModel
from app.infra.rate_limit import login_limiter
from app.infra.repositories.admin import AdminRepository
from app.infra.security import hash_password, hash_token
from app.main import app

pytestmark = pytest.mark.anyio

PASSWORD = "correct horse battery"


@pytest.fixture(autouse=True)
def fresh_limiter() -> Iterator[None]:
    login_limiter.reset()
    yield
    login_limiter.reset()


@pytest.fixture
async def admin(session: AsyncSession) -> None:
    await AdminRepository(session).save_user("leonard", hash_password(PASSWORD))


async def login(client: AsyncClient, password: str = PASSWORD, username: str = "leonard"):
    return await client.post("/api/admin/login", json={"username": username, "password": password})


# --- Abuse cases -------------------------------------------------------------------------------


async def test_wrong_password_and_unknown_user_get_the_same_answer(
    client: AsyncClient, admin: None
) -> None:
    wrong_password = await login(client, password="wrong password!")
    unknown_user = await login(client, username="nobody")

    assert wrong_password.status_code == unknown_user.status_code == 401
    assert wrong_password.json() == unknown_user.json() == {"detail": "Invalid credentials"}
    assert "set-cookie" not in wrong_password.headers


async def test_unknown_username_still_costs_a_full_password_check(
    client: AsyncClient, admin: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Without this dummy check, a fast 401 would reveal that the username does not exist.
    burned: list[str] = []

    async def spy(password: str) -> None:
        burned.append(password)

    monkeypatch.setattr(admin_auth, "burn_password_check_in_thread", spy)

    await login(client, username="nobody", password="guess-1")
    await login(client, password="guess-2")  # known username: real check, no dummy

    assert burned == ["guess-1"]


async def test_failures_are_logged_without_the_password(
    client: AsyncClient, admin: None, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.INFO, logger="app.api.admin_auth"):
        await login(client, password="secret-attempt-123")
        await login(client)

    assert "failed for username='leonard'" in caplog.text
    assert "succeeded for username='leonard'" in caplog.text
    assert "secret-attempt-123" not in caplog.text
    assert PASSWORD not in caplog.text


async def test_eleventh_failure_within_the_window_is_refused(
    client: AsyncClient, admin: None
) -> None:
    for _ in range(10):
        assert (await login(client, password="wrong password!")).status_code == 401

    blocked = await login(client)  # even the right password is refused while blocked

    assert blocked.status_code == 429


async def test_parallel_attempts_cannot_bypass_the_limit(client: AsyncClient, admin: None) -> None:
    statuses: list[int] = []

    async def attempt() -> None:
        statuses.append((await login(client, password="wrong password!")).status_code)

    async with anyio.create_task_group() as group:
        for _ in range(15):
            group.start_soon(attempt)

    assert sorted(statuses) == [401] * 10 + [429] * 5


async def test_successful_logins_do_not_count_as_failures(client: AsyncClient, admin: None) -> None:
    for _ in range(9):
        await login(client, password="wrong password!")
    for _ in range(3):
        assert (await login(client)).status_code == 204

    assert (await login(client, password="wrong password!")).status_code == 401


async def test_protected_routes_reject_missing_forged_expired_and_logged_out_sessions(
    client: AsyncClient, admin: None, session: AsyncSession
) -> None:
    assert (await client.get("/api/admin/me")).status_code == 401
    forged = {"Cookie": "admin_session=forged-token"}
    assert (await client.get("/api/admin/me", headers=forged)).status_code == 401

    response = await login(client)
    token = response.cookies["admin_session"]
    stolen = {"Cookie": f"admin_session={token}"}
    await session.execute(update(AdminSessionModel).values(expires_at=AdminSessionModel.created_at))
    assert (await client.get("/api/admin/me", headers=stolen)).status_code == 401

    response = await login(client)
    token = response.cookies["admin_session"]
    await client.post("/api/admin/logout")
    replay = {"Cookie": f"admin_session={token}"}
    assert (await client.get("/api/admin/me", headers=replay)).status_code == 401


async def test_every_admin_route_requires_a_session(client: AsyncClient) -> None:
    # The OpenAPI schema is FastAPI's public list of routes (included routers stay nested).
    public = {"/api/admin/login", "/api/admin/logout"}
    protected = [
        (method, path)
        for path, operations in app.openapi()["paths"].items()
        if path.startswith("/api/admin") and path not in public
        for method in operations
    ]
    assert protected, "no protected admin route found"

    for method, path in protected:
        response = await client.request(method.upper(), path)
        assert response.status_code == 401, f"{method.upper()} {path} is not protected"


# --- Normal use --------------------------------------------------------------------------------


async def test_login_sets_a_hardened_cookie_and_stores_only_its_hash(
    client: AsyncClient, admin: None, session: AsyncSession
) -> None:
    response = await login(client)

    assert response.status_code == 204
    cookie = response.headers["set-cookie"].lower()
    for flag in ("httponly", "secure", "samesite=strict", "path=/api/admin", "max-age=28800"):
        assert flag in cookie
    token = response.cookies["admin_session"]
    stored = list(await session.scalars(select(AdminSessionModel.token_hash)))
    assert stored == [hash_token(token)]


async def test_signed_in_admin_can_read_me_then_log_out(client: AsyncClient, admin: None) -> None:
    await login(client)

    me = await client.get("/api/admin/me")
    assert me.status_code == 200
    assert me.json() == {"username": "leonard"}

    logout = await client.post("/api/admin/logout")
    assert logout.status_code == 204
    assert (await client.get("/api/admin/me")).status_code == 401


async def test_signing_in_again_ends_the_previous_session(
    client: AsyncClient, admin: None, session: AsyncSession
) -> None:
    first_token = (await login(client)).cookies["admin_session"]
    await login(client)  # the client sends the first cookie along

    replay = {"Cookie": f"admin_session={first_token}"}
    assert (await client.get("/api/admin/me", headers=replay)).status_code == 401
    assert len(list(await session.scalars(select(AdminSessionModel)))) == 1


async def test_logout_without_session_is_harmless(client: AsyncClient) -> None:
    assert (await client.post("/api/admin/logout")).status_code == 204
