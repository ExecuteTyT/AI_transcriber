from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.ai_analysis import router as ai_analysis_router
from app.api.auth import router as auth_router
from app.api.transcriptions import router as transcriptions_router
from app.config import settings

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


@app.get("/api/health", tags=["system"])
async def health_check():
    """Проверка работоспособности API."""
    return {"status": "ok"}
