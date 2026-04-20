import { useState, useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import HeroWaveform from "@/components/HeroWaveform";
import HeroLiveDemo from "@/components/HeroLiveDemo";

/* ─── useCountUp hook ─── */
function useCountUp(target: number, duration = 1500) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  const triggered = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setValue(target);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered.current) {
          triggered.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - (1 - t) * (1 - t); // easeOutQuad
            setValue(Math.round(eased * target));
            if (t < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { ref, value };
}

/* ─── CountUpNumber component ─── */
// Хук вызывается на уровне компонента, не в цикле map — фикс Rules of Hooks.
function CountUpNumber({
  target,
  duration = 1500,
  format,
  prefix = "",
  suffix = "",
}: {
  target: number;
  duration?: number;
  format?: (v: number) => string;
  prefix?: string;
  suffix?: string;
}) {
  const { ref, value } = useCountUp(target, duration);
  const rendered = format ? format(value) : value.toString();
  return (
    <span ref={ref}>
      {prefix}
      {rendered}
      {suffix}
    </span>
  );
}

/* ─── AccordionItem component ─── */
function AccordionItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setMaxHeight(contentRef.current.scrollHeight);
    }
  }, [answer]);

  return (
    <div className="card group p-6 cursor-pointer" onClick={() => setOpen((o: boolean) => !o)}>
      <div className="font-medium text-gray-900 flex items-center justify-between">
        {question}
        <svg
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: open ? `${maxHeight}px` : "0px", opacity: open ? 1 : 0 }}
      >
        <p className="text-sm text-gray-500 mt-4 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

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
  { value: 98, suffix: "%", prefix: "", label: "точность речи" },
  { value: 13, suffix: "", prefix: "", label: "языков" },
  { value: 2, suffix: " мин", prefix: "~", label: "на час записи" },
  { value: 500, suffix: " ₽", prefix: "от ", label: "в месяц" },
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    let prev = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const next = window.scrollY > 60;
        if (next !== prev) {
          prev = next;
          setScrolled(next);
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen overflow-hidden">
      <Helmet>
        <title>Dicto — Транскрибация аудио и видео в текст онлайн | Нейросеть</title>
        <meta name="description" content="Сервис транскрибации аудио и видео в текст с помощью нейросети. Разметка спикеров, AI-саммари, ключевые тезисы, action items. Бесплатно 30 мин + 180 бонусных при регистрации. Тарифы от 500 ₽/мес." />
        <link rel="canonical" href="https://dicto.pro/" />
        <meta property="og:title" content="Dicto — Транскрибация аудио и видео в текст онлайн" />
        <meta property="og:description" content="Превращайте аудио и видео в текст, саммари и ключевые тезисы с помощью ИИ. Разметка спикеров, таймкоды, экспорт. Бесплатно 15 мин/мес." />
        <meta property="og:url" content="https://dicto.pro/" />
      </Helmet>

      {/* ─── Header ─── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${scrolled ? "bg-white/90 backdrop-blur-2xl border-b border-gray-200/40 shadow-sm" : "bg-transparent border-b border-transparent"}`}>
        <div className="max-w-7xl mx-auto px-5 md:px-8 flex items-center justify-between h-16">
          <Link to="/" className={`text-xl font-extrabold tracking-tight transition-colors duration-300 ${scrolled ? "text-gray-900" : "text-white"}`}>Dicto</Link>
          <nav className={`hidden md:flex items-center gap-8 text-sm font-medium transition-colors duration-300 ${scrolled ? "text-gray-600" : "text-white/70"}`}>
            <a href="#features" className={`transition ${scrolled ? "hover:text-gray-900" : "hover:text-white"}`}>Возможности</a>
            <a href="#use-cases" className={`transition ${scrolled ? "hover:text-gray-900" : "hover:text-white"}`}>Кому</a>
            <a href="#pricing" className={`transition ${scrolled ? "hover:text-gray-900" : "hover:text-white"}`}>Тарифы</a>
            <Link to="/blog" className={`transition ${scrolled ? "hover:text-gray-900" : "hover:text-white"}`}>Блог</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className={`text-sm px-4 py-2 rounded-xl font-medium transition-all duration-300 hidden sm:inline-flex ${scrolled ? "text-gray-600 hover:bg-gray-100" : "text-white/80 hover:text-white hover:bg-white/10"}`}>Войти</Link>
            <Link to="/register" className={`text-[15px] !py-2.5 !px-6 rounded-2xl font-semibold transition-all duration-300 hidden sm:inline-flex ${scrolled ? "btn-primary" : "bg-white text-primary-950 hover:bg-gray-100 shadow-lg"}`}>Попробовать</Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-3 rounded-xl transition touch-target ${scrolled ? "hover:bg-gray-100" : "hover:bg-white/10"}`}
              aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
            >
              {mobileMenuOpen ? (
                <svg className={`w-6 h-6 transition-colors duration-300 ${scrolled ? "text-gray-700" : "text-white"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className={`w-6 h-6 transition-colors duration-300 ${scrolled ? "text-gray-700" : "text-white"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ─── Mobile Menu ─── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-primary-950/95 backdrop-blur-lg" onClick={() => setMobileMenuOpen(false)} />
          <nav className="relative flex flex-col items-center justify-center h-full gap-6 text-lg font-medium text-white">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary-300 transition py-2 px-4 touch-target">Возможности</a>
            <a href="#use-cases" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary-300 transition py-2 px-4 touch-target">Кому</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary-300 transition py-2 px-4 touch-target">Тарифы</a>
            <Link to="/blog" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary-300 transition py-2 px-4 touch-target">Блог</Link>
            <div className="flex flex-col gap-3 mt-4 w-64">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="px-8 py-3.5 rounded-xl border border-white/20 text-center hover:bg-white/10 transition">Войти</Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="bg-white text-primary-950 px-8 py-3.5 rounded-xl font-medium text-center hover:bg-gray-100 transition">Попробовать</Link>
            </div>
          </nav>
        </div>
      )}

      {/* ─── Hero (dark) ─── */}
      <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 bg-primary-950 bg-grid">

        <HeroWaveform />

        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6 md:mb-8 animate-fade-up text-balance text-white">
            От записи к готовому
            <br />
            <span className="gradient-text">тексту за 2 минуты</span>
          </h1>

          <p className="text-lg text-primary-200/80 max-w-2xl mx-auto mb-10 animate-fade-up leading-relaxed" style={{ animationDelay: "0.1s" }}>
            Говорите — мы расшифруем. Текст с таймкодами, разметка спикеров, AI&#8209;саммари и ключевые выводы — в&nbsp;один клик
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <Link to="/register" className="bg-gradient-to-r from-primary-500 to-primary-400 text-white px-6 py-3.5 md:px-8 md:py-4 rounded-2xl text-[15px] md:text-lg font-bold hover:from-primary-400 hover:to-primary-300 transition-all duration-200 hover:-translate-y-0.5 shadow-[0_4px_20px_-4px_rgba(99,102,241,0.5)] w-full sm:w-auto text-center">
              Начать бесплатно
            </Link>
            <a href="#features" className="px-6 py-3.5 md:px-8 md:py-4 rounded-2xl text-[15px] md:text-lg font-medium border border-white/20 text-white hover:bg-white/10 hover:border-white/40 transition-all duration-200 w-full sm:w-auto text-center">
              Как это работает
            </a>
          </div>

          <p className="text-sm text-primary-200/75 mt-5 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            Без кредитной карты &middot; Регистрация за 30 секунд
          </p>
        </div>

        {/* Live transcription demo */}
        <HeroLiveDemo />
      </section>

      {/* ─── Stats (dark) ─── */}
      <section className="py-12 bg-primary-950 bg-grid">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {stats.map((s, i) => (
            <div key={s.label} className={`text-center ${i < stats.length - 1 ? "md:border-r md:border-primary-800" : ""}`}>
              <div className="text-4xl md:text-5xl font-black text-white">
                <CountUpNumber target={s.value} prefix={s.prefix} suffix={s.suffix} />
              </div>
              <div className="text-sm text-primary-100/80 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Bento-grid Features (dark) ─── */}
      <section id="features" className="py-20 bg-dark-100">
        <FadeInOnScroll>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-400 tracking-wide uppercase mb-3">Возможности</p>
            <h2 className="section-heading text-white">
              Не просто текст —<br />
              <span className="gradient-text">структурированные инсайты</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <div key={f.title} className={`group relative overflow-hidden backdrop-blur-sm rounded-2xl p-6 border transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_40px_rgba(79,70,229,0.1)] ${i === 0 ? "md:row-span-2 bg-gradient-to-br from-primary-500/10 to-white/[0.03] border-white/[0.08] hover:border-primary-500/30" : "bg-white/[0.04] border-white/[0.06] hover:border-primary-500/30 hover:bg-white/[0.07]"}`}>
                {/* Unique visual element per card */}
                {i === 0 && (
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
                  </div>
                )}
                {i === 1 && (
                  <div className="absolute top-4 right-4 flex gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-400/30" />
                    <div className="w-3 h-3 rounded-full bg-violet-400/30" />
                    <div className="w-3 h-3 rounded-full bg-amber-400/30" />
                  </div>
                )}
                {i === 2 && (
                  <div className="absolute top-4 right-4">
                    <svg className="w-5 h-5 text-amber-400/30 animate-pulse-slow" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                )}
                {i === 3 && (
                  <div className="absolute top-4 right-4 flex gap-1.5">
                    <span className="text-[10px] font-mono bg-white/10 text-gray-400 px-1.5 py-0.5 rounded">TXT</span>
                    <span className="text-[10px] font-mono bg-white/10 text-gray-400 px-1.5 py-0.5 rounded">SRT</span>
                  </div>
                )}

                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
        </FadeInOnScroll>
      </section>

      {/* ─── How it works ─── */}
      <section className="py-20 bg-white">
        <FadeInOnScroll>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-600 tracking-wide uppercase mb-3">3 шага</p>
            <h2 className="section-heading">Как это работает</h2>
          </div>
          <div className="relative grid md:grid-cols-3 gap-8">
            <div className="hidden md:block absolute top-6 left-[20%] right-[20%] h-px bg-primary-200" />
            {[
              { step: "01", title: "Загрузите", desc: "Перетащите аудио или видео. MP3, WAV, MP4 и ещё 8 форматов. До 500 МБ." },
              { step: "02", title: "Подождите", desc: "Нейросеть расшифрует речь за ~2 минуты на час записи. Спикеры и пунктуация автоматически." },
              { step: "03", title: "Получите", desc: "Текст, таймкоды, AI-саммари, тезисы, action items. Экспорт в TXT и SRT." },
            ].map((item) => (
              <div key={item.step} className="relative text-center md:text-left">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 shadow-lg shadow-primary-500/30 flex items-center justify-center text-white font-bold text-sm mx-auto md:mx-0 mb-4 relative z-10">
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
      <section id="use-cases" className="py-20 bg-surface-50">
        <FadeInOnScroll>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-600 tracking-wide uppercase mb-3">Аудитория</p>
            <h2 className="section-heading">Кому подходит Dicto</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
            {useCases.map((uc) => (
              <div key={uc.title} className="gradient-border group">
                <div className="bg-white rounded-2xl p-6 text-center h-full transition-transform duration-300 group-hover:scale-[1.02]">
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

      {/* ─── Pricing (dark) ─── */}
      <section id="pricing" className="py-20 md:py-24 bg-dark-50 bg-grid">
        <FadeInOnScroll>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-400 tracking-wide uppercase mb-3">Тарифы</p>
            <h2 className="section-heading text-white mb-4">Простые и прозрачные</h2>
            <p className="text-gray-400">Начните бесплатно. Без скрытых платежей.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-8">
              <h3 className="font-bold text-lg text-white">Free</h3>
              <p className="text-xs text-gray-500 mt-1">Для знакомства</p>
              <div className="mt-4 mb-6">
                <span className="text-4xl font-extrabold text-white">0 ₽</span>
              </div>
              <ul className="space-y-3 text-sm text-gray-300 mb-8">
                <li className="flex items-center gap-2"><span className="text-green-400">&#10003;</span> 30 мин/мес + 180 бонус</li>
                <li className="flex items-center gap-2"><span className="text-green-400">&#10003;</span> 5 AI-саммари</li>
                <li className="flex items-center gap-2"><span className="text-green-400">&#10003;</span> Спикеры до 3</li>
                <li className="flex items-center gap-2"><span className="text-green-400">&#10003;</span> Экспорт TXT / SRT</li>
              </ul>
              <Link to="/register" className="w-full text-center block border-2 border-primary-400 text-primary-300 hover:bg-primary-500/20 font-semibold px-5 py-2.5 rounded-xl transition-all duration-200">Начать бесплатно</Link>
            </div>
            {/* Start */}
            <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-8">
              <h3 className="font-bold text-lg text-white">Старт</h3>
              <p className="text-xs text-gray-500 mt-1">Для подкастеров и фрилансеров</p>
              <div className="mt-4 mb-6">
                <span className="text-4xl font-extrabold text-white">500 ₽</span>
                <span className="text-gray-400 text-sm">/мес</span>
              </div>
              <ul className="space-y-3 text-sm text-gray-300 mb-8">
                <li className="flex items-center gap-2"><span className="text-green-400">&#10003;</span> 600 мин (10 часов)</li>
                <li className="flex items-center gap-2"><span className="text-green-400">&#10003;</span> AI-саммари безлимит</li>
                <li className="flex items-center gap-2"><span className="text-green-400">&#10003;</span> Разметка до 10 спикеров</li>
                <li className="flex items-center gap-2"><span className="text-green-400">&#10003;</span> TXT / SRT / DOCX</li>
              </ul>
              <Link to="/register" className="w-full text-center block border-2 border-primary-400 text-primary-300 hover:bg-primary-500/20 font-semibold px-5 py-2.5 rounded-xl transition-all duration-200">Попробовать Старт</Link>
            </div>
            {/* Pro — popular */}
            <div className="relative gradient-border shadow-glow-lg md:scale-[1.02]">
              <div className="bg-dark-100 rounded-2xl p-8 h-full">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-primary-600 to-accent-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                    Популярный
                  </span>
                </div>
                <h3 className="font-bold text-lg text-white">Про</h3>
                <p className="text-xs text-accent-500 font-medium mt-1">Для бизнеса и продакшена</p>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-extrabold text-white">820 ₽</span>
                  <span className="text-gray-400 text-sm">/мес</span>
                </div>
                <ul className="space-y-3 text-sm text-gray-300 mb-8">
                  <li className="flex items-center gap-2"><span className="text-green-400">&#10003;</span> 1 500 мин (25 часов)</li>
                  <li className="flex items-center gap-2"><span className="text-green-400">&#10003;</span> Спикеры без лимита</li>
                  <li className="flex items-center gap-2"><span className="text-green-400">&#10003;</span> RAG-чат безлимит</li>
                  <li className="flex items-center gap-2"><span className="text-green-400">&#10003;</span> Action items</li>
                </ul>
                <Link to="/register" className="btn-primary w-full text-center block">Попробовать Про</Link>
              </div>
            </div>
          </div>
          <div className="text-center mt-8">
            <Link to="/pricing" className="text-sm text-primary-300 hover:text-white transition underline underline-offset-4">
              Бизнес 2 300 ₽ и Премиум 4 600 ₽ — все тарифы →
            </Link>
          </div>
        </div>
        </FadeInOnScroll>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="py-20 bg-surface-50">
        <FadeInOnScroll>
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-600 tracking-wide uppercase mb-3">FAQ</p>
            <h2 className="section-heading">Частые вопросы</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <AccordionItem key={faq.q} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
        </FadeInOnScroll>
      </section>

      {/* ─── Final CTA (gradient) ─── */}
      <section className="py-20 md:py-28 relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-purple-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float hidden md:block motion-reduce:hidden motion-reduce:animate-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent-400/10 rounded-full blur-3xl animate-float hidden md:block motion-reduce:hidden motion-reduce:animate-none" style={{ animationDelay: "3s" }} />
        <FadeInOnScroll>
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">
            Ваша следующая запись
            <br />станет текстом за 2 минуты
          </h2>
          <p className="text-white/70 text-lg mb-10">
            Зарегистрируйтесь бесплатно и получите 15 минут транскрибации.
          </p>
          <Link
            to="/register"
            className="inline-block bg-white text-primary-950 px-10 py-4 rounded-2xl text-lg font-bold hover:bg-gray-100 transition-all duration-200 shadow-xl hover:shadow-[0_8px_30px_rgba(255,255,255,0.3)] hover:-translate-y-0.5"
          >
            Попробовать бесплатно
          </Link>
        </div>
        </FadeInOnScroll>
      </section>

      {/* ─── Footer (dark) ─── */}
      <footer className="py-12 bg-dark-100 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-white text-lg tracking-tight">Dicto</span>
              <span className="text-sm text-gray-500">&copy; 2026</span>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400">
              <Link to="/audio-v-tekst" className="hover:text-white transition">Аудио в текст</Link>
              <Link to="/video-v-tekst" className="hover:text-white transition">Видео в текст</Link>
              <Link to="/nejroset-transkribaciya" className="hover:text-white transition">Нейросеть</Link>
              <Link to="/rasshifrovka-golosovyh" className="hover:text-white transition">Голосовые</Link>
              <Link to="/blog" className="hover:text-white transition">Блог</Link>
              <Link to="/pricing" className="hover:text-white transition">Тарифы</Link>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center md:justify-end gap-5 text-xs text-gray-500">
            <Link to="/privacy" className="hover:text-white transition">Политика конфиденциальности</Link>
            <Link to="/terms" className="hover:text-white transition">Пользовательское соглашение</Link>
            <a href="mailto:support@dicto.pro" className="hover:text-white transition">support@dicto.pro</a>
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
