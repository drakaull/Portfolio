import logging
from datetime import UTC, datetime
from typing import Annotated

import anyio
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field

from app.api.dependencies import ADMIN_COOKIE, get_admin_repository, require_admin
from app.domain.auth import SESSION_LIFETIME, AdminUser
from app.infra.rate_limit import login_limiter
from app.infra.repositories.admin import AdminRepository
from app.infra.security import burn_password_check, hash_token, new_session_token, verify_password

logger = logging.getLogger(__name__)

# The browser sends the cookie only to admin API calls, never to public endpoints.
COOKIE_PATH = "/api/admin"

public_router = APIRouter(prefix="/admin", tags=["admin"])
# Every route added to this router requires a valid admin session.
protected_router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    # Capped so a huge password cannot make argon2 burn CPU.
    password: str = Field(min_length=1, max_length=128)


class AdminOut(BaseModel):
    username: str


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


@public_router.post("/login", status_code=status.HTTP_204_NO_CONTENT)
async def login(
    body: LoginIn,
    request: Request,
    response: Response,
    repository: Annotated[AdminRepository, Depends(get_admin_repository)],
) -> None:
    ip = _client_ip(request)
    if login_limiter.is_blocked(ip):
        logger.warning("Admin login blocked (too many failures) from ip=%s", ip)
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many attempts")

    credentials = await repository.get_credentials(body.username)
    # argon2 is CPU-heavy: run it in a thread so other requests are not blocked meanwhile.
    if credentials is None:
        await anyio.to_thread.run_sync(burn_password_check, body.password)
        valid = False
    else:
        valid = await anyio.to_thread.run_sync(verify_password, credentials[1], body.password)

    if not valid:
        login_limiter.record_failure(ip)
        logger.warning("Admin login failed for username=%r from ip=%s", body.username, ip)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user = credentials[0]
    now = datetime.now(UTC)
    token, token_hash = new_session_token()
    await repository.delete_expired_sessions(now)
    await repository.create_session(user, token_hash, now + SESSION_LIFETIME)
    await repository.commit()
    response.set_cookie(
        ADMIN_COOKIE,
        token,
        max_age=int(SESSION_LIFETIME.total_seconds()),
        path=COOKIE_PATH,
        secure=True,
        httponly=True,
        samesite="strict",
    )
    logger.info("Admin login succeeded for username=%r from ip=%s", user.username, ip)


@public_router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    repository: Annotated[AdminRepository, Depends(get_admin_repository)],
    token: Annotated[str | None, Cookie(alias=ADMIN_COOKIE)] = None,
) -> None:
    if token:
        await repository.delete_session(hash_token(token))
        await repository.commit()
    response.delete_cookie(
        ADMIN_COOKIE, path=COOKIE_PATH, secure=True, httponly=True, samesite="strict"
    )


@protected_router.get("/me")
async def me(user: Annotated[AdminUser, Depends(require_admin)]) -> AdminOut:
    return AdminOut(username=user.username)
