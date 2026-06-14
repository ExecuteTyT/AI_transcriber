"""Медиа-утилиты: определение длительности до платного распознавания.

Длительность нужна, чтобы НЕ запускать дорогой Voxtral на файле, который не
влезает в баланс пользователя (защита от абьюза «один большой файл бесплатно»).
ffprobe локален и бесплатен.
"""
import logging
import os
import subprocess
import tempfile

logger = logging.getLogger(__name__)


def probe_duration_sec(data: bytes) -> int | None:
    """Длительность медиа (сек) через ffprobe. Best-effort: None при ошибке.

    None означает «не смогли определить» — вызывающий код должен НЕ блокировать
    (fallback на обычную обработку), чтобы не ломать загрузку из-за сбоя ffprobe.
    """
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".media") as tmp:
            tmp.write(data)
            tmp_path = tmp.name
        result = subprocess.run(
            [
                "ffprobe", "-v", "quiet",
                "-show_entries", "format=duration",
                "-of", "csv=p=0", tmp_path,
            ],
            capture_output=True, text=True, timeout=30,
        )
        out = (result.stdout or "").strip()
        if result.returncode != 0 or not out:
            return None
        return int(float(out))
    except (subprocess.SubprocessError, ValueError, OSError) as exc:
        logger.warning("probe_duration_sec failed: %s", exc)
        return None
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
