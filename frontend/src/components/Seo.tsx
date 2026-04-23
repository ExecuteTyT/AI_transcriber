import { Helmet } from "react-helmet-async";

const SITE_URL = "https://dicto.pro";
// og:image всегда raster (PNG) — Telegram/FB/LinkedIn/WhatsApp/iMessage молча отбрасывают SVG.
// Регенерируется из public/og-image.svg через `npm run build:og`.
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;
const SITE_NAME = "Dicto";

export type SeoProps = {
  /** Полный title (<title>) тега. Если не передать — будет <title>{SITE_NAME}</title>. */
  title?: string;
  /** 150–160 симв. Тот же текст пойдёт в og:description / twitter:description. */
  description?: string;
  /** Полный URL канонической версии (напр. https://dicto.pro/pricing). */
  canonical?: string;
  /** Полный URL картинки 1200×630 для соцсетей. Если не передан — дефолт. */
  image?: string;
  /** og:image:alt. */
  imageAlt?: string;
  /** og:type — "website" по-умолчанию, "article" для блога. */
  type?: "website" | "article";
  /** ISO-дата публикации (для article). */
  publishedTime?: string;
  /** Запретить индексацию (для app-страниц). */
  noindex?: boolean;
  /** Дополнительный JSON-LD (schema.org). Объект будет сериализован. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

/**
 * Единый SEO-helmet для всех страниц: title, description, canonical,
 * OG+Twitter мета, robots и произвольный JSON-LD. В index.html лежат
 * базовые значения — этот компонент их перекрывает на уровне страницы.
 */
export default function Seo({
  title,
  description,
  canonical,
  image = DEFAULT_IMAGE,
  imageAlt = "Dicto — транскрибация аудио и видео в текст",
  type = "website",
  publishedTime,
  noindex,
  jsonLd,
}: SeoProps) {
  const fullTitle = title || `${SITE_NAME} — транскрибация аудио и видео в текст`;
  const canonicalUrl = canonical || SITE_URL;
  const imageUrl = image.startsWith("http") ? image : `${SITE_URL}${image}`;

  const ldList = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={canonicalUrl} />
      <meta
        name="robots"
        content={noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large"}
      />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="ru_RU" />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:secure_url" content={imageUrl} />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:alt" content={imageAlt} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      {type === "article" && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@dicto_pro" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={imageAlt} />

      {/* JSON-LD */}
      {ldList.map((data, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
}
