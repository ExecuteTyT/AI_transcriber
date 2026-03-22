import { Link } from "react-router-dom";

const features = [
  {
    title: "Транскрибация за минуты",
    desc: "Загрузите аудио или видео — нейросеть переведёт речь в текст с точностью до 98%. Поддержка русского и 12 других языков.",
    icon: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z",
  },
  {
    title: "Разметка спикеров",
    desc: "Автоматическое определение и цветовая разметка до 10 спикеров. Кто что сказал — видно сразу.",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  },
  {
    title: "AI-саммари и тезисы",
    desc: "Нейросеть выделит главное: краткое саммари, ключевые тезисы и задачи к выполнению из любой записи.",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    title: "Экспорт TXT и SRT",
    desc: "Скачайте текст или субтитры с таймкодами. Готово для блога, YouTube, подкаста или отчёта.",
    icon: "M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
];

const useCases = [
  { title: "Подкастерам", desc: "Текст из выпуска для SEO, цитаты для соцсетей, субтитры для YouTube" },
  { title: "Бизнесу", desc: "Протоколы совещаний, action items из созвонов, расшифровка интервью" },
  { title: "Студентам", desc: "Конспекты лекций, расшифровка защит, тезисы из семинаров" },
  { title: "Журналистам", desc: "Расшифровка интервью с таймкодами и спикерами, быстрые цитаты" },
];

const faqs = [
  {
    q: "Какие форматы поддерживаются?",
    a: "MP3, WAV, FLAC, OGG, M4A, AAC, WebM (аудио), MP4, WebM, MOV (видео). Максимальный размер — 500 МБ.",
  },
  {
    q: "Насколько точная транскрибация?",
    a: "Точность до 98% на чистом аудио. Поддерживается русский, английский и 11 других языков. Автоматическая расстановка знаков препинания.",
  },
  {
    q: "Что входит в бесплатный тариф?",
    a: "15 минут транскрибации в месяц, 3 AI-саммари, экспорт в TXT. Достаточно для знакомства с сервисом.",
  },
  {
    q: "Как работает AI-анализ?",
    a: "После транскрибации нейросеть генерирует краткое саммари (3-5 абзацев), ключевые тезисы (5-10 пунктов) и задачи к выполнению (action items).",
  },
  {
    q: "Данные хранятся безопасно?",
    a: "Файлы хранятся в зашифрованном облаке и автоматически удаляются через 24 часа. Доступ только по вашему аккаунту.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary-600">
            AI Voice
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="#features">Возможности</a>
            <a href="#use-cases">Кому подходит</a>
            <a href="#pricing">Тарифы</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Войти
            </Link>
            <Link
              to="/register"
              className="text-sm bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition"
            >
              Попробовать бесплатно
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Транскрибация аудио и видео
          <br />
          <span className="text-primary-500">в текст с помощью нейросети</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-8">
          Загрузите запись — получите текст с таймкодами, разметкой спикеров,
          AI-саммари и ключевыми тезисами. Русский язык, 98% точность.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="bg-primary-500 text-white px-8 py-3.5 rounded-xl text-lg font-medium hover:bg-primary-600 transition shadow-lg shadow-primary-200"
          >
            Начать бесплатно — 15 мин/мес
          </Link>
          <a
            href="#features"
            className="text-gray-600 px-6 py-3.5 rounded-xl text-lg hover:bg-gray-50 transition"
          >
            Узнать больше
          </a>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Без кредитной карты. Регистрация за 30 секунд.
        </p>
      </section>

      {/* Social proof */}
      <section className="bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">98%</div>
            <div>точность</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">13</div>
            <div>языков</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">~2 мин</div>
            <div>на 1 час аудио</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">от 0.97 ₽</div>
            <div>за минуту</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">
          Не просто текст — структурированные инсайты
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          {features.map((f) => (
            <div key={f.title} className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-primary-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d={f.icon}
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Use cases */}
      <section id="use-cases" className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Кому подходит AI Voice
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {useCases.map((uc) => (
              <div
                key={uc.title}
                className="bg-white rounded-xl p-6 border border-gray-200"
              >
                <h3 className="font-semibold mb-2">{uc.title}</h3>
                <p className="text-sm text-gray-500">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section id="pricing" className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">
          Простые и прозрачные тарифы
        </h2>
        <p className="text-gray-500 text-center mb-12">
          Начните бесплатно. Переходите на платный, когда будете готовы.
        </p>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="rounded-2xl border border-gray-200 p-6 text-center">
            <h3 className="font-bold text-lg mb-1">Free</h3>
            <div className="text-3xl font-bold mb-4">0 ₽</div>
            <p className="text-sm text-gray-500 mb-4">15 мин/мес, TXT экспорт</p>
            <Link
              to="/register"
              className="block w-full py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition"
            >
              Начать бесплатно
            </Link>
          </div>
          <div className="rounded-2xl border-2 border-primary-500 p-6 text-center shadow-lg">
            <div className="text-xs font-medium text-primary-500 mb-2">
              Популярный
            </div>
            <h3 className="font-bold text-lg mb-1">Старт</h3>
            <div className="text-3xl font-bold mb-4">
              290 ₽<span className="text-base font-normal text-gray-500">/мес</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">5 часов, спикеры, SRT/DOCX</p>
            <Link
              to="/register"
              className="block w-full py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition"
            >
              Попробовать
            </Link>
          </div>
          <div className="rounded-2xl border border-gray-200 p-6 text-center">
            <h3 className="font-bold text-lg mb-1">Про</h3>
            <div className="text-3xl font-bold mb-4">
              590 ₽<span className="text-base font-normal text-gray-500">/мес</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">20 часов, RAG-чат, action items</p>
            <Link
              to="/register"
              className="block w-full py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition"
            >
              Попробовать
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-gray-50 py-20">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Частые вопросы
          </h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="bg-white rounded-xl border border-gray-200 p-5 group"
              >
                <summary className="font-medium cursor-pointer list-none flex items-center justify-between">
                  {faq.q}
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">
                    &#9660;
                  </span>
                </summary>
                <p className="text-sm text-gray-500 mt-3 leading-relaxed">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">
          Готовы превращать аудио в инсайты?
        </h2>
        <p className="text-gray-500 mb-8">
          Зарегистрируйтесь бесплатно и получите 15 минут транскрибации.
        </p>
        <Link
          to="/register"
          className="inline-block bg-primary-500 text-white px-8 py-3.5 rounded-xl text-lg font-medium hover:bg-primary-600 transition shadow-lg shadow-primary-200"
        >
          Начать бесплатно
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <div>AI Voice &copy; 2026. Сервис транскрибации аудио и видео.</div>
          <div className="flex gap-6">
            <Link to="/pricing" className="hover:text-gray-600">Тарифы</Link>
            <Link to="/login" className="hover:text-gray-600">Войти</Link>
            <Link to="/register" className="hover:text-gray-600">Регистрация</Link>
          </div>
        </div>
      </footer>

      {/* FAQ Schema.org */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.a,
              },
            })),
          }),
        }}
      />
    </div>
  );
}
