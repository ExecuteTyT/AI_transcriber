#!/usr/bin/env bash
# Ежедневное автообновление yt-dlp в celery-воркере.
#
# Зачем: YouTube/VK постоянно меняют player/nsig/PO-token, и устаревший yt-dlp
# перестаёт вытаскивать форматы («This video is not available» на живых видео).
# Пин в requirements.txt — это «пол» (воспроизводимость сборки); этот скрипт
# держит рантайм-версию свежей между деплоями.
#
# Что делает: смотрит версию yt-dlp в работающем celery-контейнере, ставит
# свежую (pip install -U), и ТОЛЬКО если версия реально изменилась —
# перезапускает воркер (чтобы python перечитал пакет). Если уже свежая — ничего
# не трогает (воркер не дёргаем зря).
#
# Установка в cron (разово, на проде):
#   chmod +x /opt/aivoice/scripts/update-ytdlp.sh
#   (crontab -l 2>/dev/null; echo '30 5 * * * /opt/aivoice/scripts/update-ytdlp.sh >> /var/log/ytdlp-update.log 2>&1') | crontab -
# 05:30 — низкий трафик (рестарт воркера может прервать активную задачу).
#
# Ручной запуск:  bash scripts/update-ytdlp.sh

set -uo pipefail

APP_DIR="${APP_DIR:-/opt/aivoice}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
SVC="${SVC:-celery}"
RESTART_TIMEOUT="${RESTART_TIMEOUT:-30}"  # сек на тёплый shutdown воркера

cd "$APP_DIR" || { echo "$(date '+%F %T') ERROR: нет каталога $APP_DIR"; exit 1; }
COMPOSE="docker compose -f $COMPOSE_FILE"

ver() { $COMPOSE exec -T "$SVC" yt-dlp --version 2>/dev/null | tr -d '\r'; }

before="$(ver)"
if [ -z "$before" ]; then
  echo "$(date '+%F %T') ERROR: контейнер $SVC не отвечает / yt-dlp не найден — пропуск"
  exit 1
fi

# Обновление. pip идемпотентен: если уже свежая — просто 'already satisfied'.
if ! $COMPOSE exec -T "$SVC" pip install -U --no-cache-dir yt-dlp >/dev/null 2>&1; then
  echo "$(date '+%F %T') ERROR: pip install -U yt-dlp упал (сеть/PyPI?) — версия осталась $before"
  exit 1
fi

after="$(ver)"
if [ "$before" != "$after" ]; then
  $COMPOSE restart -t "$RESTART_TIMEOUT" "$SVC" >/dev/null 2>&1 \
    && echo "$(date '+%F %T') OK: yt-dlp $before -> $after, $SVC перезапущен" \
    || echo "$(date '+%F %T') WARN: yt-dlp обновлён $before -> $after, но рестарт $SVC не удался — перезапусти вручную"
else
  echo "$(date '+%F %T') OK: yt-dlp уже свежий ($after)"
fi
