from fastapi import FastAPI

from app.api.health import router as health_router
from app.api.home import router as home_router
from app.infra.config import settings

app = FastAPI(title="Portfolio API", debug=settings.debug)
app.include_router(health_router, prefix="/api")
app.include_router(home_router, prefix="/api")
