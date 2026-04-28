import logging
import os
import uuid
from io import BytesIO
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)


class StorageBackend:
    """Абстрактный интерфейс хранилища файлов."""

    def generate_file_key(self, original_filename: str) -> str:
        """Генерация уникального ключа для файла."""
        ext = original_filename.rsplit(".", 1)[-1] if "." in original_filename else ""
        return f"uploads/{uuid.uuid4()}.{ext}" if ext else f"uploads/{uuid.uuid4()}"

    def upload_file(self, file_data: bytes, file_key: str, content_type: str) -> str:
        raise NotImplementedError

    def download_file(self, file_key: str) -> bytes:
        raise NotImplementedError

    def delete_file(self, file_key: str) -> None:
        raise NotImplementedError

    def get_presigned_url(self, file_key: str, expires_in: int = 3600) -> str | None:
        """Прямая ссылка на файл для <audio src>. None если бэкенд не поддерживает."""
        return None

    def object_exists(self, file_key: str) -> bool:
        """Физическое наличие объекта в хранилище. Должно быть быстрее чем GET (HEAD/stat)."""
        raise NotImplementedError

    def open_stream(self, file_key: str, start: int = 0, end: int | None = None):
        """Открыть поток байт для Range-запросов (локальный fallback)."""
        raise NotImplementedError

    def get_file_size(self, file_key: str) -> int:
        raise NotImplementedError

    def get_content_type(self, file_key: str) -> str:
        return "application/octet-stream"


class S3Service(StorageBackend):
    """S3-хранилище (Selectel / AWS)."""

    def __init__(self):
        import boto3
        from botocore.config import Config as BotoConfig

        self.client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT_URL,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
            config=BotoConfig(
                signature_version="s3v4",
                # vHosted-style (bucket.endpoint). Path-style deprecated у AWS и
                # у Selectel (см. их рекомендацию при создании бакета).
                s3={"addressing_style": "virtual"},
            ),
        )
        self.bucket = settings.S3_BUCKET_NAME

    def upload_file(self, file_data: bytes, file_key: str, content_type: str) -> str:
        """Загрузка файла в S3."""
        self.client.upload_fileobj(
            BytesIO(file_data),
            self.bucket,
            file_key,
            ExtraArgs={"ContentType": content_type},
        )
        return file_key

    def download_file(self, file_key: str) -> bytes:
        """Скачивание файла из S3."""
        response = self.client.get_object(Bucket=self.bucket, Key=file_key)
        return response["Body"].read()

    def delete_file(self, file_key: str) -> None:
        """Удаление файла из S3."""
        self.client.delete_object(Bucket=self.bucket, Key=file_key)

    def get_presigned_url(self, file_key: str, expires_in: int = 3600) -> str | None:
        """Короткоживущая S3 presigned URL для прямого <audio src>."""
        try:
            return self.client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": file_key},
                ExpiresIn=expires_in,
            )
        except Exception as exc:
            logger.warning("Failed to generate presigned URL: %s", exc)
            return None

    def object_exists(self, file_key: str) -> bool:
        """HEAD-запрос: проверяет физическое наличие объекта в бакете.

        Нужен перед выдачей presigned URL: иначе клиент получит signed URL,
        браузер попытается загрузить, S3 ответит 404, <audio> упадёт без
        внятной ошибки. Лучше отдать 410 Gone сразу.
        """
        try:
            self.client.head_object(Bucket=self.bucket, Key=file_key)
            return True
        except Exception as exc:
            # ClientError с code=404/NoSuchKey — нормальный отрицательный ответ.
            # Любые другие ошибки (auth/network) трактуем как "не уверены" → False,
            # пусть клиент увидит реальный 410, а не упадёт молча.
            logger.info("head_object(%s) failed: %s", file_key, exc)
            return False


class LocalStorage(StorageBackend):
    """Локальное файловое хранилище (для разработки без S3)."""

    def __init__(self):
        self.base_dir = Path(settings.LOCAL_STORAGE_PATH)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        logger.info("LocalStorage initialized at %s", self.base_dir)

    def upload_file(self, file_data: bytes, file_key: str, content_type: str) -> str:
        """Сохранение файла на диск."""
        file_path = self.base_dir / file_key
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(file_data)
        return file_key

    def download_file(self, file_key: str) -> bytes:
        """Чтение файла с диска."""
        file_path = self.base_dir / file_key
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_key}")
        return file_path.read_bytes()

    def delete_file(self, file_key: str) -> None:
        """Удаление файла с диска."""
        file_path = self.base_dir / file_key
        if file_path.exists():
            file_path.unlink()

    def open_stream(self, file_key: str, start: int = 0, end: int | None = None):
        """Возвращает file-handle, спозиционированный на start; читать до end (включительно)."""
        file_path = self.base_dir / file_key
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_key}")
        f = file_path.open("rb")
        if start:
            f.seek(start)
        return f

    def object_exists(self, file_key: str) -> bool:
        return (self.base_dir / file_key).exists()

    def get_file_size(self, file_key: str) -> int:
        file_path = self.base_dir / file_key
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_key}")
        return file_path.stat().st_size

    def get_content_type(self, file_key: str) -> str:
        import mimetypes

        mime, _ = mimetypes.guess_type(str(self.base_dir / file_key))
        return mime or "application/octet-stream"


def _create_storage() -> StorageBackend:
    """Выбор бэкенда хранилища: S3 если ключ есть, иначе локальное."""
    if settings.S3_ACCESS_KEY:
        logger.info("Using S3 storage (bucket=%s)", settings.S3_BUCKET_NAME)
        return S3Service()
    else:
        logger.info("S3 not configured — using local storage")
        return LocalStorage()


storage_service = _create_storage()

# Обратная совместимость
s3_service = storage_service
