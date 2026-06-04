# Ops Runbook — Dicto (dicto.pro)

Что и где смотреть при сбоях. Все команды — на проде (Beget VPS, `cd /opt/aivoice`).
Контейнеры: `api`, `celery`, `celery-beat`, `frontend`, `admin-frontend`, `nginx`, `db`, `redis`.

> Прокси — это контейнер `aivoice-nginx-1` (на хосте nginx НЕТ). Reload: `docker compose -f docker-compose.prod.yml exec nginx nginx -s reload`.

## Быстрый health-check
```bash
bash scripts/check-prod.sh https://dicto.pro      # SSL, /docs, auth, /api/health/deep, register
```
Админка → вкладка **«Сбои»**: счётчики и последние упавшие транскрипции с причиной (без терминала).

---

## Симптом → что смотреть

| Симптом | Причина (частая) | Что сделать |
|---|---|---|
| Сайт/`/api` отдаёт **502** сразу после деплоя | nginx закэшировал старый IP пересозданного контейнера | `docker compose -f docker-compose.prod.yml exec nginx nginx -s reload`; сам отлипает за ~1-2 мин |
| **register/login = 500** | не накатилась миграция (`alembic`) | `curl -s https://dicto.pro/api/health/deep`; если 502/ошибка → `docker compose -f docker-compose.prod.yml run --rm api alembic upgrade head` |
| Транскрипция **failed** | ошибка скачивания/распознавания | `docker compose -f docker-compose.prod.yml logs --tail=200 celery \| grep -iA20 "<transcription_id>\|ERROR"` |
| **YouTube** «не удалось скачать» | бот-блок YouTube для IP сервера («Sign in to confirm you're not a bot») | Это не баг — best-effort. Логи: `logs celery \| grep youtube`. Лечится только cookies/прокси; пользователю — RuTube/VK/Дзен |
| **Яндекс.Видео** даёт подсказку вместо запуска | резолвер не нашёл источник (капча/смена вёрстки) | `logs api \| grep "yandex preview"`; проверить вручную `curl -A "Mozilla/5.0" <preview-url> \| grep -o '"videoUrl":"[^"]*"'` |
| **Оплата не открывается** | неверные ключи YooKassa | `docker compose -f docker-compose.prod.yml exec api printenv \| grep YOOKASSA` (SHOP_ID не должен быть `your-shop-id`); логи: `logs api \| grep -i payment` |
| Подписка не активировалась после оплаты | webhook YooKassa не дошёл/IP не в allowlist | `logs api \| grep -i webhook`; проверить, что вебхук настроен на текущий IP сервера |
| **admin.dicto.pro = 403** | IP не в allowlist `geo $admin_allowed` (nginx.prod.conf) | добавить IP в `nginx.prod.conf`, `git pull`, `nginx -s reload` (или `--force-recreate nginx`, если правка файла не подхватилась — single-file bind-mount) |
| Запись «висит» в `processing` | воркер упал во время обработки | `cleanup-stuck-processing` (каждые 5 мин) сам пометит failed; логи: `logs celery \| grep stuck` |
| Экспорт DOCX/SRT 500 | (исторически) сегмент без тайминга | уже исправлено; если повторится — `logs api \| grep export` |
| AI-анализ обрывается | (исторически) низкий `max_tokens` | исправлено (объём short/standard/detailed); `logs api \| grep ai_analysis` |

---

## Полезные команды
```bash
# Логи конкретного сервиса
docker compose -f docker-compose.prod.yml logs --tail=200 api
docker compose -f docker-compose.prod.yml logs --tail=200 celery

# Статусы контейнеров
docker compose -f docker-compose.prod.yml ps

# Кол-во failed-транскрипций в БД
docker compose -f docker-compose.prod.yml exec db sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT count(*) FROM transcriptions WHERE status='\''failed'\'';"'
```

## Деплой (напоминание)
```bash
cd /opt/aivoice
git pull origin main
docker compose -f docker-compose.prod.yml build api celery celery-beat frontend
docker compose -f docker-compose.prod.yml run --rm api alembic upgrade head   # если была миграция
docker compose -f docker-compose.prod.yml up -d --no-deps api celery celery-beat frontend
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
bash scripts/check-prod.sh https://dicto.pro
```
