# Деплой: монетизация (кошелёк + проба + пейволл) — runbook

Дата подготовки: 2026-06-14. Ветка слита в `main` (merge `25328f3`).
Прод: Beget VPS `155.212.128.195`, `/opt/aivoice`, `docker-compose.prod.yml`, ручной SSH-редеплой.

## Что выкатывается
- Free → **проба**: 30 бонус-минут (новые юзеры), 1 бесплатный AI-разбор, чат — платный.
- **Кошелёк**: пакеты 299/690/1490 ₽ → `wallet_minutes` (новая таблица `wallet_topups` + колонка `users.wallet_minutes`).
- **Пейволл `402`** (нет минут / файл длиннее остатка / разбор/чат) → модалка «Кошелёк / Pro» с подсказкой «докинь X ₽».
- **Duration-gate**: файл/ссылка длиннее баланса не запускает Voxtral (анти-абьюз).
- **Экспорт DOCX/TXT** сгруппирован по спикерам (как у конкурента) + спикер-группировка на экране.
- Email аккаунта в описании платежа YooKassa.

## ⚠️ Мины (из опыта, не пропускать)
- **Alembic**: деплой без `alembic upgrade head` → register/upload = 500. ОБЯЗАТЕЛЬНО миграция.
- **nginx upstream stale**: после пересборки api/frontend прокси 502-ит (кэш старого IP) → `nginx -s reload`.
- **admin-cert**: не трогать nginx-конфиг без серта admin.dicto.pro (краш-цикл).

---

## Runbook

```bash
# 0. ЛОКАЛЬНО (уже сделано): main смержён, протестирован (бэк 166, фронт build:public ок), запушен.

# 1. SSH на прод
ssh root@155.212.128.195
cd /opt/aivoice

# 2. Подтянуть код
git pull origin main

# 3. СНАЧАЛА пересобрать образы (миграция-файл должен попасть в образ api!)
#    ⚠️ Грабли 2026-06-14: если запускать alembic ДО build, `run --rm api` берёт
#    СТАРЫЙ образ без новой миграции → no-op → api падает на отсутствующей колонке → 502.
docker compose -f docker-compose.prod.yml up -d db
docker compose -f docker-compose.prod.yml build api frontend

# 4. Применить миграцию на УЖЕ пересобранном образе
docker compose -f docker-compose.prod.yml run --rm api alembic upgrade head
#   ожидаем: Running upgrade ... -> p6e8f9a0b1c2 (wallet_minutes + wallet_topups)

# 5. Поднять api + frontend, снять stale-кэш nginx (иначе 502)
docker compose -f docker-compose.prod.yml up -d api frontend
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

# 6. Health
curl -s https://dicto.pro/api/health/deep   # должен быть ok (БД+миграции живы)
```

## Smoke после деплоя (обязательно)
1. **Auth round-trip**: зарегистрировать тестовый аккаунт → залогиниться (не 500).
2. **Новый free**: новый юзер получает 30 бонус-минут (не 180); 2-й AI-разбор → пейволл-модалка.
3. 🔴 **Реальный платёж за КОШЕЛЁК** (новый, ни разу не гонялся против боевой YooKassa):
   - В модалке пейволла нажать «Пополнить на 150 мин — 299 ₽» → пройти оплату.
   - Проверить начисление:
     ```sql
     -- на проде (docker compose exec db psql ...)
     SELECT email, wallet_minutes FROM users WHERE email='<тест>';
     SELECT * FROM wallet_topups ORDER BY created_at DESC LIMIT 3;
     ```
   - Ожидаем: `wallet_minutes = 150`, запись в `wallet_topups`. Если 0 — баг в webhook-ветке `metadata.type=wallet`, откат/фикс.
4. Подписка (start/pro) — регресс-проверка, что не сломалась (есть живые платящие).

## Откат
Миграция аддитивная (новая колонка+таблица) — данные не теряются. При проблеме:
```bash
git checkout <prev-sha> && docker compose -f docker-compose.prod.yml up -d --build api frontend
# миграцию откатывать обычно не нужно; при необходимости: alembic downgrade -1
```

## НЕ входит в этот деплой (отдельные задачи)
- Модалка «что изменилось» для вернувшихся free-юзеров (получат новые гейты без объяснения).
- Валидационный тест: лендинги `/dlya-konsultacij`, цели Метрики (`paywall_hit`/`checkout_started`), пауза/перенастройка Директа. **Сейчас кампания крутит старые видео-интенты → новый пейволл встретит «любопытный» трафик.** Тест запускать отдельно.
- Движок: Voxtral остаётся (= уровень конкурента); Gemini 3.5 Flash на платный разбор — отдельное решение.
