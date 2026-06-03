import { Link } from "react-router-dom";
import { articles } from "./articles";
import Seo from "@/components/Seo";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function BlogIndex() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <Seo
        title="Блог Dicto — статьи о транскрибации, нейросетях и продуктивности"
        description="Полезные статьи и гайды: как транскрибировать аудио, сравнение сервисов и нейросетей, расшифровка Zoom-совещаний, субтитры для YouTube."
        canonical="https://dicto.pro/blog"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "Блог Dicto",
            url: "https://dicto.pro/blog",
            inLanguage: "ru-RU",
            publisher: { "@type": "Organization", name: "Dicto", url: "https://dicto.pro/" },
            blogPost: articles.map((a) => ({
              "@type": "BlogPosting",
              headline: a.title,
              url: `https://dicto.pro/blog/${a.slug}`,
              datePublished: a.date,
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Главная", item: "https://dicto.pro/" },
              { "@type": "ListItem", position: 2, name: "Блог", item: "https://dicto.pro/blog" },
            ],
          },
        ]}
      />

      <SiteHeader />

      <main className="max-w-4xl mx-auto px-5 md:px-8 py-16 md:py-24">
        <p className="eyebrow mb-4">Блог</p>
        <h1 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-[-0.02em] text-[var(--fg)] mb-5">
          Статьи <em className="italic text-[var(--accent)]">и гайды</em>
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
              <h2 className="font-display text-3xl md:text-4xl leading-[1.05] tracking-[-0.01em] text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors mb-3">
                {article.title}
              </h2>
              <p className="text-[15px] text-[var(--fg-muted)] leading-[1.55] max-w-[60ch]">
                {article.excerpt}
              </p>
              <span className="inline-flex items-center gap-2 mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)] group-hover:text-[var(--accent)] transition-colors">
                Читать <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
              </span>
            </Link>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
