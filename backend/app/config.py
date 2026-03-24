from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Настройки приложения из .env файла."""

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://aivoice:aivoice@localhost:5432/aivoice"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    JWT_ALGORITHM: str = "HS256"

    # Voxtral (Mistral AI)
    MISTRAL_API_KEY: str = ""
    TRANSCRIPTION_PROVIDER: str = "voxtral"

    # OpenAI (embeddings)
    OPENAI_API_KEY: str = ""

    # Google Gemini (LLM — analysis & chat)
    GOOGLE_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Embeddings
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSION: int = 1536

    # S3 (Selectel) — если S3_ACCESS_KEY пуст, используется локальное хранилище
    S3_ENDPOINT_URL: str = "https://s3.storage.selcloud.ru"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_BUCKET_NAME: str = "aivoice-files"
    S3_REGION: str = "ru-1"
    LOCAL_STORAGE_PATH: str = "./data/uploads"

    # YooKassa
    YOOKASSA_SHOP_ID: str = ""
    YOOKASSA_SECRET_KEY: str = ""
    YOOKASSA_WEBHOOK_SECRET: str = ""

    # SMTP (email)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@aivoice.ru"
    SMTP_FROM_NAME: str = "AI Voice"
    SMTP_USE_TLS: bool = True

    # Token expiry
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 60

    # App
    APP_URL: str = "http://localhost:3000"
    API_URL: str = "http://localhost:8000"
    CORS_EXTRA_ORIGINS: str = ""  # Доп. CORS origins через запятую (напр. https://app.vercel.app)
    ENVIRONMENT: str = "development"

    model_config = {"env_file": (".env", "../.env"), "env_file_encoding": "utf-8"}


settings = Settings()
