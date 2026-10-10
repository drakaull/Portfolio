from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Response, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_session

router = APIRouter(tags=["health"])


class HealthStatus(BaseModel):
    status: Literal["ok", "degraded"]
    database: Literal["ok", "unreachable"]


@router.get("/health")
async def health(
    session: Annotated[AsyncSession, Depends(get_session)], response: Response
) -> HealthStatus:
    try:
        await session.execute(text("SELECT 1"))
    # asyncpg raises plain OSError (e.g. connection refused) before SQLAlchemy can wrap it.
    except (SQLAlchemyError, OSError):
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return HealthStatus(status="degraded", database="unreachable")
    return HealthStatus(status="ok", database="ok")
