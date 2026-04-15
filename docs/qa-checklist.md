# Scribi — QA regression checklist

Полный ручной regression-прогон для QA-инженера. Время прохождения: **30-40 минут**.

Запускать:
- После крупных feature-релизов
- Раз в спринт как sanity-check
- Перед публичным анонсом / медиа-упоминанием

Автоматическая часть (post-deploy smoke): `./scripts/check-prod.sh`

---

## Phase 1 — Pre-flight (5 мин)

### Окружение
- [ ] Chrome latest + DevTools (Console + Network)
- [ ] Incognito-вкладка для 2-го аккаунта
- [ ] Chrome DevTools device emulation: iPhone 14 Pro Max (430×932), Pixel 7 (412×915), iPhone SE (375×667)
- [ ] SSH на прод-сервер (для `docker compose logs`)

### Тестовые аккаунты
- [ ] `qa-free@scribi.test` — план Free
- [ ] `qa-start@scribi.test` — план Старт
- [ ] `qa-admin@scribi.test` — `is_admin=true`

### Тестовые файлы (`qa-assets/`)
- [ ] `short-audio.mp3` (30 сек, рус)
- [ ] `medium-video.mp4` (3 мин, 1 спикер)
- [ ] `multi-speaker.wav` (5 мин, 3 спикера)
- [ ] `huge-dummy.bin` (600 MB)
- [ ] `corrupted.mp3` (txt-файл с расширением .mp3)

---

## Phase 2 — Auth & Account

### 2.1 Register
- [ ] `/register` грузится, title «Регистрация \| Scribi»
- [ ] Пустой submit → HTML5-валидация
- [ ] Password 5 символов → inline-ошибка «минимум 8»
- [ ] Существующий email → toast 409
- [ ] Валидный email+pass → редирект `/dashboard`, plan=Free, 15 мин
- [ ] Welcome-email в inbox (если SMTP настроен)
- [ ] `access_token`/`refresh_token` в LocalStorage
- [ ] Rate-limit: 6 попыток → 429

### 2.2 Login
- [ ] `/login` форма + ссылка «Нет аккаунта?»
- [ ] Wrong password → toast, остаётся на странице
- [ ] Correct → `/dashboard` + данные юзера в sidebar
- [ ] Rate-limit 11 попыток → 429
- [ ] Show/hide password toggle работает

### 2.3 Session & Refresh
- [ ] Удалить `access_token` (оставить refresh) → auto-refresh прозрачный
- [ ] Удалить оба → 401 → редирект `/login`
- [ ] JWT с `exp` в прошлом → auto-refresh срабатывает

### 2.4 Logout
- [ ] Sidebar (desktop) / «Ещё» (mobile) → «Выйти» → confirm
- [ ] Подтвердить → редирект `/login`, localStorage очищен, API `/auth/logout` 200

### 2.5 Forgot / Reset password
- [ ] `/forgot-password` + email → toast + rate-limit 3/мин
- [ ] Email содержит ссылку `/reset-password?token=...&email=...`
- [ ] Разные пароли → «не совпадают»
- [ ] Валидные → success + редирект `/login`, старый пароль не работает
- [ ] Повторное использование токена → 400

### 2.6 Profile
- [ ] `/profile`: hero-avatar, info-rows, plan-chip
- [ ] Смена имени → toast, sidebar/header обновился
- [ ] Смена пароля: wrong current → toast
- [ ] Смена пароля: new≠confirm → toast
- [ ] Смена пароля: валидно → success, logout+login новым паролем работает

---

## Phase 3 — Cabinet / Dashboard

### 3.1 Greeting & UsageCard
- [ ] Greeting «Привет, `<имя>`» + дата
- [ ] Radial progress: count-up анимация, tabular числа, gradient
- [ ] Три micro-stats (Записей / Потрачено / Лимит)
- [ ] «Посмотреть тарифы» → `/app/pricing`
- [ ] 80%+ usage → CTA «Апгрейдить план», цвет → амбер
- [ ] 100%+ usage → цвет → rose

### 3.2 QuickActions
- [ ] 3 tile-карточки: Новая запись / Чат с записью / Экспорт
- [ ] «Чат с записью» active только если есть completed
- [ ] Hover (desktop): y:-2 лифт
- [ ] Mobile: горизонтальный scroll пальцем

### 3.3 Transcription list
- [ ] Filter-chips «Все / В работе / Готово» — pill-fill на активном
- [ ] Search по title + filename
- [ ] Hover row (desktop): shadow-raised + border
- [ ] Mini-waveform на completed (sm:+)
- [ ] Status-icon: queued=amber, processing=primary+spin+ping, completed=emerald, failed=rose
- [ ] Click → `/transcription/:id`
- [ ] «…» → sheet «Открыть / Удалить»
- [ ] «Удалить» → confirm → DELETE → toast, ряд исчезает с анимацией

### 3.4 States
- [ ] Нет транскрипций: EmptyState + Mic-icon + CTA «Загрузить файл»
- [ ] Slow 3G: LoadingRows (3 шиммер)
- [ ] Search без совпадений: EmptyState (compact)

---

## Phase 4 — Transcription pipeline

### 4.1 Upload
- [ ] `/upload` drag-drop `short-audio.mp3` → circular progress 0→100%
- [ ] После 100% → PipelineSteps (Upload ✓ → Конвертация active → Транскрибация → AI-анализ)
- [ ] Редирект на `/transcription/:id` через ~600ms
- [ ] `corrupted.mp3` → 400 «Неподдерживаемый формат»
- [ ] `huge-dummy.bin` (600MB) → dropzone rejection
- [ ] При 0 минут: 403 → ErrorState + CTA `/app/pricing`

### 4.2 Status polling
- [ ] Processing: анимированная spinner-карточка, filename, «1-3 минуты»
- [ ] Network: polling `/status` каждые 3 сек
- [ ] Через 1-3 мин → completed, страница перерендерилась в «студию»
- [ ] `minutes_used` обновился в sidebar
- [ ] Failed (симулировать) → ErrorState + «Загрузить заново»/«К списку»

### 4.3 Студия
- [ ] Header: title (truncate), chips (RU, duration, words count, speakers count)
- [ ] Segmented-tabs с `layoutId` spring indicator
- [ ] Tab «Транскрипт»: mono таймкод + speaker chip + текст
- [ ] Speaker-filter chips: клик скрывает
- [ ] Rename speaker (pencil) → sheet → обновляются все упоминания
- [ ] Search: `<mark>` подсветка; пусто → EmptyState
- [ ] «Саммари»: markdown рендерится
- [ ] «Тезисы»: другой контент
- [ ] «Задачи» (Free/Старт): LockedState с Crown
- [ ] «Чат»: EmptyState «Задайте вопрос»

### 4.4 AI лимиты
- [ ] qa-free: 3 саммари/мес → 4-я → LockedState «Лимит исчерпан»
- [ ] qa-start: summary/key-points/chat работают
- [ ] qa-pro: всё, включая action-items

### 4.5 Export
- [ ] Desktop: TXT / SRT / DOCX → скачиваются, имя файла с кириллицей корректно (RFC 5987)
- [ ] TXT: текст с таймкодами и спикерами
- [ ] SRT: валидный формат
- [ ] DOCX: открывается в Word, форматирование ок
- [ ] Mobile: sheet «Экспорт» работает
- [ ] Export transcription.status=queued → 400

### 4.6 Chat (RAG)
- [ ] qa-free: 403 + CTA
- [ ] qa-start: отправить вопрос → typing-indicator → ответ через 3-10с
- [ ] Ответ содержит clickable references `[2:34]`
- [ ] Remaining counter уменьшается
- [ ] Исчерпать 5 вопросов → input заменяется CTA «Перейти на Про»
- [ ] qa-pro: без лимита
- [ ] Пустой/whitespace → Send disabled
- [ ] Enter/Shift+Enter работают

### 4.7 Delete
- [ ] Удалить → ряд исчез, старый URL → 404 EmptyState
- [ ] S3-файл удалён

---

## Phase 5 — Audio playback

- [ ] Completed → sticky AudioPlayerBar сверху: play/pause, waveform (48 bars), tabular time, rate chip
- [ ] Play → bars заполняются gradient пропорционально currentTime
- [ ] Click на waveform → seek
- [ ] Focus scrubber + ←/→ → skip ±5 сек
- [ ] Arrow buttons (desktop): skip ±10
- [ ] Rate chip: 1x → 1.25 → 1.5 → 2 → 1 (mobile цикл) / сегментированный выбор (desktop)
- [ ] Playback + transcript: активный сегмент подсвечен (bg primary-50 + ring + glow), auto-scroll в центр
- [ ] Click на таймкод сегмента: seek
- [ ] `audio-url` 404: player не отрисован, страница работает
- [ ] Network: `GET /audio-url` → `{url, content_type}`; далее `<audio>` 206 Partial Content с Range
- [ ] Reduced-motion OS: анимации приглушены

---

## Phase 6 — Plans & Payments

### 6.1 Pricing visual
- [ ] `/app/pricing`: header + CurrentPlanBar (gradient + progress)
- [ ] Free: flat white, ring-1, groups, CTA disabled («Текущий»)
- [ ] Старт: ring-2 primary + shadow-raised + badge «Популярный»
- [ ] Pro: dark gradient + Crown + radial-glow
- [ ] Trust-row: Shield/CreditCard/Zap с иконками
- [ ] FAQ-accordion (5 вопросов): первый открыт, плавная height-animation ~280ms
- [ ] Final CTA-banner: gradient primary→accent с grid-texture
- [ ] Hover card (desktop): y:-2 лифт
- [ ] Mobile: карточки stacked, badges не обрезаются

### 6.2 Subscribe flow
- [ ] qa-free → «Оформить Старт» → redirect на YooKassa confirmation_url
- [ ] Оплата test-картой `5555 5555 5555 4444` → redirect на `/subscription`
- [ ] Backend logs: `payment.succeeded`, план free→start, лимит 15→300, current_period_end установлен
- [ ] Sidebar/header: plan-chip «Старт», лимит 300 мин
- [ ] Subscribe на тот же план → 409 или disabled

### 6.3 Cancel
- [ ] `/subscription`: hero-card + usage-progress + feature-list
- [ ] «Отменить» → confirm → toast, status=cancelled, current_period_end остаётся
- [ ] После периода (симулировать) → план откатывается на Free, лимит 15

### 6.4 Edge
- [ ] YooKassa 503 → ErrorState «Платёжный сервис временно недоступен»
- [ ] Duplicate webhook → план обновляется 1 раз
- [ ] Invalid webhook signature → 400

---

## Phase 7 — Admin

- [ ] qa-free: `/admin` → 403/redirect или «Доступ запрещён»
- [ ] qa-admin: видит stats (users/transcriptions counts, revenue, signups)
- [ ] Users table: пагинация, search, клик → детали
- [ ] Change plan: PATCH, у пользователя обновляется
- [ ] Delete user: confirm, каскадное удаление + S3-очистка
- [ ] Transcriptions admin-table: видно ВСЕ записи
- [ ] Delete any transcription: работает

---

## Phase 8 — Mobile UX

### 8.1 Navigation
- [ ] BottomTabBar: 5 слотов симметрично (Главная / Тарифы / FAB / Профиль / Ещё)
- [ ] FAB gradient glow + top-notch indicator на активной
- [ ] FAB не перекрывает контент (spacer 96px + safe-area)
- [ ] MobileTopBar: scroll-aware border
- [ ] На `/transcription/:id` bar не перекрывает последний сегмент

### 8.2 Touch & gestures
- [ ] Все кнопки ≥44×44 (DevTools → Rendering → Touch target highlight)
- [ ] MobileSheet: swipe-down dismiss
- [ ] Long-press, swipe не конфликтуют со scroll

### 8.3 Safe-area (iOS device)
- [ ] Home indicator не перекрывает bottom tab
- [ ] Notch не перекрывает top bar

### 8.4 Landscape
- [ ] Нет horizontal scroll
- [ ] Keyboard не ломает layout

---

## Phase 9 — Edge cases

- [ ] Network offline → toast «Нет соединения»
- [ ] 500 от API → ErrorState (не белый экран)
- [ ] Slow 3G `/dashboard` → Skeleton-shimmer
- [ ] Expired JWT (1 час) → auto-refresh незаметно
- [ ] Expired refresh (7 дней) → редирект `/login` + toast
- [ ] Direct URL `/dashboard` без auth → `/login?next=/dashboard`
- [ ] После login возврат на `next`
- [ ] Два tab'а одновременно upload: оба работают, лимит server-side
- [ ] Длинный title: truncate с ellipsis + full text в tooltip/sheet
- [ ] Unicode в имени/файле: рендерится и в UI и в export

---

## Регрессия — финал

### Критерии приёмки
- [ ] Phase 2-6 зелёные (критичные бизнес-процессы)
- [ ] Phase 7 (admin) зелёная
- [ ] Phase 8 (mobile) зелёная хотя бы на iPhone 14 Pro Max
- [ ] Phase 9 (edges) — нет белых экранов / silent failures
- [ ] `./scripts/check-prod.sh` exit 0

### Баг-трекинг
Каждый найденный баг → отдельный GitHub issue с:
- Shar Phase/Step номером (e.g. «4.3 Студия / Tab Чат»)
- Expected vs Actual
- Screenshot/Video
- Priority: P0 (блокирует revenue) / P1 (ломает UX) / P2 (cosmetic)

### Post-run
- Обновить этот файл (добавить/убрать шаги) по итогам
- Critical bugs → hotfix в тот же день
- P1 → следующий спринт
