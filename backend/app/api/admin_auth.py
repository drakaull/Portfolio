import logging
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field

from app.api.dependencies import ADMIN_COOKIE, admin_router, get_admin_repository, require_admin
from app.domain.auth import MAX_PASSWORD_LENGTH, SESSION_LIFETIME, AdminUser
from app.infra.rate_limit import login_limiter
from app.infra.repositories.admin import AdminRepository
from app.infra.security import (
    burn_password_check_in_thread,
    hash_token,
    new_session_token,
    verify_password_in_thread,
)

logger = logging.getLogger(__name__)

# The browser sends the cookie only to admin API calls, never to public endpoints.
COOKIE_PATH = "/api/admin"

public_router = APIRouter(prefix="/admin", tags=["admin"])
protected_router = admin_router()


class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    # Capped so a huge password cannot make argon2 burn CPU.
    password: str = Field(min_length=1, max_length=MAX_PASSWORD_LENGTH)


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
    previous_token: Annotated[str | None, Cookie(alias=ADMIN_COOKIE)] = None,
) -> None:
    ip = _client_ip(request)
    if login_limiter.is_blocked(ip):
        logger.warning("Admin login blocked (too many failures) from ip=%s", ip)
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many attempts")
    # Count the attempt before any await: parallel requests would otherwise all pass the check
    # above before the first failure is recorded. A successful login forgives it below.
    login_limiter.record_failure(ip)

    credentials = await repository.get_credentials(body.username)
    if credentials is None:
        await burn_password_check_in_thread(body.password)
        valid = False
    else:
        valid = await verify_password_in_thread(credentials[1], body.password)

    if not valid:
        logger.warning("Admin login failed for username=%r from ip=%s", body.username, ip)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    login_limiter.forgive(ip)
    user = credentials[0]
    now = datetime.now(UTC)
    token, token_hash = new_session_token()
    await repository.delete_expired_sessions(now)
    if previous_token:  # signing in again replaces the previous session instead of adding one
        await repository.delete_session(hash_token(previous_token))
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
