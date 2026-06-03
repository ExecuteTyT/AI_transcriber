# Единая шапка SiteHeader — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Вынести навигационную шапку в общий компонент `SiteHeader`, используемый на всех публичных страницах (Landing, SEO-лендинги, блог, тарифы), убрав 4 разошедшиеся инлайн-шапки.

**Architecture:** Один `SiteHeader` с пропом `overlay` (Landing: fixed-прозрачная→сплошная при скролле; остальные: sticky-сплошная). Поведение якорей «Возможности/Кому» определяется по `pathname`: на `/` — плавный скролл (общий хелпер `lib/scrollToSection`), иначе — ссылка `/#features` (mount-эффект Landing доскролливает). Мобильное меню — внутри компонента.

**Tech Stack:** React 18, react-router-dom v7, TypeScript strict, Tailwind (CSS-vars), Vitest + @testing-library/react.

**Спек:** [docs/superpowers/specs/2026-06-03-unified-site-header-design.md](../specs/2026-06-03-unified-site-header-design.md)

---

## File Structure

| Файл | Ответственность |
|---|---|
| `frontend/src/lib/scrollToSection.ts` | **новый.** Общий smooth-scroll к секции (из Landing). |
| `frontend/src/lib/scrollToSection.test.ts` | **новый.** No-op при отсутствии элемента; scrollTo при наличии. |
| `frontend/src/components/SiteHeader.tsx` | **новый.** Единая шапка (overlay/solid, desktop+mobile nav, тогглы, CTA). |
| `frontend/src/components/SiteHeader.test.tsx` | **новый.** Поведение якорей по маршруту + открытие мобильного меню. |
| `frontend/src/pages/Landing.tsx` | убрать инлайн-шапку, мобильное меню, `scrolled`/`mobileMenuOpen`, локальный `scrollToSection`; `<SiteHeader overlay />`; hero-кнопки → общий хелпер. |
| `frontend/src/components/SeoLanding.tsx` | инлайн-шапка → `<SiteHeader />`. |
| `frontend/src/pages/blog/BlogIndex.tsx` | инлайн-шапка → `<SiteHeader />`. |
| `frontend/src/pages/blog/BlogArticle.tsx` | инлайн-шапка → `<SiteHeader />`. |
| `frontend/src/pages/Pricing.tsx` | standalone-шапка → `<SiteHeader />`. |

---

### Task 1: Хелпер `scrollToSection`

**Files:**
- Create: `frontend/src/lib/scrollToSection.ts`
- Test: `frontend/src/lib/scrollToSection.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
// frontend/src/lib/scrollToSection.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { scrollToSection } from "./scrollToSection";

describe("scrollToSection", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  });
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("ничего не делает, если элемента нет", () => {
    scrollToSection("missing");
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("скроллит, если элемент найден", () => {
    const el = document.createElement("div");
    el.id = "features";
    document.body.appendChild(el);
    scrollToSection("features");
    expect(window.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "smooth" }),
    );
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `cd c:\Files\Development\VS\AI_transcriber\frontend && npx vitest run src/lib/scrollToSection.test.ts`
Expected: cannot resolve "./scrollToSection".

- [ ] **Step 3: Создать хелпер**

```ts
// frontend/src/lib/scrollToSection.ts
/**
 * Плавный скролл к секции по id с компенсацией высоты fixed-хедера (72px).
 * No-op, если элемента нет (напр. секция есть только на Landing).
 */
export function scrollToSection(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 72;
  window.scrollTo({ top, behavior: "smooth" });
}
```

- [ ] **Step 4: Запустить — PASS**

Run: `cd c:\Files\Development\VS\AI_transcriber\frontend && npx vitest run src/lib/scrollToSection.test.ts`
Expected: 2 теста проходят.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/scrollToSection.ts frontend/src/lib/scrollToSection.test.ts
git commit -m "feat(nav): общий хелпер scrollToSection"
```

---

### Task 2: Компонент `SiteHeader`

**Files:**
- Create: `frontend/src/components/SiteHeader.tsx`
- Test: `frontend/src/components/SiteHeader.test.tsx`

- [ ] **Step 1: Написать падающий тест**

```tsx
// frontend/src/components/SiteHeader.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SiteHeader from "./SiteHeader";

function renderAt(path: string, overlay = false) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SiteHeader overlay={overlay} />
    </MemoryRouter>,
  );
}

describe("SiteHeader", () => {
  it("на внутренней странице якоря — ссылки на /#section", () => {
    renderAt("/blog");
    expect(screen.getByRole("link", { name: "Возможности" })).toHaveAttribute("href", "/#features");
    expect(screen.getByRole("link", { name: "Кому" })).toHaveAttribute("href", "/#use-cases");
    expect(screen.getByRole("link", { name: "Тарифы" })).toHaveAttribute("href", "/pricing");
    expect(screen.getByRole("link", { name: "Блог" })).toHaveAttribute("href", "/blog");
  });

  it("на Landing якоря — кнопки скролла, а не ссылки", () => {
    renderAt("/", true);
    expect(screen.getByRole("button", { name: "Возможности" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Возможности" })).toBeNull();
  });

  it("бургер открывает мобильное меню (дублирует пункты)", () => {
    renderAt("/blog");
    expect(screen.getAllByRole("link", { name: "Тарифы" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Открыть меню" }));
    expect(screen.getAllByRole("link", { name: "Тарифы" })).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `cd c:\Files\Development\VS\AI_transcriber\frontend && npx vitest run src/components/SiteHeader.test.tsx`
Expected: cannot resolve "./SiteHeader".

- [ ] **Step 3: Создать компонент** (EXACTLY):

```tsx
// frontend/src/components/SiteHeader.tsx
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SoundToggle from "@/components/ui/SoundToggle";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useSound } from "@/lib/sound";
import { scrollToSection } from "@/lib/scrollToSection";

interface SiteHeaderProps {
  /** Landing: фиксированная прозрачная шапка над hero, плотнеет при скролле. */
  overlay?: boolean;
}

const NAV_SECTIONS = [
  { id: "features", label: "Возможности" },
  { id: "use-cases", label: "Кому" },
] as const;

export default function SiteHeader({ overlay = false }: SiteHeaderProps) {
  const { pathname } = useLocation();
  const { play } = useSound();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const onLanding = pathname === "/";

  // Прозрачность → фон только в overlay-режиме (Landing).
  useEffect(() => {
    if (!overlay) return;
    let ticking = false;
    let prev = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const next = window.scrollY > 60;
        if (next !== prev) {
          prev = next;
          setScrolled(next);
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  const headerClass = overlay
    ? `fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "bg-[var(--bg)]/80 backdrop-blur-2xl border-b border-[var(--border)]"
          : "bg-transparent border-b border-transparent"
      }`
    : "sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl";

  // Якорь: на Landing — скролл-кнопка; иначе — ссылка /#id (Landing доскроллит на mount).
  const renderSection = (id: string, label: string, mobile: boolean) => {
    const cls = mobile
      ? "hover:text-[var(--accent)] transition py-2 px-4 touch-target"
      : "hover:text-[var(--fg)] transition-colors";
    if (onLanding) {
      return (
        <button
          key={id}
          type="button"
          onMouseEnter={mobile ? undefined : () => play("focus")}
          onClick={() => {
            if (mobile) setMobileMenuOpen(false);
            scrollToSection(id);
          }}
          className={cls}
        >
          {label}
        </button>
      );
    }
    return (
      <Link
        key={id}
        to={`/#${id}`}
        onMouseEnter={mobile ? undefined : () => play("focus")}
        onClick={mobile ? () => setMobileMenuOpen(false) : undefined}
        className={cls}
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      <header className={headerClass} style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="max-w-7xl mx-auto px-5 md:px-8 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-display text-2xl tracking-[-0.015em] text-[var(--fg)] leading-none">
            <span className="dot-accent" aria-hidden />
            Dicto
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-[var(--fg-muted)]">
            {NAV_SECTIONS.map((s) => renderSection(s.id, s.label, false))}
            <Link to="/pricing" onMouseEnter={() => play("focus")} className="hover:text-[var(--fg)] transition-colors">Тарифы</Link>
            <Link to="/blog" onMouseEnter={() => play("focus")} className="hover:text-[var(--fg)] transition-colors">Блог</Link>
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5">
              <SoundToggle />
              <ThemeToggle />
            </div>
            <Link to="/login" onClick={() => play("tick")} className="text-[13px] px-3 py-2 rounded-full font-medium text-[var(--fg-muted)] hover:text-[var(--fg)] hidden sm:inline-flex transition-colors">
              Войти
            </Link>
            <Link to="/register" onClick={() => play("confirm")} className="btn-accent hidden sm:inline-flex !py-2.5 !px-5 !text-[13px]">
              Попробовать
            </Link>
            <button
              onClick={() => {
                play("tick");
                setMobileMenuOpen((v) => !v);
              }}
              className="md:hidden p-3 rounded-xl transition touch-target hover:bg-[var(--bg-muted)]"
              aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6 text-[var(--fg)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-6 h-6 text-[var(--fg)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-[60] md:hidden"
          style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="absolute inset-0 bg-[var(--bg)]/95 backdrop-blur-lg" onClick={() => setMobileMenuOpen(false)} />
          <nav className="relative flex flex-col items-center justify-center h-full gap-6 font-display text-2xl text-[var(--fg)]">
            {NAV_SECTIONS.map((s) => renderSection(s.id, s.label, true))}
            <Link to="/pricing" onClick={() => setMobileMenuOpen(false)} className="hover:text-[var(--accent)] transition py-2 px-4 touch-target">Тарифы</Link>
            <Link to="/blog" onClick={() => setMobileMenuOpen(false)} className="hover:text-[var(--accent)] transition py-2 px-4 touch-target">Блог</Link>
            <div className="mt-4 flex items-center gap-3">
              <SoundToggle />
              <ThemeToggle />
            </div>
            <div className="flex flex-col gap-3 mt-2 w-64">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="px-8 py-3.5 rounded-full border border-[var(--border-strong)] text-center text-[var(--fg)] hover:bg-[var(--bg-muted)] transition font-sans text-[15px]">Войти</Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="btn-accent justify-center text-center">Попробовать</Link>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 4: Запустить — PASS**

Run: `cd c:\Files\Development\VS\AI_transcriber\frontend && npx vitest run src/components/SiteHeader.test.tsx`
Expected: 3 теста проходят.

- [ ] **Step 5: tsc**

Run: `cd c:\Files\Development\VS\AI_transcriber\frontend && npx tsc --noEmit` → без ошибок.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/SiteHeader.tsx frontend/src/components/SiteHeader.test.tsx
git commit -m "feat(nav): единый компонент SiteHeader (overlay/solid, mobile menu)"
```

---

### Task 3: SeoLanding → SiteHeader

**Files:** Modify `frontend/src/components/SeoLanding.tsx`

- [ ] **Step 1: Добавить импорт.** Рядом с `import SiteFooter from "@/components/SiteFooter";`:

```tsx
import SiteHeader from "@/components/SiteHeader";
```

- [ ] **Step 2: Заменить инлайн-шапку.** Найти блок `{/* ─── Header ─── */}` + весь следующий `<header className="sticky top-0 z-50 ...">…</header>` и заменить на:

```tsx
      <SiteHeader />
```

- [ ] **Step 3: Удалить ставшие неиспользуемыми импорты.** Если после замены `ThemeToggle`/`SoundToggle` больше не используются в файле — удалить их импорты (проверить grep по файлу). Прогнать tsc:

Run: `cd c:\Files\Development\VS\AI_transcriber\frontend && npx tsc --noEmit`
Expected: без ошибок (если ошибка про unused import — удалить именно его).

- [ ] **Step 4: Тесты**

Run: `cd c:\Files\Development\VS\AI_transcriber\frontend && npx vitest run` → все проходят.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/SeoLanding.tsx
git commit -m "refactor(nav): SeoLanding использует общий SiteHeader"
```

---

### Task 4: Блог → SiteHeader

**Files:** Modify `frontend/src/pages/blog/BlogIndex.tsx`, `frontend/src/pages/blog/BlogArticle.tsx`

- [ ] **Step 1: BlogIndex.** Добавить `import SiteHeader from "@/components/SiteHeader";`. Найти `{/* Header */}` + `<header className="sticky top-0 z-50 ...">…</header>` → заменить на `<SiteHeader />`. Удалить осиротевшие импорты `ThemeToggle`/`SoundToggle`, если стали неиспользуемыми.

- [ ] **Step 2: BlogArticle.** Прочитать файл, найти его инлайн `<header>…</header>` (sticky), добавить импорт `SiteHeader`, заменить на `<SiteHeader />`, удалить осиротевшие импорты.

- [ ] **Step 3: tsc + тесты**

Run: `cd c:\Files\Development\VS\AI_transcriber\frontend && npx tsc --noEmit && npx vitest run`
Expected: чисто; все тесты проходят.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/blog/BlogIndex.tsx frontend/src/pages/blog/BlogArticle.tsx
git commit -m "refactor(nav): блог использует общий SiteHeader"
```

---

### Task 5: Pricing → SiteHeader

**Files:** Modify `frontend/src/pages/Pricing.tsx`

- [ ] **Step 1: Добавить импорт** `import SiteHeader from "@/components/SiteHeader";` рядом с другими импортами.

- [ ] **Step 2: Заменить standalone-шапку.** В standalone-ветке (`return (<div className="min-h-screen ...">`) найти `<header className="sticky top-0 z-30 ...">…</header>` (лого + Войти + Попробовать) и заменить на:

```tsx
      <SiteHeader />
```

- [ ] **Step 3: tsc + тесты**

Run: `cd c:\Files\Development\VS\AI_transcriber\frontend && npx tsc --noEmit && npx vitest run`
Expected: чисто; все тесты проходят.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Pricing.tsx
git commit -m "refactor(nav): Pricing использует общий SiteHeader"
```

---

### Task 6: Landing → SiteHeader (overlay)

**Files:** Modify `frontend/src/pages/Landing.tsx`

- [ ] **Step 1: Импорты.** Рядом с `import Seo from "@/components/Seo";` добавить:

```tsx
import SiteHeader from "@/components/SiteHeader";
import { scrollToSection } from "@/lib/scrollToSection";
```

- [ ] **Step 2: Удалить локальную `scrollToSection`.** Удалить функцию (комментарий «Программный скролл…» + `const scrollToSection = (id: string) => { … };`). Вызовы `scrollToSection("demo")` в hero и mount-эффекте теперь резолвятся в импортированный хелпер — НЕ менять call-sites.

- [ ] **Step 3: Удалить состояние и scroll-listener шапки.** В компоненте `Landing` удалить:
  - `const [mobileMenuOpen, setMobileMenuOpen] = useState(false);`
  - `const [scrolled, setScrolled] = useState(false);`
  - весь `useEffect` со scroll-listener (rAF, `setScrolled`).
  
  Оставить mount-эффект с `window.location.hash` (deep-link скролл) — он использует `scrollToSection` (теперь импортированный) и нужен для прихода с `/#features`.

- [ ] **Step 4: Заменить инлайн-шапку и мобильное меню.** Удалить блок `{/* ─── Header (dark-first, editorial) ─── */}` + `<header …>…</header>` И следующий блок `{/* ─── Mobile Menu ─── */}` + `{mobileMenuOpen && ( … )}`. На месте шапки вставить:

```tsx
      <SiteHeader overlay />
```

- [ ] **Step 5: Подчистить неиспользуемые импорты.** Если `SoundToggle`/`ThemeToggle` больше не используются в Landing (они были только в шапке) — удалить их импорты. `useSound`/`play` оставить, если используется hero-кнопками (проверить grep `play(`). `useState` оставить (используется в `useCountUp`).

Run: `cd c:\Files\Development\VS\AI_transcriber\frontend && npx tsc --noEmit`
Expected: без ошибок. Любую ошибку про unused import — устранить удалением именно этого импорта.

- [ ] **Step 6: Тесты**

Run: `cd c:\Files\Development\VS\AI_transcriber\frontend && npx vitest run`
Expected: все проходят.

- [ ] **Step 7: Проверить отсутствие осиротевшего `<header`/мобильного меню**

Run (из корня): `grep -n "<header" frontend/src/pages/Landing.tsx`
Expected: пусто (шапки в Landing больше нет — она в SiteHeader).

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/Landing.tsx
git commit -m "refactor(nav): Landing использует общий SiteHeader (overlay)"
```

---

### Task 7: Сборка, ревью, деплой

**Files:** —

- [ ] **Step 1: Полный прогон**

Run: `cd c:\Files\Development\VS\AI_transcriber\frontend && npx tsc --noEmit && npx vitest run`
Expected: типы чисто; все тесты (вкл. scrollToSection, SiteHeader) проходят.

- [ ] **Step 2: Проверка остатков инлайн-шапок**

Run (из корня): `grep -rn "sticky top-0 z-50 border-b" frontend/src/pages frontend/src/components`
Expected: только если осталось в app-лейаутах (Layout/AuthLayout — вне объёма). В Landing/SeoLanding/Blog/Pricing — пусто.

- [ ] **Step 3: Merge в main + push**

```bash
git checkout main
git merge feat/unified-site-header
git push origin main
git branch -d feat/unified-site-header
```

- [ ] **Step 4: Деплой на Beget** (`root@155.212.128.195`):

```bash
cd /opt/aivoice
git pull origin main
docker compose -f docker-compose.prod.yml build frontend
docker compose -f docker-compose.prod.yml up -d --no-deps frontend
bash scripts/check-prod.sh https://dicto.pro
```
Expected: ALL SMOKE CHECKS PASSED.

- [ ] **Step 5: Проверка меню на проде**

```bash
curl -s https://dicto.pro/blog | grep -c '/pricing'
curl -s https://dicto.pro/pricing | grep -c '/#features'
curl -s https://dicto.pro/transkribaciya/ | grep -c '/#use-cases'
```
Expected: все ≥1 (пункты меню в статике).

- [ ] **Step 6: Ручная проверка** (браузер): меню видно на /, /blog, /pricing, SEO; на Landing шапка прозрачна над hero и плотнеет при скролле; «Возможности» с /blog → переход на / и доскролл к секции; мобильное меню открывается/закрывается.

---

## Self-Review

**Spec coverage:**
- Единый `SiteHeader` overlay/solid → Task 2 ✓
- `scrollToSection` хелпер → Task 1 ✓
- Поведение якорей по pathname (scroll на /, `/#id` иначе) → Task 2 (renderSection) + тест ✓
- Подключение в SeoLanding/Blog/Pricing/Landing → Tasks 3-6 ✓
- Landing overlay (fixed, scrolled, hero не трогаем) → Task 6 ✓
- Мобильное меню в компоненте → Task 2 ✓
- Тесты (якоря по маршруту, мобильное меню) → Task 2 ✓
- Верификация/деплой → Task 7 ✓

**Placeholder scan:** код приведён полностью; «удалить осиротевшие импорты, если стали неиспользуемыми» — условная чистка под tsc, не плейсхолдер (tsc детерминированно покажет). Нет TBD/TODO.

**Type consistency:** `scrollToSection(id: string)` — сигнатура идентична в Task 1 и в использовании (Task 2, Task 6). `SiteHeaderProps.overlay?: boolean` — согласован между Task 2 и вызовами (`<SiteHeader />` / `<SiteHeader overlay />`). `NAV_SECTIONS` id `features`/`use-cases` совпадают с реальными id секций Landing (`#features`, `#use-cases`).
