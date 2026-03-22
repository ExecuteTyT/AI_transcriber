import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.ai_analysis import router as ai_analysis_router
from app.api.auth import router as auth_router
from app.api.payments import router as payments_router
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

app = FastAPI(
    title="AI Voice API",
    description="Сервис умной транскрибации аудио и видео",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.APP_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(transcriptions_router)
app.include_router(ai_analysis_router)
app.include_router(payments_router)


@app.get("/api/health", tags=["system"])
async def health_check():
    """Проверка работоспособности API."""
    return {"status": "ok"}
