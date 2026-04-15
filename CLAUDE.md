# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## О проекте

AI Voice — платформа транскрибации аудио/видео с AI-анализом (саммари, тезисы, action items, RAG-чат). Backend на FastAPI + Celery, frontend на React + Vite. Целевой рынок — Россия.

## Команды

### Запуск окружения
```bash
cp .env.example .env                # первый раз
docker compose up -d                # все сервисы
docker compose up -d db redis       # только инфра (для локальной разработки)
```

### Backend (выполнять из `backend/`)
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload    # API-сервер
pytest                                                        # все тесты
pytest tests/test_auth.py::test_login -v                      # один тест
alembic upgrade head                                          # применить миграции
alembic revision --autogenerate -m "описание"                 # создать миграцию
celery -A app.tasks.celery_app worker --loglevel=info --concurrency=2
```

### Frontend (выполнять из `frontend/`)
```bash
npm run dev                           # dev-сервер (port 3000)
npx vitest                            # все тесты
npx vitest run src/foo.test.ts        # один тест
npx tsc --noEmit                      # проверка типов
```

### Полезные URL
- API docs: http://localhost:8000/docs
- Frontend: http://localhost:3000

## Архитектура

### Слои backend
- **api/** — FastAPI роуты (thin controllers), используют `Depends()` для DI
- **services/** — бизнес-логика (auth, transcription, storage, ai_analysis, payment, rag_chat, email)
- **models/** — SQLAlchemy ORM с `UUIDMixin` и `TimestampMixin` (из `models/base.py`)
- **schemas/** — Pydantic-схемы request/response
- **tasks/** — Celery-задачи (async обработка транскрибации)

### Ключевые паттерны

**Dependency Injection**: `api/deps.py` содержит `get_db()` (AsyncSession) и `get_current_user()` (JWT → User). Все защищённые роуты используют `Depends(get_current_user)`.

**TranscriptionProvider ABC** (`services/transcription.py`): абстрактный класс. `VoxtralProvider` — основная реализация. Переключение провайдера — замена одного класса.

**Celery-задачи синхронные**: Celery не поддерживает async, поэтому `tasks/transcribe.py` использует синхронный SQLAlchemy engine (заменяет `+asyncpg` на чистый psycopg). Это осознанное решение, не баг.

**Пайплайн транскрибации**: Upload → S3 → Celery task (FFmpeg для видео → Voxtral → сохранение) → поллинг статуса клиентом.

**Rate limiting**: slowapi — строгие лимиты на auth-эндпоинтах (5/мин register, 10/мин login), 100/мин глобально. Отключается при `ENVIRONMENT=testing`.

**JWT**: access token 15 мин, refresh 7 дней. Frontend автоматически рефрешит через Axios interceptor (`src/api/client.ts`).

**Storage fallback**: `S3Service` для production, `LocalService` (filesystem) для разработки без S3.

### Frontend

- **React Router v7**: публичные (/, /login, /pricing, SEO-страницы) и защищённые роуты (/dashboard, /upload, /transcription/:id)
- **Zustand store** (`src/store/authStore.ts`): единый стор для auth-состояния
- **Axios client** (`src/api/client.ts`): interceptor добавляет Bearer token, auto-refresh при 401
- **API модули** (`src/api/`): отдельный файл на группу эндпоинтов (auth, transcriptions, payments)
- **SEO**: React Helmet Async для мета-тегов, SSR prerender (`scripts/prerender.ts`)

## Тестирование

### Backend тесты
- Используют SQLite in-memory (`conftest.py`), не PostgreSQL
- Фикстура `client` — httpx `AsyncClient` с ASGI transport
- Фикстура `db_session` — прямой доступ к тестовой БД
- Таблицы пересоздаются перед каждым тестом (`setup_db` auto-fixture)
- `app.dependency_overrides[get_db]` подменяет БД-сессию на тестовую

### Frontend тесты
- vitest + jsdom + @testing-library/react
- Setup: `src/test/setup.ts`

### CI (.github/workflows/ci.yml)
- **Frontend**: tsc → vite build → vitest
- **Backend**: pytest с PostgreSQL 16 (pgvector) + Redis 7. Сейчас `pytest || true` (soft fail)

### QA (regression)
- **После каждого деплоя**: `./scripts/check-prod.sh [https://voitra.pro]` — bash-smoke (SSL, HTTPS, auth enforcement, OpenAPI schema, security headers, ребрендинг, опц. SSH-healthcheck через `PROD_SSH=user@host`).
- **Раз в спринт / перед релизом**: ручной прогон [docs/qa-checklist.md](docs/qa-checklist.md) (30-40 мин) — auth / кабинет / upload → studio → AI / playback / платежи / admin / mobile / edges.

## Правила кода

- Коммиты — Conventional Commits (`feat:`, `fix:`, `docs:`, etc.)
- Docstrings на русском для публичных функций
- Type hints везде (Python), TypeScript strict (frontend)
- Pydantic-схемы для всех API request/response
- Роуты через FastAPI Router с тегами для OpenAPI
- Миграции только через Alembic
- Zustand для состояния (не Redux), Axios для HTTP (не fetch)
- Tailwind CSS для стилей

## Контекст для решений
- Себестоимость 1 часа аудио: ~19 ₽ (Voxtral 17 + LLM 1.5 + embeddings 0.03)
- AI-анализ: Gemini 2.5-flash (актуальная модель в `services/ai_analysis.py`), embeddings: OpenAI text-embedding-3-small
- Задачи проекта: `docs/tasks_v2.md`
