# Landing Nav + SEO Перелинковка + Конверсия — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сделать навигацию консистентной, плотно перелинковать 33 SEO-лендинга через общий mega-футер + секцию «По теме», усилить конверсию и on-page SEO главной.

**Architecture:** Единый источник ссылок `seoLinks.ts` → переиспользуется общим компонентом `SiteFooter` (заменяет 4 инлайн-футера) и секцией «По теме» на главной. Точечные правки JSX главной для CTA-микрокопии и SEO-текста. Чисто фронтенд, React + react-router + Tailwind.

**Tech Stack:** React 18, react-router-dom v7, TypeScript (strict), Tailwind, Vitest + @testing-library/react, Vite SSR prerender.

**Спек:** [docs/superpowers/specs/2026-06-02-landing-nav-seo-rework-design.md](../specs/2026-06-02-landing-nav-seo-rework-design.md)

---

## File Structure

| Файл | Ответственность |
|---|---|
| `frontend/src/config/seoLinks.ts` | **новый.** Единый источник: 33 SEO-ссылки в 5 кластерах. |
| `frontend/src/config/seoLinks.test.ts` | **новый.** Тест целостности данных (33 уникальных href, все с `/`). |
| `frontend/src/components/SiteFooter.tsx` | **новый.** Общий mega-футер из кластеров + служебные ссылки. |
| `frontend/src/components/SiteFooter.test.tsx` | **новый.** Рендер-тест: все ссылки кластеров присутствуют. |
| `frontend/src/components/SeoLanding.tsx` | заменить инлайн-футер на `<SiteFooter />`. |
| `frontend/src/pages/blog/BlogIndex.tsx` | заменить инлайн-футер на `<SiteFooter />`. |
| `frontend/src/pages/blog/BlogArticle.tsx` | заменить инлайн-футер на `<SiteFooter />`. |
| `frontend/src/pages/Landing.tsx` | nav «Тарифы»→/pricing; секция «По теме»; SEO-текст; CTA-микрокопия; заменить футер. |

---

### Task 1: Конфиг ссылок `seoLinks.ts`

**Files:**
- Create: `frontend/src/config/seoLinks.ts`
- Test: `frontend/src/config/seoLinks.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
// frontend/src/config/seoLinks.test.ts
import { describe, it, expect } from "vitest";
import { SEO_CLUSTERS } from "./seoLinks";

describe("SEO_CLUSTERS", () => {
  const all = SEO_CLUSTERS.flatMap((c) => c.links);

  it("покрывает все 33 SEO-лендинга", () => {
    expect(all).toHaveLength(33);
  });

  it("все href уникальны", () => {
    const hrefs = all.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("все href — корневые пути", () => {
    for (const l of all) {
      expect(l.href.startsWith("/")).toBe(true);
      expect(l.label.length).toBeGreaterThan(0);
    }
  });

  it("у каждого кластера есть заголовок и ссылки", () => {
    for (const c of SEO_CLUSTERS) {
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.links.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd frontend && npx vitest run src/config/seoLinks.test.ts`
Expected: FAIL — `Failed to resolve import "./seoLinks"` (файла ещё нет).

- [ ] **Step 3: Создать конфиг**

```ts
// frontend/src/config/seoLinks.ts
export interface SeoLink {
  href: string;
  label: string;
}

export interface SeoCluster {
  title: string;
  links: SeoLink[];
}

/**
 * Единый источник внутренних SEO-ссылок. Используется в SiteFooter (mega-футер)
 * и в секции «По теме» на главной. Покрывает все 33 SEO-лендинга без дублей —
 * это страховка от рассинхрона перелинковки между футером и контентом.
 */
export const SEO_CLUSTERS: SeoCluster[] = [
  {
    title: "Форматы",
    links: [
      { href: "/audio-v-tekst", label: "Аудио в текст" },
      { href: "/mp3-v-tekst", label: "MP3 в текст" },
      { href: "/diktofon-v-tekst", label: "Диктофон в текст" },
      { href: "/video-v-tekst", label: "Видео в текст" },
      { href: "/youtube-v-tekst", label: "YouTube в текст" },
      { href: "/rasshifrovka-golosovyh", label: "Голосовые сообщения" },
      { href: "/subtitry-dlya-video", label: "Субтитры для видео" },
      { href: "/iz-ssylki", label: "По ссылке" },
    ],
  },
  {
    title: "Задачи и кейсы",
    links: [
      { href: "/protokol-soveshchaniya", label: "Протокол совещания" },
      { href: "/rasshifrovka-intervyu", label: "Расшифровка интервью" },
      { href: "/zoom-v-tekst", label: "Расшифровка Zoom" },
      { href: "/dlya-biznesa", label: "Для бизнеса" },
      { href: "/dlya-zhurnalistov", label: "Для журналистов" },
      { href: "/dlya-podkastov", label: "Для подкастов" },
      { href: "/dlya-lekcij", label: "Для лекций" },
    ],
  },
  {
    title: "Языки",
    links: [
      { href: "/russkij-yazyk", label: "Русский" },
      { href: "/anglijskij-yazyk", label: "Английский" },
      { href: "/nemeckij-yazyk", label: "Немецкий" },
      { href: "/francuzskij-yazyk", label: "Французский" },
      { href: "/kazahskij-yazyk", label: "Казахский" },
    ],
  },
  {
    title: "Транскрибация",
    links: [
      { href: "/transkribaciya", label: "Транскрибация" },
      { href: "/transkribaciya-audio", label: "Транскрибация аудио" },
      { href: "/transkribaciya-video", label: "Транскрибация видео" },
      { href: "/transkribaciya-onlayn", label: "Транскрибация онлайн" },
      { href: "/rasshifrovka-audio", label: "Расшифровка аудио" },
      { href: "/rasshifrovka-video", label: "Расшифровка видео" },
      { href: "/raspoznavanie-rechi", label: "Распознавание речи" },
    ],
  },
  {
    title: "Ещё",
    links: [
      { href: "/perevod-audio-v-tekst", label: "Перевод аудио в текст" },
      { href: "/perevesti-audio-v-tekst", label: "Перевести аудио в текст" },
      { href: "/nejroset-transkribaciya", label: "Нейросеть" },
      { href: "/preobrazovat-audio", label: "Преобразовать аудио" },
      { href: "/bez-registracii", label: "Без регистрации" },
      { href: "/audio-v-tekst-besplatno", label: "Бесплатно" },
    ],
  },
];
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `cd frontend && npx vitest run src/config/seoLinks.test.ts`
Expected: PASS (4 теста).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/config/seoLinks.ts frontend/src/config/seoLinks.test.ts
git commit -m "feat(seo): единый конфиг внутренних ссылок (33 лендинга, 5 кластеров)"
```

---

### Task 2: Компонент `SiteFooter`

**Files:**
- Create: `frontend/src/components/SiteFooter.tsx`
- Test: `frontend/src/components/SiteFooter.test.tsx`

- [ ] **Step 1: Написать падающий тест**

```tsx
// frontend/src/components/SiteFooter.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SiteFooter from "./SiteFooter";
import { SEO_CLUSTERS } from "@/config/seoLinks";

function renderFooter() {
  return render(
    <MemoryRouter>
      <SiteFooter />
    </MemoryRouter>,
  );
}

describe("SiteFooter", () => {
  it("рендерит заголовки всех кластеров", () => {
    renderFooter();
    for (const c of SEO_CLUSTERS) {
      expect(screen.getByText(c.title)).toBeInTheDocument();
    }
  });

  it("рендерит ссылку на каждый SEO-лендинг с корректным href", () => {
    renderFooter();
    const all = SEO_CLUSTERS.flatMap((c) => c.links);
    for (const l of all) {
      const link = screen.getByRole("link", { name: l.label });
      expect(link).toHaveAttribute("href", l.href);
    }
  });

  it("содержит служебные ссылки (Тарифы, Блог, Конфиденциальность)", () => {
    renderFooter();
    expect(screen.getByRole("link", { name: "Тарифы" })).toHaveAttribute("href", "/pricing");
    expect(screen.getByRole("link", { name: "Блог" })).toHaveAttribute("href", "/blog");
    expect(screen.getByRole("link", { name: "Конфиденциальность" })).toHaveAttribute("href", "/privacy");
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd frontend && npx vitest run src/components/SiteFooter.test.tsx`
Expected: FAIL — `Failed to resolve import "./SiteFooter"`.

- [ ] **Step 3: Создать компонент**

```tsx
// frontend/src/components/SiteFooter.tsx
import { Link } from "react-router-dom";
import { SEO_CLUSTERS } from "@/config/seoLinks";

/**
 * Общий футер всех публичных страниц (главная, SEO-лендинги, блог).
 * Mega-футер: кластеры внутренних ссылок (источник — seoLinks.ts) для
 * плотной перелинковки + индексации, плюс служебные ссылки и копирайт.
 * Заменяет дублировавшиеся инлайн-футеры на 4 страницах.
 */
export default function SiteFooter() {
  return (
    <footer className="py-16 bg-[var(--bg)] border-t border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Кластеры SEO-ссылок */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-10 pb-12 border-b border-[var(--border)]">
          {SEO_CLUSTERS.map((cluster) => (
            <nav key={cluster.title} aria-label={cluster.title}>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)] mb-4">
                {cluster.title}
              </p>
              <ul className="space-y-2.5">
                {cluster.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-[13px] text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Лого + служебные ссылки */}
        <div className="mt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="dot-accent" aria-hidden />
            <span className="font-display text-2xl tracking-[-0.015em] text-[var(--fg)] leading-none">Dicto</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)] ml-3">© 2026</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-[var(--fg-muted)]">
            <Link to="/pricing" className="hover:text-[var(--fg)] transition-colors">Тарифы</Link>
            <Link to="/blog" className="hover:text-[var(--fg)] transition-colors">Блог</Link>
            <Link to="/privacy" className="hover:text-[var(--fg)] transition-colors">Конфиденциальность</Link>
            <Link to="/terms" className="hover:text-[var(--fg)] transition-colors">Оферта</Link>
            <a href="mailto:support@dicto.pro" className="hover:text-[var(--fg)] transition-colors">support@dicto.pro</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `cd frontend && npx vitest run src/components/SiteFooter.test.tsx`
Expected: PASS (3 теста).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/SiteFooter.tsx frontend/src/components/SiteFooter.test.tsx
git commit -m "feat(seo): общий SiteFooter с mega-перелинковкой по кластерам"
```

---

### Task 3: Подключить `SiteFooter` в `SeoLanding`

**Files:**
- Modify: `frontend/src/components/SeoLanding.tsx` (импорт + замена `<footer>…</footer>`, ~стр. 275-290)

- [ ] **Step 1: Добавить импорт**

В начало файла, рядом с `import Seo from "@/components/Seo";`:

```tsx
import SiteFooter from "@/components/SiteFooter";
```

- [ ] **Step 2: Заменить инлайн-футер**

Найти блок (начинается с `{/* ─── Footer ─── */}` и заканчивается `</footer>`) и заменить **весь** `<footer>...</footer>` на:

```tsx
      <SiteFooter />
```

- [ ] **Step 3: Проверка типов**

Run: `cd frontend && npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/SeoLanding.tsx
git commit -m "refactor(seo): SeoLanding использует общий SiteFooter"
```

---

### Task 4: Подключить `SiteFooter` в блоге

**Files:**
- Modify: `frontend/src/pages/blog/BlogIndex.tsx`
- Modify: `frontend/src/pages/blog/BlogArticle.tsx`

- [ ] **Step 1: BlogIndex — импорт + замена футера**

Добавить импорт `import SiteFooter from "@/components/SiteFooter";`. Найти инлайн `<footer>…</footer>` и заменить на `<SiteFooter />`. Если в файле футера нет — пропустить замену (только проверить наличие).

- [ ] **Step 2: BlogArticle — импорт + замена футера**

То же: импорт + замена `<footer>…</footer>` на `<SiteFooter />`.

- [ ] **Step 3: Проверка типов**

Run: `cd frontend && npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/blog/BlogIndex.tsx frontend/src/pages/blog/BlogArticle.tsx
git commit -m "refactor(seo): блог использует общий SiteFooter"
```

---

### Task 5: Landing — nav «Тарифы»→/pricing + замена футера

**Files:**
- Modify: `frontend/src/pages/Landing.tsx`

- [ ] **Step 1: Добавить импорт SiteFooter**

Рядом с `import Seo from "@/components/Seo";`:

```tsx
import SiteFooter from "@/components/SiteFooter";
```

- [ ] **Step 2: Десктоп-меню «Тарифы» → Link**

Найти (десктоп-навигация):

```tsx
            <button type="button" onMouseEnter={() => play("focus")} onClick={() => scrollToSection("pricing")} className="hover:text-[var(--fg)] transition-colors">Тарифы</button>
```

Заменить на:

```tsx
            <Link to="/pricing" onMouseEnter={() => play("focus")} className="hover:text-[var(--fg)] transition-colors">Тарифы</Link>
```

- [ ] **Step 3: Мобильное меню «Тарифы» → Link**

Найти:

```tsx
            <button type="button" onClick={() => { setMobileMenuOpen(false); scrollToSection("pricing"); }} className="hover:text-[var(--accent)] transition py-2 px-4 touch-target">Тарифы</button>
```

Заменить на:

```tsx
            <Link to="/pricing" onClick={() => setMobileMenuOpen(false)} className="hover:text-[var(--accent)] transition py-2 px-4 touch-target">Тарифы</Link>
```

- [ ] **Step 4: Заменить инлайн-футер на SiteFooter**

Найти блок `{/* ─── Footer (editorial) ─── */}` + весь `<footer className="py-16 …">…</footer>` и заменить на:

```tsx
      <SiteFooter />
```

- [ ] **Step 5: Проверка типов**

Run: `cd frontend && npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 6: Запустить dev и проверить вручную**

Run: `cd frontend && npm run dev` → открыть `http://localhost:3000/`.
Expected: клик «Тарифы» в шапке ведёт на `/pricing` (не скролл); внизу — новый mega-футер со ссылками; десктоп и мобильное меню работают.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/Landing.tsx
git commit -m "feat(nav): Тарифы ведёт на /pricing + Landing на общем SiteFooter"
```

---

### Task 6: Landing — секция «По теме»

**Files:**
- Modify: `frontend/src/pages/Landing.tsx` (вставка секции перед `<SiteFooter />`)

- [ ] **Step 1: Вставить секцию «По теме»**

Сразу **перед** `<SiteFooter />` (после секции Final CTA) вставить:

```tsx
      {/* ─── По теме (внутренняя перелинковка SEO) ─── */}
      <section className="py-20 md:py-28 bg-[var(--bg-elevated)] border-t border-[var(--border)]">
        <FadeInOnScroll>
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-12">
            <p className="eyebrow mb-4">По теме</p>
            <h2 className="font-display text-4xl md:text-6xl leading-[0.95] tracking-[-0.02em] text-[var(--fg)] max-w-[20ch]">
              Транскрибация <em className="italic text-[var(--accent)]">под вашу задачу</em>
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-10">
            {SEO_CLUSTERS.map((cluster) => (
              <nav key={cluster.title} aria-label={cluster.title}>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)] mb-4">
                  {cluster.title}
                </p>
                <ul className="space-y-2.5">
                  {cluster.links.map((link) => (
                    <li key={link.href}>
                      <Link to={link.href} className="text-[14px] text-[var(--fg-muted)] hover:text-[var(--accent)] transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        </FadeInOnScroll>
      </section>
```

- [ ] **Step 2: Добавить импорт SEO_CLUSTERS**

Рядом с импортом SiteFooter:

```tsx
import { SEO_CLUSTERS } from "@/config/seoLinks";
```

- [ ] **Step 3: Проверка типов**

Run: `cd frontend && npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 4: Проверить вручную**

Run: dev уже запущен → обновить `/`.
Expected: перед футером секция «По теме» с 5 колонками ссылок; все ссылки ведут на существующие страницы (клик по 2-3 → не 404).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Landing.tsx
git commit -m "feat(seo): секция «По теме» на главной — перелинковка по кластерам"
```

---

### Task 7: Landing — CTA-микрокопия + SEO-текст

**Files:**
- Modify: `frontend/src/pages/Landing.tsx`

- [ ] **Step 1: Реассуранс под кнопками тарифов**

В мини-секции тарифов: под каждой из трёх кнопок тарифа (`Начать бесплатно`, `Оформить Старт`, `Попробовать Про`) добавить строку-реассуранс **сразу после** соответствующего `</Link>`, внутри карточки. Для Free-карточки после `</Link>` (стр. ~559):

```tsx
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
                180 минут бесплатно · без карты
              </p>
```

(Для Start/Pro реассуранс не дублируем — он уместен только у бесплатного входа; это сознательно, чтобы не зашумлять платные карточки.)

- [ ] **Step 2: SEO-текстовый блок перед секцией «По теме»**

Вставить **перед** секцией «По теме» (Task 6):

```tsx
      {/* ─── SEO-текст (ранжирование главной по ВЧ-запросам) ─── */}
      <section className="py-20 md:py-24 bg-[var(--bg)] border-t border-[var(--border)]">
        <FadeInOnScroll>
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="font-display text-3xl md:text-4xl leading-tight tracking-[-0.02em] text-[var(--fg)] mb-6">
            Транскрибация и расшифровка аудио в текст онлайн
          </h2>
          <div className="space-y-4 text-[15px] text-[var(--fg-muted)] leading-[1.6]">
            <p>
              Dicto — сервис транскрибации: загрузите аудио или видео, и нейросеть переведёт
              речь в текст за 2 минуты на час записи с точностью до 98% на русском языке.
              Поддерживаются MP3, WAV, FLAC, OGG, M4A, MP4 и ещё несколько форматов, а также
              ссылки на YouTube, VK Video и Rutube.
            </p>
            <p>
              Расшифровка аудио в текст пригодится для протоколов совещаний, интервью, подкастов,
              лекций и голосовых сообщений. Помимо самого текста с таймкодами вы получаете
              разметку спикеров, AI-саммари, ключевые тезисы и action items, а также чат с записью
              через RAG — можно задать вопрос и получить цитату с точным таймкодом.
            </p>
            <p>
              Перевод аудио в текст начинается бесплатно: 180 минут при регистрации без банковской
              карты. Файлы хранятся в России в соответствии с 152-ФЗ и удаляются автоматически.
            </p>
          </div>
        </div>
        </FadeInOnScroll>
      </section>
```

- [ ] **Step 3: Проверка типов**

Run: `cd frontend && npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 4: Проверить вручную**

Run: dev → обновить `/`.
Expected: под Free-кнопкой строка «180 минут бесплатно · без карты»; перед «По теме» — текстовый SEO-блок с H2 и тремя абзацами.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Landing.tsx
git commit -m "feat(conv+seo): CTA-реассуранс + SEO-текст на главной"
```

---

### Task 8: Сборка, прогон тестов, деплой, переиндексация

**Files:** —

- [ ] **Step 1: Полный прогон тестов и типов**

Run: `cd frontend && npx tsc --noEmit && npx vitest run`
Expected: типы чисто; все тесты, включая `seoLinks` и `SiteFooter`, проходят.

- [ ] **Step 2: Прод-сборка + prerender**

Run: `cd frontend && npm run build`
Expected: `✓ built`; «Pre-rendering 56 pages…» все ✓; sitemap сгенерирован.

- [ ] **Step 3: Проверить футер в пре-рендеренном HTML**

Run: `cd frontend && grep -c "/protokol-soveshchaniya" dist/transkribaciya/index.html`
Expected: ≥1 (ссылка футера/«По теме» в статике — краулеры видят).

- [ ] **Step 4: Commit (если есть незакоммиченное) и push**

```bash
git add -A && git commit -m "chore: финализация переработки навигации/перелинковки" || true
git push origin main
```

- [ ] **Step 5: Деплой на прод (Beget)**

На сервере `root@155.212.128.195`:

```bash
cd /opt/aivoice
git pull origin main
docker compose -f docker-compose.prod.yml build frontend
docker compose -f docker-compose.prod.yml up -d --no-deps frontend
bash scripts/check-prod.sh https://dicto.pro
```

Expected: ALL SMOKE CHECKS PASSED.

- [ ] **Step 6: Проверить футер на проде**

```bash
curl -s https://dicto.pro/ | grep -c "/protokol-soveshchaniya"
curl -s https://dicto.pro/transkribaciya/ | grep -c "/dlya-biznesa"
```

Expected: оба ≥1.

- [ ] **Step 7: Переотправить ключевые страницы в IndexNow**

С локальной машины (PowerShell), ключ `d25b43a02b4603d983c1983c7ea86894` — переслать главную + изменённые блоговые/SEO-страницы (футер обновился везде, достаточно пнуть главную и пару хабовых):

```powershell
$key = "d25b43a02b4603d983c1983c7ea86894"
$payload = @{ host="dicto.pro"; key=$key; keyLocation="https://dicto.pro/$key.txt"; urlList=@("https://dicto.pro/","https://dicto.pro/blog") } | ConvertTo-Json
$bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
Invoke-WebRequest -Uri "https://yandex.com/indexnow" -Method POST -Body $bytes -ContentType "application/json; charset=utf-8" -UseBasicParsing
```

Expected: HTTP 200/202.

---

## Self-Review

**Spec coverage:**
- Часть 1 (nav «Тарифы»→/pricing) → Task 5 ✓
- Часть 2.1 (seoLinks.ts) → Task 1 ✓; 2.2 (SiteFooter + замена 4 футеров) → Tasks 2-5 ✓; 2.3 (секция «По теме») → Task 6 ✓
- Часть 3.1 (CTA-микрокопия) → Task 7 Step 1 ✓; 3.2 (SEO-текст) → Task 7 Step 2 ✓; 3.3 (UX-доверие — «без карты/152-ФЗ») → покрыто реассурансом (Task 7.1) и абзацем про 152-ФЗ в SEO-тексте (Task 7.2) ✓
- Верификация/деплой/IndexNow → Task 8 ✓

**Placeholder scan:** код приведён полностью в каждом шаге; «если футера нет — пропустить» в Task 4 — защита от вариативности блоговых файлов, не плейсхолдер. Нет TBD/TODO.

**Type consistency:** `SeoLink`/`SeoCluster`/`SEO_CLUSTERS` определены в Task 1 и используются идентично в Tasks 2, 6. Импорты через alias `@/` соответствуют конфигу проекта. Тесты ссылаются на реальные экспорты.

**Маршруты:** все 33 href в Task 1 соответствуют роутам из `App.tsx`; служебные `/pricing /blog /privacy /terms` существуют.
