import logging
import math
import os
import subprocess
import tempfile
import uuid
from datetime import datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings
from app.models.transcription import Transcription
from app.models.user import User
from app.services.storage import s3_service
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


def consume_minutes(
    bonus: int, used: int, limit: int, wallet: int, minutes: int
) -> tuple[int, int, int]:
    """Расход minutes по порядку bonus → monthly(до limit) → wallet.

    Возвращает (new_bonus, new_used, new_wallet). Остаток сверх всех ведёрок
    игнорируется (минуты «сгорают» — но upload-precheck это не пропустит).
    """
    if bonus > 0:
        spent = min(bonus, minutes)
        bonus -= spent
        minutes -= spent
    if minutes > 0 and limit > 0:
        avail = max(0, limit - used)
        spent = min(avail, minutes)
        used += spent
        minutes -= spent
    if minutes > 0 and wallet > 0:
        spent = min(wallet, minutes)
        wallet -= spent
        minutes -= spent
    return bonus, used, wallet


# Sync engine для Celery (Celery не поддерживает async)
sync_url = settings.DATABASE_URL.replace("+asyncpg", "")
sync_engine = create_engine(sync_url)
SyncSession = sessionmaker(sync_engine)

VIDEO_CONTENT_TYPES = {"video/mp4", "video/webm", "video/quicktime"}


def _has_audio_stream(path: str) -> bool:
    """Есть ли в файле звуковая дорожка (ffprobe). Видео без аудио — частый кейс
    (рилсы/сторис без звука): извлекать нечего, FFmpeg падал бы с невнятным дампом."""
    try:
        probe = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "a",
             "-show_entries", "stream=index", "-of", "csv=p=0", path],
            capture_output=True, text=True, timeout=60,
        )
        return bool(probe.stdout.strip())
    except Exception as e:  # noqa: BLE001 — если ffprobe не отработал, не блокируем (пусть решает ffmpeg)
        logger.warning("ffprobe audio-stream check failed for %s: %s", path, e)
        return True


def _extract_audio_from_video(video_path: str) -> str:
    """Извлечение аудиодорожки из видео через FFmpeg. Пользователю отдаём короткое
    понятное сообщение; полный stderr — только в лог."""
    if not _has_audio_stream(video_path):
        raise RuntimeError("В видео нет звуковой дорожки — расшифровывать нечего.")
    audio_path = video_path.rsplit(".", 1)[0] + ".wav"
    cmd = [
        "ffmpeg", "-i", video_path,
        "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
        "-y", audio_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if result.returncode != 0:
        logger.error("FFmpeg extract failed (%s): %s", video_path, result.stderr[-2000:])
        raise RuntimeError("Не удалось извлечь звук из видео. Возможно, файл повреждён или без аудио.")
    return audio_path


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=10,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
)
def process_transcription(self, transcription_id: str):
    """Пайплайн обработки: S3 → FFmpeg (если видео) → Voxtral → сохранение."""
    with SyncSession() as db:
        transcription = db.get(Transcription, uuid.UUID(transcription_id))
        if transcription is None:
            logger.error("Transcription %s not found", transcription_id)
            return

        # Обновляем статус + засекаем время начала обработки для stuck-janitor.
        from datetime import datetime, timezone

        transcription.status = "processing"
        transcription.processing_started_at = datetime.now(timezone.utc)
        db.commit()

        tmp_path = None
        audio_path = None
        try:
            # 1. Скачиваем файл из S3
            file_data = s3_service.download_file(transcription.file_key)

            with tempfile.NamedTemporaryFile(suffix=_get_suffix(transcription.content_type), delete=False) as tmp:
                tmp.write(file_data)
                tmp_path = tmp.name

            # 2. FFmpeg для видео
            audio_path = tmp_path
            if transcription.content_type in VIDEO_CONTENT_TYPES:
                audio_path = _extract_audio_from_video(tmp_path)

            # 3. Транскрибация (передаём выбранный пользователем язык, если есть)
            from app.services.transcription import get_provider
            provider = get_provider()
            language_hint = transcription.language if transcription.language and transcription.language != "auto" else None
            result = provider.transcribe(audio_path, language=language_hint)

            # 4. Сохранение результата. Язык: приоритет — ответ API; если API
            # не определил, оставляем то что выбрал пользователь.
            transcription.full_text = result.full_text
            transcription.segments = [seg.__dict__ for seg in result.segments]
            if result.language:
                transcription.language = result.language
            transcription.duration_sec = result.duration_sec
            transcription.status = "completed"
            transcription.completed_at = datetime.now(timezone.utc)

            # Списание минут по порядку: bonus (проба) → monthly-лимит (подписка)
            # → wallet (предоплаченный кошелёк). См. consume_minutes.
            user = db.get(User, transcription.user_id)
            if user and result.duration_sec:
                minutes = math.ceil(result.duration_sec / 60)
                user.bonus_minutes, user.minutes_used, user.wallet_minutes = consume_minutes(
                    user.bonus_minutes, user.minutes_used, user.minutes_limit,
                    user.wallet_minutes, minutes,
                )

            db.commit()

            logger.info("Transcription %s completed", transcription_id)

        except Exception as e:
            transcription.status = "failed"
            transcription.error_message = str(e)
            db.commit()
            logger.exception("Transcription %s failed: %s", transcription_id, e)
            raise
        finally:
            # Cleanup temp files
            for path in (tmp_path, audio_path):
                if path and os.path.exists(path):
                    try:
                        os.remove(path)
                    except OSError:
                        pass


def _get_suffix(content_type: str) -> str:
    """Получение расширения файла по MIME-типу."""
    mapping = {
        "audio/mpeg": ".mp3",
        "audio/wav": ".wav",
        "audio/x-wav": ".wav",
        "audio/flac": ".flac",
        "audio/ogg": ".ogg",
        "audio/mp4": ".m4a",
        "audio/x-m4a": ".m4a",
        "audio/aac": ".aac",
        "audio/webm": ".webm",
        "video/mp4": ".mp4",
        "video/webm": ".webm",
        "video/quicktime": ".mov",
    }
    return mapping.get(content_type, ".bin")
