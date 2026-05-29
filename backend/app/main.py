import logging
import sys

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.ai_analysis import router as ai_analysis_router
from app.api.auth import router as auth_router
from app.api.chat import router as chat_router
from app.api.payments import router as payments_router
from app.api.admin import router as admin_router
from app.api.transcriptions import router as transcriptions_router
from app.api.users import router as users_router
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


# Admin Origin guard: /api/admin/* принимает запросы только если Origin или
# Referer совпадает с ADMIN_APP_URL. Без этого админ-эндпоинты теоретически
# вызываются с любого origin'а с валидным JWT (csrf-style эскалация через XSS
# в публичном dicto.pro). Защита на уровне middleware ДО прохождения через
# get_current_admin — отказ происходит без раскрытия что endpoint существует.
@app.middleware("http")
async def admin_origin_guard(request: Request, call_next):
    if request.url.path.startswith("/api/admin/"):
        admin_origin = settings.ADMIN_APP_URL.rstrip("/") if settings.ADMIN_APP_URL else ""
        if admin_origin:
            origin = (request.headers.get("origin") or "").rstrip("/")
            referer = request.headers.get("referer") or ""
            referer_origin = ""
            if referer:
                # Достаточно проверить начало referer'а — точное совпадение origin'а.
                from urllib.parse import urlparse
                parsed = urlparse(referer)
                if parsed.scheme and parsed.netloc:
                    referer_origin = f"{parsed.scheme}://{parsed.netloc}"
            if origin != admin_origin and referer_origin != admin_origin:
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Admin endpoint access denied"},
                )
    return await call_next(request)

# CORS: строгий allowlist + санитизация — каждый origin валидируется как
# https://host[:port] (без trailing slash, без path, без wildcard). Это
# защищает от случайных пробелов в env-var и от accidental wildcard origin.
def _validate_origin(raw: str) -> str | None:
    raw = raw.strip().rstrip("/")
    if not raw:
        return None
    if raw == "*" or "*" in raw:
        # Никаких wildcard'ов — с allow_credentials=True wildcard это CSRF-риск
        # (некоторые браузеры всё равно пропускают, разный CORS-vendor behavior).
        return None
    if not (raw.startswith("https://") or raw.startswith("http://localhost") or raw.startswith("http://127.0.0.1")):
        # Прод-origin должен быть HTTPS. http://localhost разрешён для dev.
        return None
    return raw


_cors_origins_raw = [settings.APP_URL]
if settings.ADMIN_APP_URL:
    _cors_origins_raw.append(settings.ADMIN_APP_URL)
if settings.CORS_EXTRA_ORIGINS:
    _cors_origins_raw.extend(settings.CORS_EXTRA_ORIGINS.split(","))

_cors_origins = [o for o in (_validate_origin(x) for x in _cors_origins_raw) if o]
if not _cors_origins:
    raise RuntimeError("CORS: no valid origins configured (APP_URL/CORS_EXTRA_ORIGINS)")

# Явный allow-list заголовков и методов вместо "*" — лучше получить 4xx CORS
# на новый header чем тихо пропустить что-то странное.
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Accept-Language"],
    expose_headers=["Content-Disposition", "Content-Length", "Content-Range", "Accept-Ranges"],
    max_age=600,
)

app.include_router(admin_router)
app.include_router(auth_router)
app.include_router(users_router)
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
    """Liveness-проба: жив ли процесс. НЕ трогает БД (см. /api/health/deep)."""
    return {"status": "ok"}


@app.get("/api/health/deep", tags=["system"])
async def health_check_deep(db: "AsyncSession" = Depends(get_db)):
    """Readiness-проба: реально дёргает БД через ORM (SELECT всех колонок User).

    Ловит дрейф схемы (например, отсутствующую колонку после незакатанной
    миграции) — именно тот класс сбоя, который /api/health и поверхностный
    smoke не видят (инцидент 2026-05: register/login → 500, smoke зелёный).
    """
    from sqlalchemy import select

    from app.models.user import User

    try:
        await db.execute(select(User).limit(1))
    except Exception as e:
        logging.getLogger(__name__).error("Deep health DB check failed: %s", e)
        return JSONResponse(status_code=503, content={"status": "error", "db": "error"})
    return {"status": "ok", "db": "ok"}
