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
            config=BotoConfig(signature_version="s3v4"),
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
