import { Link, useParams } from "react-router-dom";
import { getArticleBySlug, articles } from "./articles";
import ThemeToggle from "@/components/ui/ThemeToggle";
import SoundToggle from "@/components/ui/SoundToggle";
import Seo from "@/components/Seo";

export default function BlogArticle() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? getArticleBySlug(slug) : undefined;

  if (!article) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <p className="eyebrow mb-4">404</p>
          <h1 className="font-display text-4xl mb-3">
            Статья <em className="italic text-[var(--accent)]">не найдена</em>
          </h1>
          <Link to="/blog" className="btn-editorial-ghost">← Все статьи</Link>
        </div>
      </div>
    );
  }

  const relatedArticles = article.relatedSlugs
    .map((s) => articles.find((a) => a.slug === s))
    .filter(Boolean);

  // Markdown-light renderer with editorial typographic rhythm.
  const renderContent = (content: string) => {
    return content.split("\n").map((line, i) => {
      if (line.startsWith("## ")) {
        return (
          <h2 key={i} className="font-display text-3xl md:text-4xl leading-[1.05] tracking-[-0.01em] text-[var(--fg)] mt-12 mb-5">
            {line.replace("## ", "")}
          </h2>
        );
      }
      if (line.startsWith("### ")) {
        return (
          <h3 key={i} className="font-display text-2xl text-[var(--fg)] mt-8 mb-3">
            {line.replace("### ", "")}
          </h3>
        );
      }
      if (line.startsWith("| ")) {
        const cells = line.split("|").filter((c) => c.trim());
        const isHeader = cells.some((c) => c.includes("---"));
        if (isHeader) return null;
        return (
          <div
            key={i}
            className="grid gap-2 text-[13px] py-2 border-b border-[var(--border)] text-[var(--fg-muted)]"
            style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
          >
            {cells.map((cell, j) => (
              <span key={j} className="font-sans">{cell.trim().replace(/\*\*/g, "")}</span>
            ))}
          </div>
        );
      }
      if (line.startsWith("```")) return null;
      if (line.startsWith("- **")) {
        const match = line.match(/^- \*\*(.+?)\*\*\s*[—–-]\s*(.+)$/);
        if (match) {
          return (
            <div key={i} className="flex items-start gap-2.5 mb-2.5">
              <span className="text-[var(--accent)] mt-1.5 flex-shrink-0 text-[10px]">●</span>
              <span className="text-[15px] leading-[1.55] text-[var(--fg-muted)]">
                <strong className="font-semibold text-[var(--fg)]">{match[1]}</strong> — {match[2]}
              </span>
            </div>
          );
        }
      }
      if (line.startsWith("- ")) {
        return (
          <div key={i} className="flex items-start gap-2.5 mb-2">
            <span className="text-[var(--accent)] mt-1.5 flex-shrink-0 text-[10px]">●</span>
            <span
              className="text-[15px] leading-[1.55] text-[var(--fg-muted)]"
              dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.+?)\*\*/g, "<strong class='font-semibold text-[var(--fg)]'>$1</strong>") }}
            />
          </div>
        );
      }
      if (line.match(/^\d+\./)) {
        return (
          <div key={i} className="flex items-start gap-3 mb-2">
            <span className="font-mono text-[12px] text-[var(--fg-subtle)] flex-shrink-0 mt-1">{line.match(/^\d+/)![0]}.</span>
            <span
              className="text-[15px] leading-[1.55] text-[var(--fg-muted)]"
              dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\.\s*/, "").replace(/\*\*(.+?)\*\*/g, "<strong class='font-semibold text-[var(--fg)]'>$1</strong>") }}
            />
          </div>
        );
      }
      if (line.trim() === "") return <div key={i} className="h-4" />;
      return (
        <p
          key={i}
          className="text-[15px] leading-[1.65] text-[var(--fg-muted)] mb-2"
          dangerouslySetInnerHTML={{
            __html: line
              .replace(/\*\*(.+?)\*\*/g, "<strong class='font-semibold text-[var(--fg)]'>$1</strong>")
              .replace(/`(.+?)`/g, '<code class="font-mono text-[13px] text-[var(--accent)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded">$1</code>'),
          }}
        />
      );
    });
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
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
            <Link to="/blog" className="text-[13px] text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors hidden sm:inline-flex px-3 py-2">
              Все статьи
            </Link>
            <Link to="/register" className="btn-accent !py-2.5 !px-5 !text-[13px]">
              Попробовать
            </Link>
          </div>
        </div>
      </header>

      {/* Breadcrumbs */}
      <nav className="max-w-3xl mx-auto px-5 md:px-8 pt-5">
        <ol className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
          <li><Link to="/" className="hover:text-[var(--fg)]">Главная</Link></li>
          <li aria-hidden>/</li>
          <li><Link to="/blog" className="hover:text-[var(--fg)]">Блог</Link></li>
          <li aria-hidden>/</li>
          <li className="text-[var(--fg-muted)] truncate max-w-[200px]">{article.title}</li>
        </ol>
      </nav>

      <Seo
        title={article.metaTitle}
        description={article.metaDescription}
        canonical={`https://dicto.pro/blog/${article.slug}`}
        type="article"
        publishedTime={article.date}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: article.title,
            description: article.metaDescription,
            datePublished: article.date,
            dateModified: article.date,
            inLanguage: "ru-RU",
            url: `https://dicto.pro/blog/${article.slug}`,
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `https://dicto.pro/blog/${article.slug}`,
            },
            image: "https://dicto.pro/og-image.svg",
            publisher: {
              "@type": "Organization",
              name: "Dicto",
              url: "https://dicto.pro/",
              logo: {
                "@type": "ImageObject",
                url: "https://dicto.pro/favicon.svg",
              },
            },
            author: { "@type": "Organization", name: "Dicto" },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Главная", item: "https://dicto.pro/" },
              { "@type": "ListItem", position: 2, name: "Блог", item: "https://dicto.pro/blog" },
              {
                "@type": "ListItem",
                position: 3,
                name: article.title,
                item: `https://dicto.pro/blog/${article.slug}`,
              },
            ],
          },
        ]}
      />

      {/* Article */}
      <article className="max-w-3xl mx-auto px-5 md:px-8 pt-10 pb-20">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
            <span>{article.category}</span>
            <span aria-hidden>·</span>
            <span>{article.date}</span>
            <span aria-hidden>·</span>
            <span>{article.readTime}</span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl leading-[0.98] tracking-[-0.02em] text-[var(--fg)] mb-5">
            {article.title}
          </h1>
          <p className="text-[17px] md:text-lg text-[var(--fg-muted)] leading-[1.55] max-w-[60ch]">
            {article.excerpt}
          </p>
        </div>

        <div className="prose-editorial">
          {renderContent(article.content)}
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] px-7 py-10 md:px-10 md:py-12">
          <h3 className="font-display text-3xl md:text-4xl leading-[0.98] tracking-[-0.01em] text-[var(--fg)] mb-3">
            Попробуйте <em className="italic text-[var(--accent)]">Dicto</em> бесплатно
          </h3>
          <p className="text-[14px] text-[var(--fg-muted)] mb-6 max-w-[44ch]">
            180 минут на тест при регистрации. AI-саммари, разметка спикеров — без карты.
          </p>
          <Link to="/register" className="btn-accent">
            Начать бесплатно <span aria-hidden>→</span>
          </Link>
        </div>

        {/* Related */}
        {relatedArticles.length > 0 && (
          <div className="mt-20">
            <p className="eyebrow mb-4">Похожие статьи</p>
            <h3 className="font-display text-3xl md:text-4xl leading-[0.98] tracking-[-0.01em] text-[var(--fg)] mb-8">
              Читать <em className="italic text-[var(--accent)]">дальше</em>
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {relatedArticles.map((related) => related && (
                <Link
                  key={related.slug}
                  to={`/blog/${related.slug}`}
                  className="block p-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)] transition-colors group"
                >
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)] mb-3">
                    {related.category}
                  </div>
                  <h4 className="font-display text-xl leading-tight text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors">
                    {related.title}
                  </h4>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-10">
        <div className="max-w-7xl mx-auto px-5 md:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="block w-1.5 h-1.5 rounded-full bg-acid-300" aria-hidden />
            <span className="font-display text-xl text-[var(--fg)] leading-none">Dicto</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)] ml-3">© 2026</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-[var(--fg-muted)]">
            <Link to="/blog" className="hover:text-[var(--fg)] transition">Все статьи</Link>
            <Link to="/pricing" className="hover:text-[var(--fg)] transition">Тарифы</Link>
            <Link to="/register" className="hover:text-[var(--fg)] transition">Регистрация</Link>
          </div>
        </div>
      </footer>

      {/* Schema.org Article */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: article.title,
            description: article.metaDescription,
            datePublished: article.date,
            author: { "@type": "Organization", name: "Dicto" },
            publisher: { "@type": "Organization", name: "Dicto" },
          }),
        }}
      />
    </div>
  );
}
