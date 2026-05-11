# Deploy runbook — dicto.pro

Минимальный список шагов после `git pull origin main`. Все compliance-блокеры
закрыты на уровне кода — единственное что требуется вручную перед каждым
deploy'ем — проверить актуальность `.env`.

---

## 0. Pre-deploy чек

| Что | Где | Статус |
|---|---|---|
| JWT_SECRET_KEY | `.env` на проде | ⚠️ Должен быть `openssl rand -hex 32` — не `change-me-in-production` |
| YOOKASSA_SHOP_ID | `.env` на проде | 🟡 **Единственный ручной шаг.** Получить от ЮKassa и вставить |
| YOOKASSA_SECRET_KEY | `.env` на проде | 🟡 То же |
| YOOKASSA_WEBHOOK_SECRET | `.env` на проде | 🟡 То же |
| MISTRAL_API_KEY | `.env` на проде | ✅ Уже задан |
| GOOGLE_API_KEY | `.env` на проде | ✅ Уже задан |
| SMTP_PASSWORD | `.env` на проде | ✅ Уже задан |
| S3_ACCESS_KEY / S3_SECRET_KEY | `.env` на проде | ✅ Уже задан |
| APP_URL | `.env` на проде | ✅ `https://dicto.pro` |
| ENVIRONMENT | `.env` на проде | ✅ `production` |

**Если YooKassa-ключей нет:** платёжные эндпоинты вернут 503/500, но остальной
сервис работает (регистрация, транскрибация, AI-анализ, audit-логи, 152-ФЗ).

---

## 1. Стандартный deploy

```bash
ssh root@176.114.69.152
cd /opt/aivoice
git pull --ff-only origin main

# Применить новые миграции (если есть)
docker compose -f docker-compose.prod.yml run --rm api alembic upgrade head

# Пересобрать и перезапустить (зависит от того что менялось)
docker compose -f docker-compose.prod.yml build --pull api frontend
docker compose -f docker-compose.prod.yml up -d --force-recreate api frontend celery celery-beat

# Подождать прогрева API (~30с) и проверить
sleep 30
./scripts/check-prod.sh https://dicto.pro
```

---

## 2. Подмена YooKassa-ключей (когда дойдут)

Когда придут реальные ключи от ЮKassa, на проде:

```bash
cd /opt/aivoice
# Редактируем 3 переменные
nano .env
# Меняем:
#   YOOKASSA_SHOP_ID=...
#   YOOKASSA_SECRET_KEY=...
#   YOOKASSA_WEBHOOK_SECRET=...

# Перезапуск без ребилда — env подхватится
docker compose -f docker-compose.prod.yml up -d --force-recreate api celery

# Проверка
docker compose -f docker-compose.prod.yml logs api --tail 20 | grep -i yookassa
```

---

## 3. После первого deploy'я после refresh-token rotation (коммит `206e7a4`)

**Все активные сессии будут force-logout** на первом /refresh — это ожидаемое
поведение hard rollover. Пользователи перелогинятся один раз.

Если хочешь softer rollout — отправь баннер за 24 часа до deploy'я в Profile
с уведомлением «потребуется повторный вход».

---

## 4. Smoke checks после deploy

```bash
./scripts/check-prod.sh https://dicto.pro
```

Что должно вернуть зелёным:
- SSL valid
- Landing 200
- /docs 200
- /api/transcriptions unauth → 401
- OpenAPI schema parses
- Frontend carries 'Dicto'
- Security headers

Дополнительно вручную:
1. **Register** на свежий email с тремя согласиями → 201, два письма
2. **Login → /dashboard** → upload файла → транскрипция через 1-3 мин
3. **/privacy** открывается без авторизации, реквизиты ИП видны
4. **`docker compose exec api ls -la /var/log/dicto/`** — audit.log существует, JSON-строки внутри
5. **`tail -f /var/log/dicto/audit.log`** через docker volume — события идут

---

## 5. Откат (rollback)

```bash
# Найти коммит для отката
git log --oneline -10

# Откатить
git checkout <prev-commit-hash>
docker compose -f docker-compose.prod.yml run --rm api alembic downgrade -1
docker compose -f docker-compose.prod.yml build --pull api frontend
docker compose -f docker-compose.prod.yml up -d --force-recreate
```

⚠️ Downgrade миграций обычно работает, но проверь конкретную миграцию.
`j0e1f2a4b5c6` (security + integrity) — downgrade-safe.
`i9d0e1f2a4b5` (refresh tokens) — downgrade-safe.
`h8c9d0e1f2a4` (audio retention) — downgrade-safe.

---

## 6. Что зафиксировано (для проверки compliance/security)

- **152-ФЗ:** журнал согласий `user_consents`, retention `audio_delete_at`,
  audit-log `/var/log/dicto/audit.log`, право на забвение через `DELETE /api/users/me`
- **JWT:** refresh token rotation (RFC 6819 §5.2.2.3), reuse detection,
  revoke на logout/change-password/reset-password
- **Account security:** lockout 10 fail × 15 мин, hard rollover hard-coded
  при deploy
- **CORS:** strict allowlist, без wildcard, только HTTPS прод-origin'ы
- **S3:** presigned URL TTL 1ч, HEAD-check перед выдачей URL, media-token bind
  к transcription_id
- **Upload:** AbortController + 10-min timeout
- **Admin:** audit-log всех mutating ops, last-admin guard
- **Stuck-processing janitor:** auto-fail после 30 мин в processing

---

## 7. Что не закрыто (известные ограничения)

| Пункт | Влияние | Что делать |
|---|---|---|
| YooKassa webhook верификация | Финансовый риск — теоретически возможна подделка webhook'а с активацией Pro-плана | Получить dev-ключи ЮKassa → переделать на IP-whitelist + GET /v3/payments/{id} (3 часа) |
| Юр. адрес ИП в публичной /privacy | РКН может попросить добавить если будет проверка | Юр. адрес сейчас указывается только в форме РКН — закон не требует его в публичной политике |
| UI «Активные сессии» | UX-фича, не security | Поля в refresh_tokens готовы; отдельный PR |
