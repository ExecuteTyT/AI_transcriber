import uuid
from io import BytesIO

import boto3
from botocore.config import Config as BotoConfig

from app.config import settings


class S3Service:
    """Сервис для работы с S3-хранилищем (Selectel)."""

    def __init__(self):
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT_URL,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
            config=BotoConfig(signature_version="s3v4"),
        )
        self.bucket = settings.S3_BUCKET_NAME

    def generate_file_key(self, original_filename: str) -> str:
        """Генерация уникального ключа для файла."""
        ext = original_filename.rsplit(".", 1)[-1] if "." in original_filename else ""
        return f"uploads/{uuid.uuid4()}.{ext}" if ext else f"uploads/{uuid.uuid4()}"

    def upload_file(self, file_data: bytes, file_key: str, content_type: str) -> str:
        """Загрузка файла в S3."""
        self.client.upload_fileobj(
            BytesIO(file_data),
            self.bucket,
            file_key,
            ExtraArgs={"ContentType": content_type},
        )
        return file_key

    def get_presigned_url(self, file_key: str, expires_in: int = 3600) -> str:
        """Получение presigned URL для скачивания."""
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": file_key},
            ExpiresIn=expires_in,
        )

    def download_file(self, file_key: str) -> bytes:
        """Скачивание файла из S3."""
        response = self.client.get_object(Bucket=self.bucket, Key=file_key)
        return response["Body"].read()

    def delete_file(self, file_key: str) -> None:
        """Удаление файла из S3."""
        self.client.delete_object(Bucket=self.bucket, Key=file_key)


s3_service = S3Service() if settings.S3_ACCESS_KEY else None
