import { Link, useParams } from "react-router-dom";
import { getArticleBySlug, articles } from "./articles";
import Seo from "@/components/Seo";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

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

  // Безопасный inline-рендер для **bold** и `code`. Раньше использовалось
  // dangerouslySetInnerHTML с regex-replace — это превращается в stored XSS
  // моментально, как только контент статей переедет из static (articles.ts) в
  // БД/CMS. Делаем токенизацию вручную, ничего не интерпретируем как HTML.
  const renderInline = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    // Жадно ищем **bold** и `code`. Перекрытий не бывает: внутри bold не
    // допускается code и наоборот (markdown-light по спеке статей).
    const re = /\*\*(.+?)\*\*|`(.+?)`/g;
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
      if (m[1] !== undefined) {
        parts.push(
          <strong key={parts.length} className="font-semibold text-[var(--fg)]">
            {m[1]}
          </strong>,
        );
      } else if (m[2] !== undefined) {
        parts.push(
          <code
            key={parts.length}
            className="font-mono text-[13px] text-[var(--accent)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded"
          >
            {m[2]}
          </code>,
        );
      }
      lastIndex = re.lastIndex;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return parts;
  };

  // Markdown-light renderer. Группируем подряд идущие строки в семантические
  // <ul>/<ol>/<table> (важно для SEO/доступности и распознавания таблиц Google),
  // а не плоские <div>.
  const renderContent = (content: string) => {
    const lines = content.split("\n");
    const blocks: React.ReactNode[] = [];
    let i = 0;
    let key = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Таблица: подряд идущие строки, начинающиеся с "|".
      if (line.startsWith("|")) {
        const raw: string[] = [];
        while (i < lines.length && lines[i].startsWith("|")) { raw.push(lines[i]); i++; }
        const rows = raw
          .map((l) => l.split("|").filter((c) => c.trim()))
          .filter((cells) => !cells.some((c) => c.includes("---")));
        const [header, ...body] = rows;
        blocks.push(
          <div key={key++} className="my-6 overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              {header && (
                <thead>
                  <tr>
                    {header.map((c, j) => (
                      <th key={j} className="text-left font-semibold text-[var(--fg)] border-b border-[var(--border)] py-2 pr-4 align-top">
                        {renderInline(c.trim())}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {body.map((r, ri) => (
                  <tr key={ri}>
                    {r.map((c, j) => (
                      <td key={j} className="text-[var(--fg-muted)] border-b border-[var(--border)] py-2 pr-4 align-top">
                        {renderInline(c.trim())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
        continue;
      }

      // Маркированный список: подряд идущие "- ".
      if (line.startsWith("- ")) {
        const items: string[] = [];
        while (i < lines.length && lines[i].startsWith("- ")) { items.push(lines[i].slice(2)); i++; }
        blocks.push(
          <ul key={key++} className="my-4 space-y-2.5">
            {items.map((it, j) => {
              const bm = it.match(/^\*\*(.+?)\*\*\s*[—–-]\s*(.+)$/);
              return (
                <li key={j} className="flex items-start gap-2.5 text-[15px] leading-[1.55] text-[var(--fg-muted)]">
                  <span className="text-[var(--accent)] mt-1.5 flex-shrink-0 text-[10px]" aria-hidden>●</span>
                  <span>
                    {bm ? (<><strong className="font-semibold text-[var(--fg)]">{bm[1]}</strong> — {renderInline(bm[2])}</>) : renderInline(it)}
                  </span>
                </li>
              );
            })}
          </ul>,
        );
        continue;
      }

      // Нумерованный список: подряд идущие "N. ".
      if (/^\d+\.\s/.test(line)) {
        const items: string[] = [];
        while (i < lines.length && /^\d+\.\s/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s*/, "")); i++; }
        blocks.push(
          <ol key={key++} className="my-4 space-y-2 list-none">
            {items.map((it, j) => (
              <li key={j} className="flex items-start gap-3 text-[15px] leading-[1.55] text-[var(--fg-muted)]">
                <span className="font-mono text-[12px] text-[var(--fg-subtle)] flex-shrink-0 mt-1">{j + 1}.</span>
                <span>{renderInline(it)}</span>
              </li>
            ))}
          </ol>,
        );
        continue;
      }

      if (line.startsWith("## ")) {
        blocks.push(
          <h2 key={key++} className="font-display text-3xl md:text-4xl leading-[1.05] tracking-[-0.01em] text-[var(--fg)] mt-12 mb-5">
            {line.replace("## ", "")}
          </h2>,
        );
        i++; continue;
      }
      if (line.startsWith("### ")) {
        blocks.push(
          <h3 key={key++} className="font-display text-2xl text-[var(--fg)] mt-8 mb-3">
            {line.replace("### ", "")}
          </h3>,
        );
        i++; continue;
      }
      if (line.startsWith("```")) { i++; continue; }
      if (line.trim() === "") { blocks.push(<div key={key++} className="h-4" />); i++; continue; }
      blocks.push(
        <p key={key++} className="text-[15px] leading-[1.65] text-[var(--fg-muted)] mb-2">
          {renderInline(line)}
        </p>,
      );
      i++;
    }
    return blocks;
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <SiteHeader />

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
            image: "https://dicto.pro/og-image.png",
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
            Бесплатная проба при регистрации: 30 минут и AI-разбор. Разметка спикеров — без карты.
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

      <SiteFooter />

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
