import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const features = [
  {
    title: "Транскрибация за минуты",
    desc: "Загрузите аудио или видео — нейросеть Voxtral переведёт речь в текст с точностью 98%. 13 языков, автопунктуация.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    title: "Разметка спикеров",
    desc: "Автоматическое определение до 10 спикеров. Цветовая разметка — кто что сказал видно сразу.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    gradient: "from-violet-500 to-purple-600",
  },
  {
    title: "AI-саммари и тезисы",
    desc: "GPT-4o-mini выделит главное: саммари, ключевые тезисы и action items из любой записи.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
    gradient: "from-amber-500 to-orange-600",
  },
  {
    title: "Экспорт и субтитры",
    desc: "TXT, SRT с таймкодами. Готовый результат для блога, YouTube, подкаста или деловой отчётности.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
    gradient: "from-emerald-500 to-teal-600",
  },
];

const useCases = [
  { title: "Подкастерам", desc: "Текст из выпуска для SEO, цитаты для соцсетей, субтитры для YouTube", emoji: "🎙️" },
  { title: "Бизнесу", desc: "Протоколы совещаний, action items из созвонов, расшифровка интервью", emoji: "💼" },
  { title: "Студентам", desc: "Конспекты лекций, расшифровка защит, тезисы из семинаров", emoji: "🎓" },
  { title: "Журналистам", desc: "Расшифровка интервью с таймкодами и спикерами, быстрые цитаты", emoji: "📰" },
];

const stats = [
  { value: "98%", label: "точность" },
  { value: "13", label: "языков" },
  { value: "~2 мин", label: "на час аудио" },
  { value: "0.97 ₽", label: "за минуту" },
];

const faqs = [
  { q: "Какие форматы поддерживаются?", a: "MP3, WAV, FLAC, OGG, M4A, AAC, WebM (аудио), MP4, WebM, MOV (видео). Максимальный размер — 500 МБ." },
  { q: "Насколько точная транскрибация?", a: "Точность до 98% на чистом аудио. 13 языков включая русский. Автоматическая расстановка знаков препинания." },
  { q: "Что входит в бесплатный тариф?", a: "15 минут транскрибации в месяц, 3 AI-саммари, экспорт в TXT. Без кредитной карты." },
  { q: "Как работает AI-анализ?", a: "После транскрибации нейросеть генерирует саммари (3-5 абзацев), ключевые тезисы (5-10 пунктов) и action items." },
  { q: "Данные хранятся безопасно?", a: "Файлы в зашифрованном облаке, удаляются через 24 часа. Доступ только по вашему аккаунту." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <Helmet>
        <title>AI Voice — Транскрибация аудио и видео в текст онлайн | Нейросеть</title>
        <meta name="description" content="Сервис транскрибации аудио и видео в текст с помощью нейросети. Разметка спикеров, AI-саммари, ключевые тезисы, action items. Бесплатно 15 мин/мес. От 290 ₽/мес." />
        <link rel="canonical" href="https://aivoice.ru/" />
        <meta property="og:title" content="AI Voice — Транскрибация аудио и видео в текст онлайн" />
        <meta property="og:description" content="Превращайте аудио и видео в текст, саммари и ключевые тезисы с помощью ИИ. Разметка спикеров, таймкоды, экспорт. Бесплатно 15 мин/мес." />
        <meta property="og:url" content="https://aivoice.ru/" />
      </Helmet>
      {/* ─── Header ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold gradient-text">AI Voice</Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-gray-900 transition">Возможности</a>
            <a href="#use-cases" className="hover:text-gray-900 transition">Кому</a>
            <a href="#pricing" className="hover:text-gray-900 transition">Тарифы</a>
            <Link to="/blog" className="hover:text-gray-900 transition">Блог</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost text-sm">Войти</Link>
            <Link to="/register" className="btn-primary text-sm !py-2.5 !px-5">Попробовать</Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative pt-32 pb-24 md:pt-40 md:pb-32">
        {/* Background mesh */}
        <div className="absolute inset-0 bg-hero-mesh opacity-60" />
        <div className="absolute top-20 right-[10%] w-72 h-72 bg-primary-400/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-10 left-[5%] w-96 h-96 bg-accent-400/10 rounded-full blur-3xl animate-pulse-slow" />

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-sm font-medium mb-8 animate-fade-in">
            <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
            Нейросеть Voxtral V2 — точность 98%
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 animate-fade-up text-balance">
            Аудио и видео в
            <br />
            <span className="gradient-text">структурированный текст</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 animate-fade-up leading-relaxed" style={{ animationDelay: "0.1s" }}>
            Загрузите запись — получите текст с таймкодами, разметкой спикеров,
            AI&#8209;саммари и ключевыми тезисами за&nbsp;минуты
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <Link to="/register" className="btn-primary text-base !px-8 !py-4 !rounded-2xl !text-lg">
              Начать бесплатно — 15 мин/мес
            </Link>
            <a href="#features" className="btn-secondary text-base !px-8 !py-4 !rounded-2xl">
              Как это работает
            </a>
          </div>

          <p className="text-sm text-gray-400 mt-5 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            Без кредитной карты &middot; Регистрация за 30 секунд
          </p>
        </div>

        {/* Mockup preview */}
        <div className="relative max-w-4xl mx-auto mt-16 px-6 animate-fade-up" style={{ animationDelay: "0.3s" }}>
          <div className="rounded-2xl border border-gray-200/80 bg-white shadow-elevated overflow-hidden">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-surface-100 border-b border-gray-200/80">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="flex-1 flex justify-center">
                <div className="px-6 py-1 bg-white rounded-lg text-xs text-gray-400 border border-gray-200">aivoice.ru</div>
              </div>
            </div>
            {/* Content preview */}
            <div className="p-6 md:p-8 space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500" />
                <div className="h-4 w-48 bg-gray-200 rounded-full" />
                <div className="ml-auto badge bg-green-100 text-green-700">Готово</div>
              </div>
              {/* Transcript lines mockup */}
              {[
                { time: "0:00", speaker: "Спикер 1", color: "bg-blue-100 text-blue-700", w: "w-4/5" },
                { time: "0:15", speaker: "Спикер 2", color: "bg-violet-100 text-violet-700", w: "w-3/5" },
                { time: "0:32", speaker: "Спикер 1", color: "bg-blue-100 text-blue-700", w: "w-[70%]" },
                { time: "0:48", speaker: "Спикер 3", color: "bg-amber-100 text-amber-700", w: "w-2/3" },
              ].map((line, i) => (
                <div key={i} className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: `${0.5 + i * 0.15}s` }}>
                  <span className="text-xs text-gray-400 font-mono w-10">{line.time}</span>
                  <span className={`badge ${line.color} !text-[10px]`}>{line.speaker}</span>
                  <div className={`h-3 ${line.w} bg-gray-100 rounded-full`} />
                </div>
              ))}
            </div>
          </div>
          {/* Glow */}
          <div className="absolute inset-0 -z-10 blur-3xl opacity-30 bg-gradient-to-r from-primary-400 via-accent-300 to-primary-400 rounded-3xl scale-105" />
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="py-16 border-y border-gray-100 bg-surface-50">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold gradient-text">{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-600 tracking-wide uppercase mb-3">Возможности</p>
            <h2 className="section-heading">
              Не просто текст —<br />
              <span className="gradient-text">структурированные инсайты</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((f) => (
              <div key={f.title} className="card-hover group p-6">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="py-24 bg-surface-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-600 tracking-wide uppercase mb-3">3 шага</p>
            <h2 className="section-heading">Как это работает</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Загрузите", desc: "Перетащите аудио или видео. MP3, WAV, MP4 и ещё 8 форматов. До 500 МБ." },
              { step: "02", title: "Подождите", desc: "Нейросеть расшифрует речь за ~2 минуты на час записи. Спикеры и пунктуация автоматически." },
              { step: "03", title: "Получите", desc: "Текст, таймкоды, AI-саммари, тезисы, action items. Экспорт в TXT и SRT." },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="text-6xl font-extrabold text-primary-100 mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Use cases ─── */}
      <section id="use-cases" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-600 tracking-wide uppercase mb-3">Аудитория</p>
            <h2 className="section-heading">Кому подходит AI Voice</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-5">
            {useCases.map((uc) => (
              <div key={uc.title} className="card-hover p-6 text-center">
                <div className="text-4xl mb-4">{uc.emoji}</div>
                <h3 className="font-semibold mb-2">{uc.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="py-24 bg-surface-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-600 tracking-wide uppercase mb-3">Тарифы</p>
            <h2 className="section-heading mb-4">Простые и прозрачные</h2>
            <p className="text-gray-500">Начните бесплатно. Без скрытых платежей.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="card p-8">
              <h3 className="font-bold text-lg">Free</h3>
              <div className="mt-4 mb-6">
                <span className="text-4xl font-extrabold">0 ₽</span>
              </div>
              <ul className="space-y-3 text-sm text-gray-600 mb-8">
                <li className="flex items-center gap-2"><span className="text-green-500">&#10003;</span> 15 минут/мес</li>
                <li className="flex items-center gap-2"><span className="text-green-500">&#10003;</span> 3 AI-саммари</li>
                <li className="flex items-center gap-2"><span className="text-green-500">&#10003;</span> Экспорт TXT</li>
                <li className="flex items-center gap-2 text-gray-400"><span>&#10007;</span> Спикеры</li>
              </ul>
              <Link to="/register" className="btn-secondary w-full text-center block">Начать бесплатно</Link>
            </div>
            {/* Start — popular */}
            <div className="relative card p-8 ring-2 ring-primary-500 shadow-glow">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-to-r from-primary-600 to-accent-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                  Популярный
                </span>
              </div>
              <h3 className="font-bold text-lg">Старт</h3>
              <div className="mt-4 mb-6">
                <span className="text-4xl font-extrabold">290 ₽</span>
                <span className="text-gray-500 text-sm">/мес</span>
              </div>
              <ul className="space-y-3 text-sm text-gray-600 mb-8">
                <li className="flex items-center gap-2"><span className="text-green-500">&#10003;</span> 300 мин (5 часов)</li>
                <li className="flex items-center gap-2"><span className="text-green-500">&#10003;</span> AI-саммари безлимит</li>
                <li className="flex items-center gap-2"><span className="text-green-500">&#10003;</span> Разметка спикеров</li>
                <li className="flex items-center gap-2"><span className="text-green-500">&#10003;</span> TXT / SRT / DOCX</li>
              </ul>
              <Link to="/register" className="btn-primary w-full text-center block">Попробовать</Link>
            </div>
            {/* Pro */}
            <div className="card p-8">
              <h3 className="font-bold text-lg">Про</h3>
              <div className="mt-4 mb-6">
                <span className="text-4xl font-extrabold">590 ₽</span>
                <span className="text-gray-500 text-sm">/мес</span>
              </div>
              <ul className="space-y-3 text-sm text-gray-600 mb-8">
                <li className="flex items-center gap-2"><span className="text-green-500">&#10003;</span> 1200 мин (20 часов)</li>
                <li className="flex items-center gap-2"><span className="text-green-500">&#10003;</span> Всё из Старта</li>
                <li className="flex items-center gap-2"><span className="text-green-500">&#10003;</span> RAG-чат безлимит</li>
                <li className="flex items-center gap-2"><span className="text-green-500">&#10003;</span> Action items</li>
              </ul>
              <Link to="/register" className="btn-secondary w-full text-center block">Попробовать</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="py-24">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-600 tracking-wide uppercase mb-3">FAQ</p>
            <h2 className="section-heading">Частые вопросы</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details key={faq.q} className="card group p-5 cursor-pointer">
                <summary className="font-medium text-gray-900 list-none flex items-center justify-between">
                  {faq.q}
                  <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform duration-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="text-sm text-gray-500 mt-4 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent-400/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary-300/30 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
            Готовы превращать
            <br />аудио в инсайты?
          </h2>
          <p className="text-primary-200 text-lg mb-10">
            Зарегистрируйтесь бесплатно и получите 15 минут транскрибации.
          </p>
          <Link
            to="/register"
            className="inline-block bg-white text-primary-700 px-10 py-4 rounded-2xl text-lg font-bold hover:bg-primary-50 transition-all duration-200 shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
          >
            Начать бесплатно
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-12 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <span className="font-bold gradient-text text-lg">AI Voice</span>
              <span className="text-sm text-gray-400">&copy; 2026</span>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
              <Link to="/audio-v-tekst" className="hover:text-gray-900 transition">Аудио в текст</Link>
              <Link to="/video-v-tekst" className="hover:text-gray-900 transition">Видео в текст</Link>
              <Link to="/nejroset-transkribaciya" className="hover:text-gray-900 transition">Нейросеть</Link>
              <Link to="/rasshifrovka-golosovyh" className="hover:text-gray-900 transition">Голосовые</Link>
              <Link to="/blog" className="hover:text-gray-900 transition">Блог</Link>
              <Link to="/pricing" className="hover:text-gray-900 transition">Тарифы</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Schema.org FAQPage */}
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
