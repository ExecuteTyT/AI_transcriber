"""Celery-task: скачивание аудио по URL (YouTube / VK / Rutube / OK / Дзен)
через yt-dlp → S3 → запуск обычного process_transcription pipeline.

Отделён от tasks/transcribe.py чтобы не смешивать file-upload и url-ingest
(разные failure modes: geo-блок, age-restriction, 403 от origin).
"""
import logging
import os
import tempfile
import uuid

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models.transcription import Transcription
from app.services.storage import s3_service
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

sync_url = settings.DATABASE_URL.replace("+asyncpg", "")
sync_engine = create_engine(sync_url)
SyncSession = sessionmaker(sync_engine)


@celery_app.task(
    bind=True,
    max_retries=2,
    default_retry_delay=15,
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def process_url_transcription(self, transcription_id: str, url: str):
    """Скачивает аудио по URL через yt-dlp, грузит в S3, запускает основной pipeline.

    Transcription уже создана в БД upload-url endpoint'ом с status=queued
    и file_key=None. Здесь:
      1. yt-dlp → /tmp/{uuid}.m4a (bestaudio)
      2. Upload в S3 → Transcription.file_key, content_type="audio/mp4"
      3. transcription.status = "processing", вызываем process_transcription
    """
    import yt_dlp  # noqa: WPS433 — импорт внутри task чтобы не грузить worker если не нужно

    tmp_path: str | None = None

    with SyncSession() as db:
        transcription = db.get(Transcription, uuid.UUID(transcription_id))
        if transcription is None:
            logger.error("URL transcription %s not found", transcription_id)
            return

        try:
            # 1. yt-dlp: скачиваем bestaudio в m4a
            tmp_dir = tempfile.mkdtemp(prefix="ytdlp_")
            output_template = os.path.join(tmp_dir, f"{uuid.uuid4()}.%(ext)s")

            ydl_opts = {
                "format": "bestaudio[ext=m4a]/bestaudio/best",
                "outtmpl": output_template,
                "quiet": True,
                "no_warnings": True,
                "noprogress": True,
                # Ограничения: не скачиваем ≥ 4 часов, не плейлисты, не live.
                "max_filesize": 500 * 1024 * 1024,  # 500 MB — защита от 10-часовых стримов
                "noplaylist": True,
                "nocheckcertificate": False,
                "socket_timeout": 60,
                # SSRF-защита: whitelist конкретных extractor'ов. БЕЗ этого
                # yt-dlp использует generic-extractor, который следует редиректам
                # и парсит HTML на <video>/<source> — что превращает open-
                # redirector на youtube.com/redir в путь к http://169.254.169.254
                # (cloud metadata IP) или http://127.0.0.1:8000/api/admin.
                # Имена extractor'ов смотри в `yt-dlp --list-extractors`.
                "allowed_extractors": [
                    "youtube",
                    "youtube:tab",
                    "VKVideo",
                    "vk",
                    "Rutube",
                    "Odnoklassniki",
                    "OdnoklassnikiLive",
                    "Dzen",
                ],
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                # Дополнительная защита: проверяем что использованный extractor
                # из whitelist. yt-dlp обычно сам падает с UnsupportedError если
                # extractor не разрешён, но проверяем явно — на случай если
                # extractor вернул что-то generic-like (info["extractor"]).
                extractor_key = (info.get("extractor") or "").lower()
                if extractor_key in ("generic", "html5"):
                    raise ValueError(
                        f"Источник не поддерживается (extractor={extractor_key})"
                    )
                downloaded = ydl.prepare_filename(info)

            if not os.path.exists(downloaded):
                raise FileNotFoundError(f"yt-dlp не создал файл: {downloaded}")

            tmp_path = downloaded
            file_size = os.path.getsize(tmp_path)
            if file_size == 0:
                raise ValueError("Скачанный файл пуст")

            # 2. Upload в S3 под обычным file_key
            with open(tmp_path, "rb") as f:
                file_data = f.read()

            ext = os.path.splitext(tmp_path)[1].lstrip(".") or "m4a"
            file_key = s3_service.generate_file_key(f"url_{uuid.uuid4()}.{ext}")
            content_type = "audio/mp4" if ext in ("m4a", "mp4") else f"audio/{ext}"
            s3_service.upload_file(file_data, file_key, content_type)

            # 3. Обновляем Transcription и делегируем стандартному pipeline
            transcription.file_key = file_key
            transcription.content_type = content_type
            if not transcription.title and info.get("title"):
                transcription.title = info["title"][:500]
            if not transcription.original_filename:
                uploader = info.get("uploader") or info.get("extractor") or "url"
                transcription.original_filename = f"{uploader}_{info.get('id', 'video')}"[:500]
            # duration_sec проставится при основном pipeline — из Voxtral ответа.
            db.commit()

            logger.info(
                "URL transcription %s: downloaded %d MB from %s (title=%r), delegating to process_transcription",
                transcription_id, file_size // (1024 * 1024), info.get("extractor"),
                transcription.title,
            )

        except Exception as exc:
            transcription.status = "failed"
            transcription.error_message = _translate_ytdlp_error(str(exc))
            db.commit()
            logger.exception("URL transcription %s failed: %s", transcription_id, exc)
            # Перманентные ошибки (бот-блок YouTube, приват, удалено, гео, неподдерж.
            # источник) повторной попыткой не лечатся — НЕ ретраим, иначе воркер
            # 3× долбит источник и усугубляет IP-блок. Ретраим только транзиентное
            # (таймаут/сеть). Возврат без raise = celery не запускает autoretry.
            if _is_permanent_ytdlp_error(str(exc)):
                return
            raise
        finally:
            # Очистка tmp-файла. S3-копия уже загружена.
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                    os.rmdir(os.path.dirname(tmp_path))
                except OSError:
                    pass

    # Делегируем обычному pipeline (он сам поставит status=processing → completed).
    from app.tasks.transcribe import process_transcription
    process_transcription.delay(transcription_id)


def _translate_ytdlp_error(msg: str) -> str:
    """Переводит распространённые технические ошибки yt-dlp в понятные пользователю."""
    m = msg.lower()
    # Бот-защита YouTube для IP дата-центров («Sign in to confirm you're not a bot»).
    # Лечится только cookies/прокси; пользователю предлагаем RU-источники.
    if "not a bot" in m or "sign in to confirm" in m:
        return (
            "YouTube ограничил автоматическую загрузку этого видео с сервера. "
            "Попробуйте ссылку с RuTube, VK или Дзена — либо скачайте файл и загрузите напрямую."
        )
    if "private video" in m or "login required" in m:
        return "Видео приватное или требует авторизации"
    if "age" in m and ("restrict" in m or "confirm" in m):
        return "Видео с возрастным ограничением — невозможно скачать"
    if "unavailable" in m or "removed" in m:
        return "Видео удалено или недоступно в вашем регионе"
    if "live" in m:
        return "Нельзя распознать live-трансляцию"
    if "max_filesize" in m or "too large" in m:
        return "Видео превышает лимит (500 МБ)"
    if "timeout" in m or "timed out" in m:
        return "Сайт не ответил вовремя. Попробуйте ещё раз"
    return "Не удалось скачать видео. Проверьте ссылку и попробуйте снова."


def _is_permanent_ytdlp_error(msg: str) -> bool:
    """True для ошибок, которые повторная попытка НЕ исправит (не ретраить).

    Транзиентные (таймаут/сеть/временный сбой) → False (ретраим). Всё остальное
    из распознаваемых причин — перманентно для данной ссылки.
    """
    m = msg.lower()
    if "timeout" in m or "timed out" in m or "temporary" in m:
        return False
    permanent_markers = (
        "not a bot", "sign in to confirm",
        "private video", "login required",
        "age", "unavailable", "removed",
        "live", "max_filesize", "too large",
        "unsupported url", "is not a valid url",
    )
    return any(marker in m for marker in permanent_markers)
