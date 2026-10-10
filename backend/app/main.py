from fastapi import FastAPI

from app.api.admin_auth import protected_router as admin_router
from app.api.admin_auth import public_router as admin_auth_router
from app.api.health import router as health_router
from app.api.home import router as home_router
from app.infra.config import settings

app = FastAPI(title="Portfolio API", debug=settings.debug)
app.include_router(health_router, prefix="/api")
app.include_router(home_router, prefix="/api")
app.include_router(admin_auth_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
