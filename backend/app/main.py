import logging
import sys

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.ai_analysis import router as ai_analysis_router
from app.api.auth import router as auth_router
from app.api.chat import router as chat_router
from app.api.payments import router as payments_router
from app.api.admin import router as admin_router
from app.api.transcriptions import router as transcriptions_router
from app.config import settings

# Structured logging
log_format = "%(asctime)s %(levelname)s %(name)s %(message)s"
if settings.ENVIRONMENT == "production":
    log_format = '{"time":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","message":"%(message)s"}'

logging.basicConfig(
    level=logging.INFO,
    format=log_format,
    stream=sys.stdout,
)

# Rate limiter
import os
_env = os.environ.get("ENVIRONMENT", settings.ENVIRONMENT)
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],
    enabled=_env not in ("testing", "test"),
)

app = FastAPI(
    title="AI Voice API",
    description="Сервис умной транскрибации аудио и видео",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_cors_origins = [settings.APP_URL]
if settings.CORS_EXTRA_ORIGINS:
    _cors_origins.extend(settings.CORS_EXTRA_ORIGINS.split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin_router)
app.include_router(auth_router)
app.include_router(transcriptions_router)
app.include_router(ai_analysis_router)
app.include_router(payments_router)
app.include_router(chat_router)


# Prometheus metrics
from prometheus_fastapi_instrumentator import Instrumentator
Instrumentator(
    should_group_status_codes=True,
    should_ignore_untemplated=True,
    excluded_handlers=["/metrics", "/api/health"],
).instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)


@app.get("/api/health", tags=["system"])
async def health_check():
    """Проверка работоспособности API."""
    return {"status": "ok"}
