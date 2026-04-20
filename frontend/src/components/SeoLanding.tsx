import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

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
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{metaTitle || h1 + " | Dicto"}</title>
        <meta name="description" content={metaDescription || description} />
        {canonical && <link rel="canonical" href={canonical} />}
        <meta property="og:title" content={metaTitle || h1} />
        <meta property="og:description" content={metaDescription || description} />
        {canonical && <meta property="og:url" content={canonical} />}
      </Helmet>
      {/* Header */}
      <header className="glass border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold gradient-text">
            Dicto
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900">Войти</Link>
            <Link to="/register" className="text-sm bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition">
              Попробовать бесплатно
            </Link>
          </div>
        </div>
      </header>

      {/* Breadcrumbs */}
      <nav className="max-w-6xl mx-auto px-4 py-3" aria-label="Навигация">
        <ol className="flex items-center gap-2 text-sm text-gray-400">
          {breadcrumb.map((item, i) => (
            <li key={item.href} className="flex items-center gap-2">
              {i > 0 && <span>/</span>}
              {i === breadcrumb.length - 1 ? (
                <span className="text-gray-600">{item.label}</span>
              ) : (
                <Link to={item.href} className="hover:text-gray-600">{item.label}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center bg-dots">
        <h1 className="text-4xl font-bold text-gray-900 mb-6 leading-tight"><span className="gradient-text">{h1}</span></h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-8">{description}</p>
        <Link
          to="/register"
          className="inline-block bg-primary-500 text-white px-8 py-3.5 rounded-xl text-lg font-medium hover:bg-primary-600 transition shadow-lg shadow-primary-200"
        >
          {cta}
        </Link>
        <p className="text-xs text-gray-400 mt-3">Бесплатно 15 мин/мес. Без карты.</p>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-10">Как это работает</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={step.title} className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 text-white rounded-full shadow-lg shadow-primary-500/25 flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                  {i + 1}
                </div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-10">Преимущества Dicto</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {benefits.map((b) => (
            <div key={b} className="bento-card flex items-start gap-3 hover:glow-ring">
              <span className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-500 text-xs">&#10003;</span>
              </span>
              <span className="text-gray-700">{b}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing mini */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Тарифы</h2>
          <p className="text-gray-500 mb-8">Начните бесплатно, переходите когда нужно больше.</p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex-1 max-w-xs mx-auto md:mx-0">
              <div className="font-bold mb-1">Free</div>
              <div className="text-2xl font-bold mb-2">0 ₽</div>
              <div className="text-sm text-gray-500">15 мин/мес</div>
            </div>
            <div className="bg-white rounded-xl border-2 border-primary-500 p-5 flex-1 max-w-xs mx-auto md:mx-0 shadow-lg">
              <div className="font-bold mb-1">Старт</div>
              <div className="text-2xl font-bold mb-2">290 ₽<span className="text-sm font-normal text-gray-500">/мес</span></div>
              <div className="text-sm text-gray-500">5 часов, спикеры</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex-1 max-w-xs mx-auto md:mx-0">
              <div className="font-bold mb-1">Про</div>
              <div className="text-2xl font-bold mb-2">590 ₽<span className="text-sm font-normal text-gray-500">/мес</span></div>
              <div className="text-sm text-gray-500">20 часов, RAG-чат</div>
            </div>
          </div>
          <Link to="/pricing" className="inline-block mt-6 text-primary-500 hover:underline text-sm">
            Подробнее о тарифах
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-10">Частые вопросы</h2>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <details key={faq.q} className="bg-gray-50 rounded-xl p-5 group">
              <summary className="font-medium cursor-pointer list-none flex items-center justify-between">
                {faq.q}
                <span className="text-gray-400 group-open:rotate-180 transition-transform">&#9660;</span>
              </summary>
              <p className="text-sm text-gray-500 mt-3 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <Link
          to="/register"
          className="inline-block bg-primary-500 text-white px-8 py-3.5 rounded-xl text-lg font-medium hover:bg-primary-600 transition"
        >
          Попробовать бесплатно
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <div><span className="gradient-text font-bold">Dicto</span> &copy; 2026</div>
          <div className="flex gap-6">
            <Link to="/audio-v-tekst" className="hover:text-gray-600">Аудио в текст</Link>
            <Link to="/video-v-tekst" className="hover:text-gray-600">Видео в текст</Link>
            <Link to="/rasshifrovka-golosovyh" className="hover:text-gray-600">Расшифровка голосовых</Link>
            <Link to="/pricing" className="hover:text-gray-600">Тарифы</Link>
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
