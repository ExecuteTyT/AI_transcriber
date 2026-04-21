import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ThemeToggle from "@/components/ui/ThemeToggle";
import SoundToggle from "@/components/ui/SoundToggle";

interface FAQ {
  q: string;
  a: string;
}

interface SeoLandingProps {
  title: string;
  subtitle: string;
  h1: string;
  description: string;
  metaTitle?: string;
  metaDescription?: string;
  canonical?: string;
  steps: { title: string; desc: string }[];
  benefits: string[];
  faqs: FAQ[];
  cta: string;
  breadcrumb: { label: string; href: string }[];
}

export default function SeoLanding({
  title,
  h1,
  description,
  metaTitle,
  metaDescription,
  canonical,
  steps,
  benefits,
  faqs,
  cta,
  breadcrumb,
}: SeoLandingProps) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <Helmet>
        <title>{metaTitle || h1 + " | Dicto"}</title>
        <meta name="description" content={metaDescription || description} />
        {canonical && <link rel="canonical" href={canonical} />}
        <meta property="og:title" content={metaTitle || h1} />
        <meta property="og:description" content={metaDescription || description} />
        {canonical && <meta property="og:url" content={canonical} />}
      </Helmet>

      {/* ─── Header ─── */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display text-2xl tracking-[-0.015em] text-[var(--fg)] leading-none">
            <span className="block w-1.5 h-1.5 rounded-full bg-acid-300 shadow-[0_0_12px_rgba(197,240,20,0.55)]" aria-hidden />
            Dicto
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5">
              <SoundToggle />
              <ThemeToggle />
            </div>
            <Link to="/login" className="text-[13px] text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors hidden sm:inline-flex px-3 py-2">
              Войти
            </Link>
            <Link to="/register" className="btn-accent !py-2.5 !px-5 !text-[13px]">
              Попробовать
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Breadcrumbs ─── */}
      <nav className="max-w-6xl mx-auto px-5 md:px-8 py-5" aria-label="Навигация">
        <ol className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
          {breadcrumb.map((item, i) => (
            <li key={item.href} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden>/</span>}
              {i === breadcrumb.length - 1 ? (
                <span className="text-[var(--fg-muted)]">{item.label}</span>
              ) : (
                <Link to={item.href} className="hover:text-[var(--fg)] transition-colors">{item.label}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* ─── Hero ─── */}
      <section className="max-w-5xl mx-auto px-5 md:px-8 pt-8 md:pt-16 pb-16 md:pb-24">
        <p className="eyebrow mb-6">
          <span className="inline-block w-2 h-2 rounded-full bg-acid-300 align-middle mr-2 shadow-[0_0_10px_rgba(197,240,20,0.6)]" aria-hidden />
          {breadcrumb[breadcrumb.length - 1]?.label}
        </p>
        <h1 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-[-0.02em] text-[var(--fg)] max-w-[18ch] mb-8">
          {h1}
        </h1>
        <p className="text-[15px] md:text-lg text-[var(--fg-muted)] max-w-[55ch] leading-[1.55] mb-10">
          {description}
        </p>
        <Link to="/register" className="btn-accent">
          {cta} <span aria-hidden>→</span>
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)] mt-5">
          Без карты · 180 минут бесплатно при регистрации
        </p>
      </section>

      {/* ─── How it works ─── */}
      <section className="bg-[var(--bg-elevated)] border-y border-[var(--border)] py-20 md:py-24">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <p className="eyebrow mb-4">Процесс</p>
          <h2 className="font-display text-4xl md:text-5xl leading-[0.95] tracking-[-0.02em] text-[var(--fg)] mb-12 max-w-[20ch]">
            Как это <em className="italic text-acid-300">работает</em>
          </h2>
          <div className="grid md:grid-cols-3 gap-10 md:gap-12">
            {steps.map((step, i) => (
              <div key={step.title}>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)] mb-4">
                  /0{i + 1}
                </p>
                <h3 className="font-display text-2xl md:text-3xl text-[var(--fg)] mb-3 leading-tight">{step.title}</h3>
                <p className="text-[14px] text-[var(--fg-muted)] leading-[1.55]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Benefits ─── */}
      <section className="max-w-5xl mx-auto px-5 md:px-8 py-20 md:py-24">
        <p className="eyebrow mb-4">Преимущества</p>
        <h2 className="font-display text-4xl md:text-5xl leading-[0.95] tracking-[-0.02em] text-[var(--fg)] mb-12 max-w-[20ch]">
          Что вы <em className="italic text-acid-300">получаете</em>
        </h2>
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-1 border-t border-[var(--border)]">
          {benefits.map((b) => (
            <div key={b} className="flex items-start gap-3 py-4 border-b border-[var(--border)]">
              <span className="text-acid-300 mt-1 flex-shrink-0">✓</span>
              <span className="text-[14px] text-[var(--fg-muted)] leading-[1.5]">{b}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Pricing mini ─── */}
      <section className="bg-[var(--bg-elevated)] border-y border-[var(--border)] py-20 md:py-24">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <p className="eyebrow mb-4">Тарифы</p>
          <h2 className="font-display text-4xl md:text-5xl leading-[0.95] tracking-[-0.02em] text-[var(--fg)] mb-3">
            Простые <em className="italic text-acid-300">и прозрачные</em>
          </h2>
          <p className="text-[14px] text-[var(--fg-muted)] mb-10 max-w-[40ch]">
            Начните бесплатно. Переходите когда нужно больше минут.
          </p>
          <div className="grid md:grid-cols-3 border border-[var(--border)] rounded-2xl overflow-hidden">
            <div className="p-7 border-b md:border-b-0 md:border-r border-[var(--border)] bg-[var(--bg)]">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)] mb-4">/free</p>
              <div className="font-display text-5xl text-[var(--fg)] leading-none mb-2">0&nbsp;₽</div>
              <p className="text-[12px] text-[var(--fg-muted)]">180 минут при регистрации</p>
            </div>
            <div className="p-7 bg-acid-300 text-ink-900">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-900/70 mb-4">/start</p>
              <div className="font-display text-5xl leading-none mb-2">500&nbsp;₽<span className="font-mono text-[14px] text-ink-900/65 ml-1">/мес</span></div>
              <p className="text-[12px] text-ink-900/75">10 часов, спикеры, AI-инсайты</p>
            </div>
            <div className="p-7 border-t md:border-t-0 md:border-l border-[var(--border)] bg-[var(--bg)]">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)] mb-4">/pro</p>
              <div className="font-display text-5xl text-[var(--fg)] leading-none mb-2">820&nbsp;₽<span className="font-mono text-[14px] text-[var(--fg-muted)] ml-1">/мес</span></div>
              <p className="text-[12px] text-[var(--fg-muted)]">25 часов, RAG-чат</p>
            </div>
          </div>
          <Link to="/pricing" className="inline-flex items-center gap-2 mt-6 text-[13px] text-[var(--fg)] hover:text-acid-300 transition-colors">
            Все тарифы <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 py-20 md:py-24">
        <p className="eyebrow mb-4">FAQ</p>
        <h2 className="font-display text-4xl md:text-5xl leading-[0.95] tracking-[-0.02em] text-[var(--fg)] mb-10">
          Частые <em className="italic text-acid-300">вопросы</em>
        </h2>
        <div className="border-t border-[var(--border)]">
          {faqs.map((faq) => (
            <details key={faq.q} className="border-b border-[var(--border)] py-6 group">
              <summary className="flex items-start justify-between gap-6 cursor-pointer list-none">
                <div className="flex items-start gap-5 flex-1">
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)] pt-1.5">Q</span>
                  <span className="font-display text-xl md:text-2xl leading-[1.15] text-[var(--fg)]">{faq.q}</span>
                </div>
                <span className="text-[var(--fg-subtle)] group-open:text-acid-300 group-open:rotate-180 transition-all mt-2 flex-shrink-0">▾</span>
              </summary>
              <p className="mt-4 pl-[3rem] md:pl-[3.5rem] text-[14px] text-[var(--fg-muted)] leading-[1.55]">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="max-w-5xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] px-8 py-12 md:px-14 md:py-16">
          <h2 className="font-display text-4xl md:text-6xl leading-[0.95] tracking-[-0.02em] text-[var(--fg)] mb-6 max-w-[20ch]">
            {title}
          </h2>
          <Link to="/register" className="btn-accent">
            Попробовать бесплатно <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-[var(--border)] py-10">
        <div className="max-w-7xl mx-auto px-5 md:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="block w-1.5 h-1.5 rounded-full bg-acid-300" aria-hidden />
            <span className="font-display text-xl text-[var(--fg)] leading-none">Dicto</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)] ml-3">© 2026</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-[var(--fg-muted)]">
            <Link to="/audio-v-tekst" className="hover:text-[var(--fg)] transition">Аудио в текст</Link>
            <Link to="/video-v-tekst" className="hover:text-[var(--fg)] transition">Видео в текст</Link>
            <Link to="/rasshifrovka-golosovyh" className="hover:text-[var(--fg)] transition">Голосовые</Link>
            <Link to="/pricing" className="hover:text-[var(--fg)] transition">Тарифы</Link>
          </div>
        </div>
      </footer>

      {/* FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: { "@type": "Answer", text: faq.a },
            })),
          }),
        }}
      />
    </div>
  );
}
