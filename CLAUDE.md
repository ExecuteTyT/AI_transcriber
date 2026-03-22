# AI Voice — Сервис умной транскрибации аудио и видео

## О проекте
AI Voice — платформа, которая превращает аудио и видео не просто в текст, а в структурированные инсайты: саммари, ключевые тезисы, action items, RAG-чат по транскрипту. Целевой рынок — Россия (фаза 1-2), затем глобальный (фаза 3).

## Технологический стек

### Backend
- **Python 3.12** + **FastAPI** (async, OpenAPI автодокументация)
- **Celery** + **Redis 7** (фоновая обработка транскрибации)
- **SQLAlchemy 2.0** (async) + **Alembic** (миграции)
- **PostgreSQL 16** + **pgvector** (данные + векторный поиск для RAG)

### Frontend
- **React 18** + **Vite** + **TypeScript**
- **Zustand** для state management
- **Axios** с JWT-интерцептором

### Транскрибация
- **Voxtral Transcribe V2** (Mistral AI) — основной провайдер ($0.003/мин)
  - Diarization (разметка спикеров) встроен
  - 13 языков включая русский
  - Файлы до 3 часов за один запрос
- **faster-whisper** — fallback-провайдер (если Voxtral не устроит по качеству русского)
- Абстракция через интерфейс `TranscriptionProvider`

### AI/LLM
- **GPT-4o-mini** — саммари, тезисы, action items (~1.5 ₽/транскрипт)
- **text-embedding-3-small** — embeddings для RAG-чата (~0.03 ₽/час аудио)

### Инфраструктура
- **Selectel VDS** (4 vCPU, 8 GB RAM)
- **Selectel S3** (файловое хранилище, очистка через 24ч)
- **Nginx** / **Caddy** (reverse proxy, SSL)
- **Docker** + **Docker Compose**
- **ЮKassa** (оплата: СБП, карты МИР/Visa/MC)

## Архитектура

### Ключевые принципы
1. **TranscriptionProvider** — абстрактный класс. VoxtralProvider и WhisperProvider реализуют один интерфейс. Переключение — замена одного класса.
2. **Пайплайн из 5 шагов**: Upload → FFmpeg (только для видео) → Voxtral (транскрибация + diarization) → LLM (AI-анализ) → Deliver
3. **Всё асинхронно**: Celery-задачи с retry (3x, exponential backoff). Юзер получает task_id и поллит статус.
4. **Одна БД для всего**: PostgreSQL хранит данные, pgvector хранит embeddings для RAG.

### Структура проекта
```
ai-voice/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, middleware
│   │   ├── config.py            # Pydantic BaseSettings
│   │   ├── models/              # SQLAlchemy модели
│   │   │   ├── user.py
│   │   │   ├── transcription.py
│   │   │   ├── subscription.py
│   │   │   └── embedding.py
│   │   ├── api/                 # FastAPI роуты
│   │   │   ├── auth.py
│   │   │   ├── transcriptions.py
│   │   │   ├── ai_analysis.py
│   │   │   ├── payments.py
│   │   │   └── users.py
│   │   ├── services/            # Бизнес-логика
│   │   │   ├── transcription.py # TranscriptionProvider ABC
│   │   │   ├── voxtral.py       # Voxtral V2 API клиент
│   │   │   ├── whisper.py       # faster-whisper fallback
│   │   │   ├── ai_analysis.py   # LLM (summary, chat, actions)
│   │   │   ├── storage.py       # S3 upload/download
│   │   │   └── payment.py       # YooKassa SDK
│   │   ├── tasks/               # Celery задачи
│   │   │   ├── celery_app.py
│   │   │   └── transcribe.py
│   │   └── utils/
│   ├── alembic/
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/                 # Axios клиент
│   │   └── store/               # Zustand
│   └── Dockerfile
├── landing/                     # Статические SEO-лендинги
├── docs/                        # Проектная документация
├── docker-compose.yml
├── nginx.conf
└── .env.example
```

### Схема БД (основные таблицы)

**users**: id (UUID PK), email (UNIQUE), password_hash, name, plan (free/start/pro), minutes_used, minutes_limit, created_at

**transcriptions**: id (UUID PK), user_id (FK), title, status (queued/processing/completed/failed), language, duration_sec, file_key (S3), full_text (TEXT), segments (JSONB: [{start, end, text, speaker}]), created_at, completed_at

**ai_analyses**: id (UUID PK), transcription_id (FK), type (summary/key_points/action_items), content (TEXT), model_used, tokens_used

**embeddings**: id (UUID PK), transcription_id (FK), chunk_index, chunk_text, start_time, end_time, embedding (VECTOR(1536))

**subscriptions**: id (UUID PK), user_id (FK), plan, yookassa_id, status (active/cancelled/expired), current_period_start, current_period_end

**chat_messages**: id (UUID PK), transcription_id (FK), user_id (FK), role (user/assistant), content, references (JSONB)

### API эндпоинты
- `POST /api/auth/register|login|refresh|logout` — JWT аутентификация
- `POST /api/transcriptions/upload` — загрузка файла
- `GET /api/transcriptions/{id}` — транскрипт + таймкоды + спикеры
- `GET /api/transcriptions/{id}/status` — статус обработки
- `GET /api/transcriptions` — список (пагинация)
- `DELETE /api/transcriptions/{id}` — удаление
- `GET /api/transcriptions/{id}/export/{format}` — экспорт (txt/srt/docx)
- `GET /api/transcriptions/{id}/summary` — AI-саммари
- `GET /api/transcriptions/{id}/key-points` — тезисы
- `GET /api/transcriptions/{id}/action-items` — action items
- `POST /api/transcriptions/{id}/chat` — RAG-чат
- `POST /api/payments/subscribe` — создать подписку
- `POST /api/payments/webhook` — вебхук ЮKassa
- `GET /api/payments/subscription` — текущая подписка + лимиты

## Правила кода

### Backend (Python)
- Типизация через **Pydantic** для всех API-схем (request/response)
- **Type hints** везде (параметры функций, возвращаемые значения)
- Docstrings на русском для публичных функций
- Все роуты через **FastAPI Router** с тегами для OpenAPI
- Миграции только через **Alembic**, никогда напрямую SQL
- Async SQLAlchemy сессии через `async_sessionmaker`
- Пароли — **bcrypt** (passlib)
- JWT — **python-jose** (access 15 мин, refresh 7 дней)
- Настройки — **Pydantic BaseSettings** + .env файл
- Тесты — **pytest** + **pytest-asyncio** + **httpx** (AsyncClient)

### Frontend (React/TypeScript)
- Функциональные компоненты + hooks
- **Zustand** для глобального состояния (не Redux)
- **Axios** с интерцептором для JWT refresh
- Все API-вызовы в `src/api/` (отдельный файл на группу)
- Компоненты в `src/components/`, страницы в `src/pages/`
- CSS: Tailwind CSS (utility-first)
- Тесты — **vitest** + **@testing-library/react**

### Общие правила
- Docker Compose для локальной разработки
- .env.example с описанием всех переменных
- Коммиты — Conventional Commits (feat:, fix:, docs:, etc.)
- Не коммитить .env, секреты, node_modules, __pycache__

## Тарифы и лимиты
| | Free | Старт (290 ₽) | Про (590 ₽) |
|---|---|---|---|
| Минут/мес | 15 | 300 (5ч) | 1200 (20ч) |
| Макс. файл | 10 мин | 2 часа | 3 часа |
| AI-саммари | 3/мес | ✔ | ✔ |
| Спикеры | ✗ | ✔ | ✔ |
| RAG-чат | ✗ | 5 вопр./транскрипт | Безлимит |
| Action items | ✗ | ✗ | ✔ |
| Экспорт | TXT | TXT/SRT/DOCX | TXT/SRT/DOCX |

## Текущие задачи
Полный список задач с подзадачами — в `docs/tasks_v2.md`.
Текущий спринт и статусы отслеживаются там же.

## Контекст для решений
- Себестоимость 1 часа аудио: ~19 ₽ (Voxtral 17 + LLM 1.5 + embeddings 0.03)
- Breakeven инфраструктуры: 14 платящих пользователей
- Бюджет на инфраструктуру: до 5 000 ₽/мес на старте
- SEO — основной канал привлечения (не платная реклама)
