"""152-ФЗ: журнал учёта действий с персональными данными.

Отдельный logger 'audit' с RotatingFileHandler — пишет в файл, ротация по
размеру и количеству бэкапов. Файл может выступать «журналом учёта» при
жалобах в РКН: показываем кто, когда, какое согласие дал/отозвал, какие
данные удалил.
"""
import json
import logging
import os
import sys
from logging.handlers import RotatingFileHandler

# Имя отдельного logger'а — мы НЕ хотим дублировать события в общий stdout
# (там и так структурированный JSON), но при дебаге локально пусть всё же видно.
AUDIT_LOGGER_NAME = "dicto.audit"

# Путь к файлу — берётся из env (для Docker монтируется как volume).
# Если переменная не задана — пишем в /var/log/dicto/audit.log в проде,
# либо в ./data/logs/audit.log локально.
_LOG_PATH_ENV = os.environ.get("AUDIT_LOG_PATH")
_DEFAULT_LOG_DIR = "/var/log/dicto" if os.environ.get("ENVIRONMENT") == "production" else "./data/logs"
_LOG_PATH = _LOG_PATH_ENV or os.path.join(_DEFAULT_LOG_DIR, "audit.log")


class JsonFormatter(logging.Formatter):
    """Однострочный JSON для каждой записи (одна строка = одно событие)."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "event": record.getMessage(),
        }
        # extra-поля (user_id, consent_type, ip и т.д.) попадают в record.__dict__.
        # Стандартные ключи logging фильтруем.
        std_keys = {
            "name", "msg", "args", "levelname", "levelno", "pathname", "filename",
            "module", "exc_info", "exc_text", "stack_info", "lineno", "funcName",
            "created", "msecs", "relativeCreated", "thread", "threadName",
            "processName", "process", "message", "asctime", "taskName",
        }
        for k, v in record.__dict__.items():
            if k not in std_keys and not k.startswith("_"):
                payload[k] = v
        return json.dumps(payload, ensure_ascii=False)


def _build_audit_logger() -> logging.Logger:
    logger = logging.getLogger(AUDIT_LOGGER_NAME)
    if logger.handlers:
        return logger  # уже инициализирован
    logger.setLevel(logging.INFO)
    logger.propagate = False  # НЕ дублируем в root logger

    # Файл с ротацией: 10MB на файл × 10 бэкапов = ~100MB истории.
    try:
        os.makedirs(os.path.dirname(_LOG_PATH), exist_ok=True)
        file_handler = RotatingFileHandler(
            _LOG_PATH, maxBytes=10 * 1024 * 1024, backupCount=10, encoding="utf-8"
        )
        file_handler.setFormatter(JsonFormatter())
        logger.addHandler(file_handler)
    except OSError:
        # Если каталог недоступен (read-only FS или нет прав) — продолжаем
        # без файлового handler'а. Stdout-handler ниже сохраняет события.
        logging.getLogger(__name__).exception(
            "audit_log: failed to open file %s — falling back to stdout only", _LOG_PATH
        )

    # Дублируем в stdout для kubectl logs / docker logs (на проде агрегация в Loki).
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(JsonFormatter())
    logger.addHandler(stream_handler)

    return logger


audit_logger = _build_audit_logger()


def audit(event: str, **fields) -> None:
    """Записать событие в audit-журнал.

    Пример:
        audit("consent_granted", user_id=str(user.id), consent_type="pd_processing", ip="1.2.3.4")
    """
    audit_logger.info(event, extra=fields)
