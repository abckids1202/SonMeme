from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.detection import router as detection_router
from app.api.warp import router as warp_router
from app.api.generation import router as generation_router
from app.config import get_settings
from app.lifespan import lifespan


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.frontend_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health_router, prefix="/api/v1")
    app.include_router(detection_router, prefix="/api/v1")
    app.include_router(warp_router, prefix="/api/v1")
    app.include_router(generation_router, prefix="/api/v1")
    return app


app = create_app()
