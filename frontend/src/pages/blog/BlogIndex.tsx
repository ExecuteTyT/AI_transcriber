import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { articles } from "./articles";
import ThemeToggle from "@/components/ui/ThemeToggle";
import SoundToggle from "@/components/ui/SoundToggle";

export default function BlogIndex() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <Helmet>
        <title>Блог Dicto — статьи о транскрибации, нейросетях и продуктивности</title>
        <meta name="description" content="Полезные статьи и гайды: как транскрибировать аудио, сравнение сервисов и нейросетей, расшифровка Zoom-совещаний, субтитры для YouTube." />
        <link rel="canonical" href="https://dicto.pro/blog" />
      </Helmet>

      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
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

      <main className="max-w-4xl mx-auto px-5 md:px-8 py-16 md:py-24">
        <p className="eyebrow mb-4">Блог</p>
        <h1 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-[-0.02em] text-[var(--fg)] mb-5">
          Статьи <em className="italic text-acid-300">и гайды</em>
        </h1>
        <p className="text-[15px] text-[var(--fg-muted)] max-w-[55ch] leading-[1.55] mb-16">
          Транскрибация, нейросети, продуктивность — материалы от команды Dicto и редакции.
        </p>

        <div className="border-t border-[var(--border)]">
          {articles.map((article) => (
            <Link
              key={article.slug}
              to={`/blog/${article.slug}`}
              className="block group border-b border-[var(--border)] py-8 md:py-10"
            >
              <div className="flex items-center gap-3 mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
                <span>{article.category}</span>
                <span aria-hidden>·</span>
                <span>{article.date}</span>
                <span aria-hidden>·</span>
                <span>{article.readTime}</span>
              </div>
              <h2 className="font-display text-3xl md:text-4xl leading-[1.05] tracking-[-0.01em] text-[var(--fg)] group-hover:text-acid-300 transition-colors mb-3">
                {article.title}
              </h2>
              <p className="text-[15px] text-[var(--fg-muted)] leading-[1.55] max-w-[60ch]">
                {article.excerpt}
              </p>
              <span className="inline-flex items-center gap-2 mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)] group-hover:text-acid-300 transition-colors">
                Читать <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
              </span>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-10">
        <div className="max-w-7xl mx-auto px-5 md:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="block w-1.5 h-1.5 rounded-full bg-acid-300" aria-hidden />
            <span className="font-display text-xl text-[var(--fg)] leading-none">Dicto</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)] ml-3">© 2026</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-[var(--fg-muted)]">
            <Link to="/" className="hover:text-[var(--fg)] transition">Главная</Link>
            <Link to="/pricing" className="hover:text-[var(--fg)] transition">Тарифы</Link>
            <Link to="/register" className="hover:text-[var(--fg)] transition">Регистрация</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
