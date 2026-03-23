import { useState, useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const features = [
  {
    title: "Транскрибация за минуты",
    desc: "Говорите в микрофон или загрузите файл — чистый текст готов за 2 минуты. 13 языков, автопунктуация, точность 98%.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    title: "Разметка спикеров",
    desc: "Знайте, кто что сказал. До 10 спикеров размечаются автоматически — удобно для совещаний и интервью.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    gradient: "from-violet-500 to-purple-600",
  },
  {
    title: "AI-саммари и тезисы",
    desc: "Пересказ за 30 секунд вместо 30 минут. AI выделит главное: саммари, тезисы и задачи к исполнению.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
    gradient: "from-amber-500 to-orange-600",
  },
  {
    title: "Экспорт и субтитры",
    desc: "Готовые субтитры для YouTube, текст для блога, DOCX для отчёта. Один клик — любой формат.",
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
  { value: "98%", label: "точность речи" },
  { value: "13", label: "языков" },
  { value: "~2 мин", label: "на час записи" },
  { value: "от 290 ₽", label: "в месяц" },
];

const testimonials = [
  {
    name: "Алексей К.",
    role: "Подкастер, «Голос Продукта»",
    text: "Раньше на расшифровку выпуска уходило 4 часа. С Voitra — 3 минуты. Субтитры для YouTube генерирую в один клик.",
    initials: "АК",
  },
  {
    name: "Мария С.",
    role: "Руководитель отдела, Fintech",
    text: "Записываем все совещания. Voitra выдаёт протокол с action items — каждый знает свои задачи. Экономим час в день на фиксации.",
    initials: "МС",
  },
  {
    name: "Дмитрий Л.",
    role: "Студент магистратуры, МГУ",
    text: "Конспектирую лекции за секунды. AI-тезисы помогают готовиться к экзаменам вдвое быстрее. Бесплатного тарифа хватает на неделю.",
    initials: "ДЛ",
  },
];

const faqs = [
  { q: "Какие форматы поддерживаются?", a: "MP3, WAV, FLAC, OGG, M4A, AAC, WebM (аудио), MP4, WebM, MOV (видео). Максимальный размер — 500 МБ." },
  { q: "Насколько точная транскрибация?", a: "Точность до 98% на чистом аудио. 13 языков включая русский. Автоматическая расстановка знаков препинания." },
  { q: "Что входит в бесплатный тариф?", a: "15 минут транскрибации в месяц, 3 AI-саммари, экспорт в TXT. Без кредитной карты." },
  { q: "Как работает AI-анализ?", a: "После транскрибации нейросеть генерирует саммари (3-5 абзацев), ключевые тезисы (5-10 пунктов) и action items." },
  { q: "Данные хранятся безопасно?", a: "Файлы в зашифрованном облаке, удаляются через 24 часа. Доступ только по вашему аккаунту." },
];

function FadeInOnScroll({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.15 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}>
      {children}
    </div>
  );
}

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-hidden">
      <Helmet>
        <title>Voitra — Транскрибация аудио и видео в текст онлайн | Нейросеть</title>
        <meta name="description" content="Сервис транскрибации аудио и видео в текст с помощью нейросети. Разметка спикеров, AI-саммари, ключевые тезисы, action items. Бесплатно 15 мин/мес. От 290 ₽/мес." />
        <link rel="canonical" href="https://voitra.ru/" />
        <meta property="og:title" content="Voitra — Транскрибация аудио и видео в текст онлайн" />
        <meta property="og:description" content="Превращайте аудио и видео в текст, саммари и ключевые тезисы с помощью ИИ. Разметка спикеров, таймкоды, экспорт. Бесплатно 15 мин/мес." />
        <meta property="og:url" content="https://voitra.ru/" />
      </Helmet>

      {/* ─── Header ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold gradient-text"><svg className="w-5 h-5 inline-block mr-1 -mt-0.5" viewBox="0 0 24 24" fill="none"><rect x="2" y="10" width="3" height="4" rx="1" fill="currentColor" opacity="0.5"/><rect x="7" y="6" width="3" height="12" rx="1" fill="currentColor" opacity="0.7"/><rect x="12" y="3" width="3" height="18" rx="1" fill="currentColor"/><rect x="17" y="7" width="3" height="10" rx="1" fill="currentColor" opacity="0.6"/></svg>Voitra</Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-gray-900 transition">Возможности</a>
            <a href="#use-cases" className="hover:text-gray-900 transition">Кому</a>
            <a href="#pricing" className="hover:text-gray-900 transition">Тарифы</a>
            <Link to="/blog" className="hover:text-gray-900 transition">Блог</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost text-sm hidden sm:inline-flex">Войти</Link>
            <Link to="/register" className="btn-primary text-sm !py-2.5 !px-5 hidden sm:inline-flex">Попробовать</Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 rounded-lg hover:bg-white/10 transition"
              aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ─── Mobile Menu ─── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-primary-950/95 backdrop-blur-lg" onClick={() => setMobileMenuOpen(false)} />
          <nav className="relative flex flex-col items-center justify-center h-full gap-8 text-lg font-medium text-white">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary-300 transition">Возможности</a>
            <a href="#use-cases" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary-300 transition">Кому</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary-300 transition">Тарифы</a>
            <Link to="/blog" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary-300 transition">Блог</Link>
            <div className="flex flex-col gap-3 mt-4">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="px-8 py-3 rounded-xl border border-white/20 text-center hover:bg-white/10 transition">Войти</Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="bg-white text-primary-950 px-8 py-3 rounded-xl font-medium text-center hover:bg-gray-100 transition">Попробовать</Link>
            </div>
          </nav>
        </div>
      )}

      {/* ─── Hero (dark) ─── */}
      <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 bg-primary-950 bg-grid">
        {/* Glow blobs */}
        <div className="absolute top-20 right-[10%] w-80 h-80 bg-primary-500/30 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-10 left-[5%] w-96 h-96 bg-accent-400/25 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "2s" }} />

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-dark text-primary-200 text-sm font-medium mb-8 animate-fade-in">
            <span className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" />
            Нейросеть Voxtral V2 — точность 98%
          </div>

          {/* Wave bars behind heading */}
          <div className="flex items-end justify-center gap-1 h-16 mb-6 opacity-20">
            {Array.from({ length: 24 }, (_, i) => (
              <div
                key={i}
                className="w-1 bg-primary-400 rounded-full animate-wave-bar"
                style={{ animationDelay: `${i * 0.07}s`, height: "100%" }}
              />
            ))}
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.05] mb-6 animate-fade-up text-balance text-white">
            От записи к готовому
            <br />
            <span className="gradient-text">тексту за 2 минуты</span>
          </h1>

          <p className="text-lg text-primary-200/80 max-w-2xl mx-auto mb-10 animate-fade-up leading-relaxed" style={{ animationDelay: "0.1s" }}>
            Говорите — мы расшифруем. Текст с таймкодами, разметка спикеров, AI&#8209;саммари и ключевые выводы — в&nbsp;один клик
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <Link to="/register" className="bg-white text-primary-950 px-6 py-3 md:px-8 md:py-4 rounded-2xl text-base md:text-lg font-bold hover:bg-gray-100 transition-all duration-200 hover:-translate-y-0.5 shadow-lg">
              Начать бесплатно — 15 мин/мес
            </Link>
            <a href="#features" className="px-6 py-3 md:px-8 md:py-4 rounded-2xl text-base md:text-lg font-medium border border-white/20 text-white hover:bg-white/10 transition-all duration-200">
              Как это работает
            </a>
          </div>

          <p className="text-sm text-primary-300/60 mt-5 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            Без кредитной карты &middot; Регистрация за 30 секунд
          </p>
        </div>

        {/* Mockup preview */}
        <div className="relative max-w-4xl mx-auto mt-16 px-6 animate-fade-up" style={{ animationDelay: "0.3s" }}>
          <div className="rounded-2xl glass-dark overflow-hidden">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
              <div className="w-3 h-3 rounded-full bg-red-400/80" />
              <div className="w-3 h-3 rounded-full bg-amber-400/80" />
              <div className="w-3 h-3 rounded-full bg-green-400/80" />
              <div className="flex-1 flex justify-center">
                <div className="px-6 py-1 bg-white/10 rounded-lg text-xs text-primary-300 border border-white/10">voitra.ru</div>
              </div>
            </div>
            {/* Content preview */}
            <div className="p-6 md:p-8 space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500" />
                <div className="h-4 w-48 bg-white/10 rounded-full" />
                <div className="ml-auto badge bg-green-500/20 text-green-300">Готово</div>
              </div>
              {[
                { time: "0:00", speaker: "Спикер 1", color: "bg-blue-500/20 text-blue-300", w: "w-4/5" },
                { time: "0:15", speaker: "Спикер 2", color: "bg-violet-500/20 text-violet-300", w: "w-3/5" },
                { time: "0:32", speaker: "Спикер 1", color: "bg-blue-500/20 text-blue-300", w: "w-[70%]" },
                { time: "0:48", speaker: "Спикер 3", color: "bg-amber-500/20 text-amber-300", w: "w-2/3" },
              ].map((line, i) => (
                <div key={i} className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: `${0.5 + i * 0.15}s` }}>
                  <span className="text-xs text-primary-400 font-mono w-10">{line.time}</span>
                  <span className={`badge ${line.color} !text-[10px]`}>{line.speaker}</span>
                  <div className={`h-3 ${line.w} bg-white/5 rounded-full`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats (dark) ─── */}
      <section className="py-16 bg-primary-900/50 border-y border-primary-800">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <div key={s.label} className={`text-center ${i < stats.length - 1 ? "md:border-r md:border-primary-800" : ""}`}>
              <div className="text-3xl md:text-4xl font-black text-white">{s.value}</div>
              <div className="text-sm text-primary-300 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Bento-grid Features ─── */}
      <section id="features" className="py-24 bg-white">
        <FadeInOnScroll>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-600 tracking-wide uppercase mb-3">Возможности</p>
            <h2 className="section-heading">
              Не просто текст —<br />
              <span className="gradient-text">структурированные инсайты</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <div key={f.title} className={`bento-card group relative overflow-hidden ${i === 0 ? "md:row-span-2" : ""}`}>
                {/* Unique visual element per card */}
                {i === 0 && (
                  <div className="absolute top-4 right-4 flex items-end gap-0.5 h-8 opacity-30">
                    {Array.from({ length: 5 }, (_, j) => (
                      <div key={j} className="w-1 bg-primary-500 rounded-full animate-wave-bar" style={{ animationDelay: `${j * 0.15}s`, height: "100%" }} />
                    ))}
                  </div>
                )}
                {i === 1 && (
                  <div className="absolute top-4 right-4 flex gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-400/40" />
                    <div className="w-3 h-3 rounded-full bg-violet-400/40" />
                    <div className="w-3 h-3 rounded-full bg-amber-400/40" />
                  </div>
                )}
                {i === 2 && (
                  <div className="absolute top-4 right-4">
                    <svg className="w-5 h-5 text-amber-400/40 animate-pulse-slow" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                )}
                {i === 3 && (
                  <div className="absolute top-4 right-4 flex gap-1.5">
                    <span className="text-[10px] font-mono bg-surface-100 text-gray-400 px-1.5 py-0.5 rounded">TXT</span>
                    <span className="text-[10px] font-mono bg-surface-100 text-gray-400 px-1.5 py-0.5 rounded">SRT</span>
                  </div>
                )}

                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
        </FadeInOnScroll>
      </section>

      {/* ─── How it works ─── */}
      <section className="py-24 bg-surface-50">
        <FadeInOnScroll>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-600 tracking-wide uppercase mb-3">3 шага</p>
            <h2 className="section-heading">Как это работает</h2>
          </div>
          <div className="relative grid md:grid-cols-3 gap-8">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-6 left-[20%] right-[20%] h-px bg-primary-200" />
            {[
              { step: "01", title: "Загрузите", desc: "Перетащите аудио или видео. MP3, WAV, MP4 и ещё 8 форматов. До 500 МБ." },
              { step: "02", title: "Подождите", desc: "Нейросеть расшифрует речь за ~2 минуты на час записи. Спикеры и пунктуация автоматически." },
              { step: "03", title: "Получите", desc: "Текст, таймкоды, AI-саммари, тезисы, action items. Экспорт в TXT и SRT." },
            ].map((item) => (
              <div key={item.step} className="relative text-center md:text-left">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm mx-auto md:mx-0 mb-4 relative z-10">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
        </FadeInOnScroll>
      </section>

      {/* ─── Use cases ─── */}
      <section id="use-cases" className="py-24 bg-white">
        <FadeInOnScroll>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-600 tracking-wide uppercase mb-3">Аудитория</p>
            <h2 className="section-heading">Кому подходит Voitra</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-5">
            {useCases.map((uc) => (
              <div key={uc.title} className="gradient-border">
                <div className="bg-white rounded-2xl p-6 text-center h-full">
                  <div className="text-5xl mb-4">{uc.emoji}</div>
                  <h3 className="font-semibold mb-2">{uc.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{uc.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        </FadeInOnScroll>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="py-24 bg-surface-50">
        <FadeInOnScroll>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-600 tracking-wide uppercase mb-3">Отзывы</p>
            <h2 className="section-heading">Нам доверяют</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="gradient-border">
                <div className="bg-white rounded-2xl p-6 h-full flex flex-col">
                  <svg className="w-8 h-8 text-primary-200 mb-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                  <p className="text-gray-600 text-sm leading-relaxed flex-1 mb-4">{t.text}</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        </FadeInOnScroll>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="py-24 bg-white">
        <FadeInOnScroll>
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
              <p className="text-xs text-gray-400 mt-1">Для знакомства</p>
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
            <div className="relative gradient-border shadow-glow scale-[1.02]">
              <div className="bg-white rounded-2xl p-8 h-full">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-primary-600 to-accent-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                    Популярный
                  </span>
                </div>
                <h3 className="font-bold text-lg">Старт</h3>
                <p className="text-xs text-accent-600 font-medium mt-1">Для подкастеров и бизнеса</p>
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
                <Link to="/register" className="btn-primary w-full text-center block">Попробовать Старт</Link>
              </div>
            </div>
            {/* Pro */}
            <div className="card p-8">
              <h3 className="font-bold text-lg">Про</h3>
              <p className="text-xs text-gray-400 mt-1">Для команд и продакшена</p>
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
              <Link to="/register" className="btn-secondary w-full text-center block">Перейти на Про</Link>
            </div>
          </div>
        </div>
        </FadeInOnScroll>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="py-24 bg-white">
        <FadeInOnScroll>
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
        </FadeInOnScroll>
      </section>

      {/* ─── Final CTA (dark) ─── */}
      <section className="py-24 relative overflow-hidden bg-primary-950 bg-grid">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent-400/15 rounded-full blur-3xl animate-float" style={{ animationDelay: "3s" }} />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">
            Готовы превращать
            <br />аудио в инсайты?
          </h2>
          <p className="text-primary-200/80 text-lg mb-10">
            Зарегистрируйтесь бесплатно и получите 15 минут транскрибации.
          </p>
          <Link
            to="/register"
            className="inline-block bg-white text-primary-950 px-10 py-4 rounded-2xl text-lg font-bold hover:bg-gray-100 transition-all duration-200 shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
          >
            Начать бесплатно за 30 секунд
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-12 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <span className="font-bold gradient-text text-lg"><svg className="w-5 h-5 inline-block mr-1 -mt-0.5" viewBox="0 0 24 24" fill="none"><rect x="2" y="10" width="3" height="4" rx="1" fill="currentColor" opacity="0.5"/><rect x="7" y="6" width="3" height="12" rx="1" fill="currentColor" opacity="0.7"/><rect x="12" y="3" width="3" height="18" rx="1" fill="currentColor"/><rect x="17" y="7" width="3" height="10" rx="1" fill="currentColor" opacity="0.6"/></svg>Voitra</span>
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
