"""Резолвер ссылок Яндекс.Видео (видеопоиск) → ссылка на источник.

`yandex.ru/video/preview/<id>` и `ya.ru/...` — это страницы ВИДЕОПОИСКА Яндекса
(агрегатор), а не видеохостинг. yt-dlp их не тянет (экстрактор YandexVideoPreview
ломается на смене вёрстки). Но сама preview-страница содержит поле
`"videoUrl":"<источник>"` для конкретного видео — его и достаём, чтобы скормить
обычному yt-dlp-пайплайну (VK/RuTube/YouTube/Дзен уже поддерживаются).

Best-effort: при любой неудаче (капча, смена вёрстки, нет поля) возвращаем None —
вызывающий код покажет пользователю подсказку «вставьте прямую ссылку на источник».
"""
import logging
import re

import httpx

logger = logging.getLogger(__name__)

# Только preview-страницы видеопоиска (там одно конкретное видео). Поисковые
# /video/search?... не трогаем. Хост фиксирован yandex.ru/ya.ru → нет SSRF.
_PREVIEW_RE = re.compile(
    r"^https?://(?:www\.)?(?:yandex\.ru|ya\.ru)/video/(?:touch/)?preview/(\d+)",
    re.IGNORECASE,
)
_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


def is_yandex_preview_url(url: str) -> bool:
    """True для ссылок вида yandex.ru|ya.ru/video/preview/<id>."""
    return bool(_PREVIEW_RE.match(url or ""))


def extract_source_from_html(html: str, video_id: str) -> str | None:
    """Вытаскивает `videoUrl` нужного ролика из HTML preview-страницы.

    На странице целевой ролик помечен `"videoId":"<id>"`, а ссылка на источник —
    в соседнем `"videoUrl":"..."` (идёт после videoId; дальше — похожие результаты
    с другими id). `videoSrc` (тизер s3.yandex.net) игнорируем — это не полное видео.
    """
    low = html.lower()
    if "smartcaptcha" in low or "showcaptcha" in low or "checkcaptcha" in low:
        return None
    idx = html.find(f'"videoId":"{video_id}"')
    tail = html[idx:] if idx != -1 else html
    match = re.search(r'"videoUrl":"([^"]+)"', tail)
    if not match:
        return None
    source = match.group(1).replace("\\/", "/").strip()
    return source or None


async def resolve_yandex_video(url: str) -> str | None:
    """Резолвит preview-ссылку Яндекс.Видео в ссылку на источник. None при неудаче."""
    match = _PREVIEW_RE.match(url or "")
    if not match:
        return None
    video_id = match.group(1)
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
            resp = await client.get(
                url, headers={"User-Agent": _UA, "Accept-Language": "ru,en;q=0.9"}
            )
    except httpx.HTTPError as exc:
        logger.info("yandex preview %s: fetch failed: %s", video_id, exc)
        return None

    if resp.status_code != 200:
        logger.info("yandex preview %s: HTTP %s", video_id, resp.status_code)
        return None

    source = extract_source_from_html(resp.text, video_id)
    if source is None:
        logger.info("yandex preview %s: source (videoUrl) не найден", video_id)
    return source
