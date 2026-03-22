import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getArticleBySlug, articles } from "./articles";

export default function BlogArticle() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? getArticleBySlug(slug) : undefined;

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Статья не найдена</h1>
          <Link to="/blog" className="text-primary-600 hover:underline">Все статьи</Link>
        </div>
      </div>
    );
  }

  const relatedArticles = article.relatedSlugs
    .map((s) => articles.find((a) => a.slug === s))
    .filter(Boolean);

  // Convert markdown-like content to HTML sections
  const renderContent = (content: string) => {
    return content.split("\n").map((line, i) => {
      if (line.startsWith("## ")) {
        return <h2 key={i} className="text-2xl font-bold mt-10 mb-4">{line.replace("## ", "")}</h2>;
      }
      if (line.startsWith("### ")) {
        return <h3 key={i} className="text-xl font-semibold mt-8 mb-3">{line.replace("### ", "")}</h3>;
      }
      if (line.startsWith("| ")) {
        // Table rows — simplified render
        const cells = line.split("|").filter((c) => c.trim());
        const isHeader = cells.some((c) => c.includes("---"));
        if (isHeader) return null;
        return (
          <div key={i} className="grid gap-2 text-sm py-1.5 border-b border-gray-100" style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}>
            {cells.map((cell, j) => (
              <span key={j} className={`${i === 0 ? "font-medium text-gray-900" : "text-gray-600"}`}>
                {cell.trim().replace(/\*\*/g, "")}
              </span>
            ))}
          </div>
        );
      }
      if (line.startsWith("```")) return null;
      if (line.startsWith("- **")) {
        const match = line.match(/^- \*\*(.+?)\*\*\s*[—–-]\s*(.+)$/);
        if (match) {
          return (
            <div key={i} className="flex items-start gap-2 mb-2">
              <span className="text-primary-500 mt-1 flex-shrink-0">&#8226;</span>
              <span className="text-gray-700"><strong className="font-semibold">{match[1]}</strong> — {match[2]}</span>
            </div>
          );
        }
      }
      if (line.startsWith("- ")) {
        return (
          <div key={i} className="flex items-start gap-2 mb-1.5">
            <span className="text-primary-500 mt-1 flex-shrink-0">&#8226;</span>
            <span className="text-gray-700" dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
          </div>
        );
      }
      if (line.match(/^\d+\./)) {
        return (
          <div key={i} className="flex items-start gap-2 mb-1.5">
            <span className="text-primary-600 font-medium flex-shrink-0">{line.match(/^\d+/)![0]}.</span>
            <span className="text-gray-700" dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\.\s*/, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
          </div>
        );
      }
      if (line.trim() === "") return <div key={i} className="h-3" />;
      // Regular paragraph
      return (
        <p key={i} className="text-gray-700 leading-relaxed mb-1" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`(.+?)`/g, '<code class="bg-surface-100 px-1.5 py-0.5 rounded text-sm font-mono text-primary-700">$1</code>') }} />
      );
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold gradient-text">AI Voice</Link>
          <div className="flex items-center gap-3">
            <Link to="/blog" className="btn-ghost text-sm">Блог</Link>
            <Link to="/register" className="btn-primary text-sm !py-2.5 !px-5">Попробовать</Link>
          </div>
        </div>
      </header>

      {/* Breadcrumbs */}
      <nav className="max-w-3xl mx-auto px-6 py-4">
        <ol className="flex items-center gap-2 text-sm text-gray-400">
          <li><Link to="/" className="hover:text-gray-600">Главная</Link></li>
          <li>/</li>
          <li><Link to="/blog" className="hover:text-gray-600">Блог</Link></li>
          <li>/</li>
          <li className="text-gray-600 truncate max-w-[200px]">{article.title}</li>
        </ol>
      </nav>

      <Helmet>
        <title>{article.metaTitle}</title>
        <meta name="description" content={article.metaDescription} />
        <link rel="canonical" href={`https://aivoice.ru/blog/${article.slug}`} />
        <meta property="og:title" content={article.metaTitle} />
        <meta property="og:description" content={article.metaDescription} />
        <meta property="og:url" content={`https://aivoice.ru/blog/${article.slug}`} />
        <meta property="og:type" content="article" />
      </Helmet>

      {/* Article */}
      <article className="max-w-3xl mx-auto px-6 pb-20">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="badge bg-primary-50 text-primary-700">{article.category}</span>
            <span className="text-sm text-gray-400">{article.date}</span>
            <span className="text-sm text-gray-400">{article.readTime}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight mb-4">
            {article.title}
          </h1>
          <p className="text-lg text-gray-500">{article.excerpt}</p>
        </div>

        <div className="prose-custom">
          {renderContent(article.content)}
        </div>

        {/* CTA */}
        <div className="mt-16 card p-8 text-center bg-gradient-to-br from-primary-50 to-accent-50 border-primary-100">
          <h3 className="text-xl font-bold mb-2">Попробуйте AI Voice бесплатно</h3>
          <p className="text-gray-500 text-sm mb-6">15 минут транскрибации, AI-саммари и разметка спикеров — без карты.</p>
          <Link to="/register" className="btn-primary inline-block">Начать бесплатно</Link>
        </div>

        {/* Related */}
        {relatedArticles.length > 0 && (
          <div className="mt-16">
            <h3 className="text-xl font-bold mb-6">Похожие статьи</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {relatedArticles.map((related) => related && (
                <Link key={related.slug} to={`/blog/${related.slug}`} className="card-hover p-5 group">
                  <span className="badge bg-surface-100 text-gray-500 text-xs mb-2">{related.category}</span>
                  <h4 className="font-semibold group-hover:text-primary-600 transition">{related.title}</h4>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>

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
            author: { "@type": "Organization", name: "AI Voice" },
            publisher: { "@type": "Organization", name: "AI Voice" },
          }),
        }}
      />
    </div>
  );
}
