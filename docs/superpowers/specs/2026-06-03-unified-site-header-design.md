# Дизайн: единая шапка SiteHeader на всех публичных страницах

## Context

После унификации футера (`SiteFooter`) осталась та же болезнь у шапки: у каждого типа публичной страницы — **своя инлайн-шапка**.

- **Landing** (`/`): полная навигация (Возможности · Кому · Тарифы · Блог), тогглы темы/звука, Войти/Попробовать, мобильное меню. Шапка `fixed`, прозрачная над hero → плотнеет при скролле.
- **SeoLanding** (30+ страниц), **BlogIndex**, **BlogArticle**, **Pricing** (standalone): урезанные шапки — лого + (иногда тогглы) + Войти/Попробовать, **без меню**.

Пользователь: «на /blog и /pricing нет меню» — навигация теряется, непоследовательно. Цель — единая шапка с полным меню везде (одобрен **вариант A**: один компонент, включая Landing).

**Отклонено:** вариант B (общая шапка только для внутренних, Landing — своя) — пользователь выбрал полную унификацию ради единого источника правды.

## Архитектура

Один компонент `SiteHeader` с пропом `overlay`, плюс извлечённый общий хелпер скролла. Поведение якорей определяется по текущему `pathname` (через `useLocation`), не по пропу — это развязывает «как выглядит» и «как ведут себя ссылки».

### `frontend/src/lib/scrollToSection.ts` (новый)
Извлекается из `Landing.tsx` (сейчас локальная функция). Нужен и шапке, и hero-кнопкам Landing (`scrollToSection("demo")`).
```ts
/** Плавный скролл к секции с компенсацией fixed-хедера (72px). */
export function scrollToSection(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 72;
  window.scrollTo({ top, behavior: "smooth" });
}
```

### `frontend/src/components/SiteHeader.tsx` (новый)

Проп: `{ overlay?: boolean }`.

**Позиционирование/фон:**
- `overlay` (Landing): `fixed top-0 left-0 right-0 z-50`, прозрачная при `scrollY ≤ 60`, при скролле — `bg-[var(--bg)]/80 backdrop-blur-2xl border-b`. Логика `scrolled` (rAF-throttled scroll listener) переносится сюда.
- default (внутренние): `sticky top-0 z-50`, всегда `bg-[var(--bg)]/80 backdrop-blur-xl border-b` (как сейчас у SeoLanding).

**Навигация (десктоп, `hidden md:flex`):**
- Возможности, Кому — поведение по `pathname`:
  - на `/` → `<button onClick={() => scrollToSection("features"|"use-cases")}>` (плавный внутристраничный скролл);
  - иначе → `<Link to="/#features"|"/#use-cases">` (переход на Landing; mount-эффект Landing доскролливает — он уже есть, читает `window.location.hash`).
- Тарифы → `<Link to="/pricing">`, Блог → `<Link to="/blog">`, лого → `<Link to="/">` — всегда.
- Звук `play("focus")` на hover пунктов (как сейчас на Landing).

**Правая группа:** `<SoundToggle/>` + `<ThemeToggle/>` (`hidden sm:flex`), «Войти» (`/login`), «Попробовать» (`/register`, `btn-accent`), бургер (`md:hidden`).

**Мобильное меню:** внутреннее состояние `mobileMenuOpen` (компонент самодостаточен). Полноэкранный оверлей `z-[60]`, те же пункты (с тем же pathname-поведением якорей: на `/` закрыть меню + scrollToSection, иначе Link `/#…` + закрыть), тогглы, Войти/Попробовать. Разметка 1:1 переносится из Landing.

**Доступность:** бургер с `aria-label`; nav-пункты — реальные `<button>`/`<Link>`.

### Подключение
| Файл | Изменение |
|---|---|
| `pages/Landing.tsx` | удалить инлайн `<header>` + мобильное меню + локальный `scrollToSection` + state `scrolled`/`mobileMenuOpen`; вставить `<SiteHeader overlay />`; hero-кнопки (`scrollToSection("demo")`) импортируют общий хелпер из `lib/scrollToSection`. `useSound` остаётся для hero-кнопок если используется. |
| `components/SeoLanding.tsx` | инлайн-шапка → `<SiteHeader />` |
| `pages/blog/BlogIndex.tsx` | инлайн-шапка → `<SiteHeader />` |
| `pages/blog/BlogArticle.tsx` | инлайн-шапка → `<SiteHeader />` |
| `pages/Pricing.tsx` | standalone-шапка → `<SiteHeader />` (появятся тогглы — единообразие) |

> Авторизованные зоны (`Layout.tsx`/`AuthLayout.tsx`, /dashboard и т.п.) — НЕ трогаем; у них своя навигация.

## Поведение якорей — таблица истинности
| Откуда кликнули | Возможности/Кому | Результат |
|---|---|---|
| Landing `/` | `scrollToSection("features")` | плавный скролл внутри страницы |
| /blog, /pricing, SEO | `Link to="/#features"` | переход на `/`, mount-эффект Landing скроллит к секции |

## Тестирование

`frontend/src/components/SiteHeader.test.tsx` (vitest + RTL + MemoryRouter):
1. На маршруте `/blog`: пункт «Возможности» — это ссылка с `href="/#features"`, «Кому» → `/#use-cases`; «Тарифы» → `/pricing`, «Блог» → `/blog`.
2. На маршруте `/`: «Возможности»/«Кому» — это `<button>` (нет href-навигации), т.е. рендерятся как кнопки скролла.
3. Бургер по умолчанию закрыт; клик открывает мобильное меню (появляется второй набор пунктов).

Хелпер `scrollToSection` тестируется косвенно (jsdom не делает layout) — отдельный юнит не требуется; проверяется через сценарий «/» (пункт = button).

## Верификация
- `npx tsc --noEmit` чисто; `npx vitest run` — все тесты + новый SiteHeader проходят.
- `npm run build` (на Linux/проде) — prerender 56 страниц ок; шапка с меню в статике (grep `/#features` или `/pricing` в `dist/blog/index.html`).
- Ручная проверка на проде: меню видно на /, /blog, /pricing, SEO-странице; на Landing шапка прозрачна над hero и плотнеет при скролле; «Возможности» с /blog ведёт на / и доскролливает к секции; мобильное меню открывается/закрывается.

## Вне объёма
- Изменение состава меню (4 пункта фиксированы).
- Навигация авторизованной зоны (Layout).
- Логика sticky/overlay для app-страниц.
