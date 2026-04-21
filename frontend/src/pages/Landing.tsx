import { useState, useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import HeroWaveform from "@/components/HeroWaveform";
import HeroLiveDemo from "@/components/HeroLiveDemo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import SoundToggle from "@/components/ui/SoundToggle";
import MicDemoButton from "@/components/MicDemoButton";
import LiveInsightsSection from "@/components/landing/LiveInsightsSection";
import { useSound } from "@/lib/sound";
import { useMagnetic } from "@/hooks/useMagnetic";

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
    <div
      className="border-b border-[var(--border)] cursor-pointer group"
      onClick={() => setOpen((o: boolean) => !o)}
    >
      <div className="flex items-start justify-between gap-6 py-6 md:py-7">
        <div className="flex items-start gap-5 flex-1 min-w-0">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)] pt-1.5">
            Q
          </span>
          <span className="font-display text-xl md:text-2xl leading-[1.15] text-[var(--fg)]">
            {question}
          </span>
        </div>
        <svg
          className={`w-5 h-5 flex-shrink-0 mt-2 text-[var(--fg-subtle)] transition-transform duration-300 ${open ? "rotate-180 text-acid-300" : "group-hover:text-[var(--fg)]"}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: open ? `${maxHeight}px` : "0px", opacity: open ? 1 : 0 }}
      >
        <p className="text-[15px] text-[var(--fg-muted)] leading-[1.55] pb-6 md:pb-7 pl-[3rem] md:pl-[3.5rem]">
          {answer}
        </p>
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
  const { play } = useSound();
  const heroCtaRef = useMagnetic<HTMLAnchorElement>({ radius: 110, strength: 0.32 });
  const finalCtaRef = useMagnetic<HTMLAnchorElement>({ radius: 110, strength: 0.32 });

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
    <div className="min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
      <Helmet>
        <title>Dicto — Транскрибация аудио и видео в текст онлайн | Нейросеть</title>
        <meta name="description" content="Сервис транскрибации аудио и видео в текст с помощью нейросети. Разметка спикеров, AI-саммари, ключевые тезисы, action items. 180 бесплатных минут при регистрации, без карты. Тарифы от 500 ₽/мес." />
        <link rel="canonical" href="https://dicto.pro/" />
        <meta property="og:title" content="Dicto — Транскрибация аудио и видео в текст онлайн" />
        <meta property="og:description" content="Превращайте аудио и видео в текст, саммари и ключевые тезисы с помощью ИИ. Разметка спикеров, таймкоды, экспорт. Бесплатно 15 мин/мес." />
        <meta property="og:url" content="https://dicto.pro/" />
      </Helmet>

      {/* ─── Header (dark-first, editorial) ─── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${scrolled ? "bg-[var(--bg)]/80 backdrop-blur-2xl border-b border-[var(--border)]" : "bg-transparent border-b border-transparent"}`}>
        <div className="max-w-7xl mx-auto px-5 md:px-8 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-display text-2xl tracking-[-0.015em] text-[var(--fg)] leading-none">
            <span className="block w-1.5 h-1.5 rounded-full bg-acid-300 shadow-[0_0_12px_rgba(197,240,20,0.55)]" aria-hidden />
            Dicto
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-[var(--fg-muted)]">
            <a href="#features" onMouseEnter={() => play("focus")} className="hover:text-[var(--fg)] transition-colors">Возможности</a>
            <a href="#use-cases" onMouseEnter={() => play("focus")} className="hover:text-[var(--fg)] transition-colors">Кому</a>
            <a href="#pricing" onMouseEnter={() => play("focus")} className="hover:text-[var(--fg)] transition-colors">Тарифы</a>
            <Link to="/blog" onMouseEnter={() => play("focus")} className="hover:text-[var(--fg)] transition-colors">Блог</Link>
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5">
              <SoundToggle />
              <ThemeToggle />
            </div>
            <Link to="/login" onClick={() => play("tick")} className="text-[13px] px-3 py-2 rounded-full font-medium text-[var(--fg-muted)] hover:text-[var(--fg)] hidden sm:inline-flex transition-colors">
              Войти
            </Link>
            <Link to="/register" onClick={() => play("confirm")} className="btn-accent hidden sm:inline-flex !py-2.5 !px-5 !text-[13px]">
              Попробовать
            </Link>
            <button
              onClick={() => {
                play("tick");
                setMobileMenuOpen((v) => !v);
              }}
              className="md:hidden p-3 rounded-xl transition touch-target hover:bg-[var(--bg-muted)]"
              aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6 text-[var(--fg)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-6 h-6 text-[var(--fg)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ─── Mobile Menu ─── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-[var(--bg)]/95 backdrop-blur-lg" onClick={() => setMobileMenuOpen(false)} />
          <nav className="relative flex flex-col items-center justify-center h-full gap-6 font-display text-2xl text-[var(--fg)]">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="hover:text-acid-300 transition py-2 px-4 touch-target">Возможности</a>
            <a href="#use-cases" onClick={() => setMobileMenuOpen(false)} className="hover:text-acid-300 transition py-2 px-4 touch-target">Кому</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="hover:text-acid-300 transition py-2 px-4 touch-target">Тарифы</a>
            <Link to="/blog" onClick={() => setMobileMenuOpen(false)} className="hover:text-acid-300 transition py-2 px-4 touch-target">Блог</Link>
            <div className="mt-4 flex items-center gap-3">
              <SoundToggle />
              <ThemeToggle />
            </div>
            <div className="flex flex-col gap-3 mt-2 w-64">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="px-8 py-3.5 rounded-full border border-[var(--border-strong)] text-center text-[var(--fg)] hover:bg-[var(--bg-muted)] transition font-sans text-[15px]">Войти</Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="btn-accent justify-center text-center">Попробовать</Link>
            </div>
          </nav>
        </div>
      )}

      {/* ─── Hero (editorial dark) ─── */}
      <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28 bg-[var(--bg)]">

        <HeroWaveform />

        <div className="relative max-w-6xl mx-auto px-6">
          {/* Eyebrow */}
          <p className="eyebrow mb-6 animate-fade-up">
            <span className="inline-block w-2 h-2 rounded-full bg-acid-300 align-middle mr-2 shadow-[0_0_12px_rgba(197,240,20,0.7)]" aria-hidden />
            Транскрибация · AI-саммари · RAG-чат
          </p>

          {/* Editorial H1 — левоприжатый, serif с italic акцентом */}
          <h1 className="display-h1 text-[var(--fg)] max-w-[18ch] mb-8 md:mb-10 animate-fade-up" style={{ animationDelay: "0.05s" }}>
            От записи к <em>готовому тексту</em> за две минуты.
          </h1>

          <p className="font-sans text-lg md:text-xl text-[var(--fg-muted)] max-w-[48ch] leading-[1.55] mb-10 md:mb-12 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            Говорите&nbsp;— мы расшифруем. Текст с таймкодами, разметка спикеров, AI‑саммари и ключевые выводы&nbsp;— в один клик.
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-fade-up" style={{ animationDelay: "0.15s" }}>
            <Link
              ref={heroCtaRef}
              to="/register"
              onClick={() => play("confirm")}
              className="btn-accent w-full sm:w-auto will-change-transform"
            >
              Начать бесплатно
              <span aria-hidden>→</span>
            </Link>
            <a href="#demo" onClick={() => play("tick")} className="btn-editorial-ghost w-full sm:w-auto justify-center">
              Как это работает
            </a>
          </div>

          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)] mt-6 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            Без карты · 180 минут бесплатно при регистрации
          </p>

          {/* Mic demo — signature interactive moment */}
          <div className="mt-10 md:mt-12 animate-fade-up" style={{ animationDelay: "0.25s" }}>
            <MicDemoButton />
          </div>
        </div>

        {/* Live transcription demo */}
        <div id="demo">
          <HeroLiveDemo />
        </div>
      </section>

      {/* ─── Stats row (editorial strip) ─── */}
      <section className="py-14 md:py-16 bg-[var(--bg)] border-y border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-6">
          {stats.map((s, i) => (
            <div key={s.label} className={`flex flex-col ${i < stats.length - 1 ? "md:border-r md:border-[var(--border)] md:pr-6" : ""}`}>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)] mb-3">
                /0{i + 1}
              </p>
              <div className="font-display text-5xl md:text-6xl leading-none text-[var(--fg)]">
                <CountUpNumber target={s.value} prefix={s.prefix} suffix={s.suffix} />
              </div>
              <div className="text-[13px] text-[var(--fg-muted)] mt-3">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Bento-grid Features (editorial dark) ─── */}
      <section id="features" className="py-24 md:py-32 bg-[var(--bg)] border-t border-[var(--border)]">
        <FadeInOnScroll>
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16 md:mb-20 max-w-3xl">
            <p className="eyebrow mb-4">Возможности</p>
            <h2 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-[-0.02em] text-[var(--fg)]">
              Не просто текст&nbsp;— <em className="italic text-acid-300">структурированные инсайты</em>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4 md:gap-5">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`group relative overflow-hidden rounded-2xl p-7 md:p-8 border border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)] transition-colors duration-300 ${i === 0 ? "md:row-span-2" : ""}`}
              >
                {/* Top-right chip */}
                <div className="absolute top-5 right-5 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
                  /0{i + 1}
                </div>

                <div className="w-10 h-10 rounded-xl bg-acid-300/10 border border-acid-300/20 flex items-center justify-center text-acid-300 mb-6 group-hover:bg-acid-300/15 transition-colors">
                  {f.icon}
                </div>
                <h3 className="font-display text-2xl md:text-3xl leading-tight text-[var(--fg)] mb-3">
                  {f.title}
                </h3>
                <p className="text-[15px] text-[var(--fg-muted)] leading-[1.55] max-w-prose">{f.desc}</p>

                {/* Visual accent on featured card */}
                {i === 0 && (
                  <div className="mt-8 pt-6 border-t border-[var(--border)] flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
                    <span className="block w-1.5 h-1.5 rounded-full bg-acid-300 animate-pulse" aria-hidden />
                    Voxtral V2 · Mistral AI
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        </FadeInOnScroll>
      </section>

      {/* ─── How it works (editorial 3-steps) ─── */}
      <section className="py-24 md:py-32 bg-[var(--bg)] border-t border-[var(--border)]">
        <FadeInOnScroll>
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16 md:mb-20">
            <p className="eyebrow mb-4">Процесс</p>
            <h2 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-[-0.02em] text-[var(--fg)] max-w-[18ch]">
              Три шага, <em className="italic text-acid-300">никаких</em> настроек
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-10 md:gap-14">
            {[
              { step: "01", title: "Загрузите", desc: "Аудио, видео или ссылка на YouTube / VK / Rutube. MP3, WAV, MP4 и ещё 8 форматов. До 500 МБ, до 6 часов." },
              { step: "02", title: "Подождите ~2 мин", desc: "Voxtral V2 расшифрует речь, расставит пунктуацию, разметит спикеров. На час записи уходит в среднем 2 минуты." },
              { step: "03", title: "Получите инсайты", desc: "Текст с таймкодами, AI-саммари, ключевые тезисы и action items. Экспорт в TXT / SRT / DOCX. Чат с записью через RAG." },
            ].map((item) => (
              <div key={item.step} className="relative">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--fg-subtle)] mb-5">/{item.step}</p>
                <h3 className="font-display text-3xl md:text-4xl text-[var(--fg)] mb-4 leading-tight">{item.title}</h3>
                <p className="text-[var(--fg-muted)] text-[15px] leading-[1.55]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
        </FadeInOnScroll>
      </section>

      {/* ─── Live insights scroll-section ─── */}
      <LiveInsightsSection />

      {/* ─── Use cases (editorial cards on ink) ─── */}
      <section id="use-cases" className="py-24 md:py-32 bg-[var(--bg-elevated)] border-t border-[var(--border)]">
        <FadeInOnScroll>
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="eyebrow mb-4">Аудитория</p>
            <h2 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-[-0.02em] text-[var(--fg)] max-w-[20ch]">
              Кому подходит <em className="italic text-acid-300">Dicto</em>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {useCases.map((uc) => (
              <div key={uc.title} className="group relative overflow-hidden rounded-2xl p-6 bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-colors duration-300">
                <div className="text-4xl mb-5 grayscale-[0.2] group-hover:grayscale-0 transition-[filter] duration-300">{uc.emoji}</div>
                <h3 className="font-display text-xl text-[var(--fg)] mb-2">{uc.title}</h3>
                <p className="text-sm text-[var(--fg-muted)] leading-relaxed">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
        </FadeInOnScroll>
      </section>

      {/* ─── Pricing (editorial ink) ─── */}
      <section id="pricing" className="py-24 md:py-32 bg-[var(--bg)] border-t border-[var(--border)]">
        <FadeInOnScroll>
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16 md:mb-20 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="max-w-2xl">
              <p className="eyebrow mb-4">Тарифы</p>
              <h2 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-[-0.02em] text-[var(--fg)]">
                Простые <em className="italic text-acid-300">и прозрачные</em>
              </h2>
            </div>
            <p className="text-[15px] text-[var(--fg-muted)] md:text-right md:max-w-[28ch]">
              Без скрытых платежей, без карты.<br />
              Переходите между тарифами в один клик.
            </p>
          </div>

          <div className="grid md:grid-cols-3 border border-[var(--border)] rounded-3xl overflow-hidden">
            {/* Free */}
            <div className="relative p-8 md:p-10 border-b md:border-b-0 md:border-r border-[var(--border)] bg-[var(--bg-elevated)]">
              <div className="flex items-center gap-2 mb-6">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">/free</span>
              </div>
              <div className="mb-8">
                <div className="font-display text-6xl leading-none text-[var(--fg)] mb-2">0&nbsp;₽</div>
                <p className="text-[13px] text-[var(--fg-muted)]">для знакомства</p>
              </div>
              <ul className="space-y-3 text-[14px] text-[var(--fg-muted)] mb-8">
                <li className="flex items-start gap-2.5"><span className="text-acid-300 mt-0.5">✓</span>180 минут при регистрации</li>
                <li className="flex items-start gap-2.5"><span className="text-acid-300 mt-0.5">✓</span>5 AI-саммари</li>
                <li className="flex items-start gap-2.5"><span className="text-acid-300 mt-0.5">✓</span>Спикеры до 3</li>
                <li className="flex items-start gap-2.5"><span className="text-acid-300 mt-0.5">✓</span>Экспорт TXT / SRT</li>
              </ul>
              <Link to="/register" onClick={() => play("tick")} className="btn-editorial-ghost w-full justify-center">
                Начать бесплатно
              </Link>
            </div>

            {/* Start */}
            <div className="relative p-8 md:p-10 border-b md:border-b-0 md:border-r border-[var(--border)] bg-[var(--bg-elevated)]">
              <div className="flex items-center gap-2 mb-6">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">/start</span>
              </div>
              <div className="mb-8">
                <div className="font-display text-6xl leading-none text-[var(--fg)] mb-2">500&nbsp;₽</div>
                <p className="text-[13px] text-[var(--fg-muted)]">для подкастеров и фрилансеров</p>
              </div>
              <ul className="space-y-3 text-[14px] text-[var(--fg-muted)] mb-8">
                <li className="flex items-start gap-2.5"><span className="text-acid-300 mt-0.5">✓</span>600 мин (10 часов)</li>
                <li className="flex items-start gap-2.5"><span className="text-acid-300 mt-0.5">✓</span>AI-саммари без лимита</li>
                <li className="flex items-start gap-2.5"><span className="text-acid-300 mt-0.5">✓</span>Разметка до 10 спикеров</li>
                <li className="flex items-start gap-2.5"><span className="text-acid-300 mt-0.5">✓</span>TXT / SRT / DOCX</li>
              </ul>
              <Link to="/register" onClick={() => play("tick")} className="btn-editorial-ghost w-full justify-center">
                Оформить Старт
              </Link>
            </div>

            {/* Pro — popular, acid highlight */}
            <div className="relative p-8 md:p-10 bg-acid-300 text-ink-900">
              <div className="absolute top-5 right-5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-900/70">
                Популярный
              </div>
              <div className="flex items-center gap-2 mb-6">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-900/70">/pro</span>
              </div>
              <div className="mb-8">
                <div className="font-display text-6xl leading-none mb-2">820&nbsp;₽</div>
                <p className="text-[13px] text-ink-900/70">для бизнеса и продакшена</p>
              </div>
              <ul className="space-y-3 text-[14px] text-ink-900/85 mb-8">
                <li className="flex items-start gap-2.5"><span className="mt-0.5 text-ink-900">✓</span>1 500 мин (25 часов)</li>
                <li className="flex items-start gap-2.5"><span className="mt-0.5 text-ink-900">✓</span>Спикеры без лимита</li>
                <li className="flex items-start gap-2.5"><span className="mt-0.5 text-ink-900">✓</span>RAG-чат без лимита</li>
                <li className="flex items-start gap-2.5"><span className="mt-0.5 text-ink-900">✓</span>Action items</li>
              </ul>
              <Link
                to="/register"
                onClick={() => play("confirm")}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink-900 px-5 py-3 text-[14px] font-semibold text-acid-300 hover:bg-ink-800 transition-colors"
              >
                Попробовать Про <span aria-hidden>→</span>
              </Link>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
              + Бизнес 2 300&nbsp;₽ · Премиум 4 600&nbsp;₽ — для команд и студий
            </p>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 text-[14px] text-[var(--fg)] hover:text-acid-300 transition-colors group"
            >
              Все тарифы
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>
        </div>
        </FadeInOnScroll>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="py-24 md:py-32 bg-[var(--bg-elevated)] border-t border-[var(--border)]">
        <FadeInOnScroll>
        <div className="max-w-3xl mx-auto px-6">
          <div className="mb-12 md:mb-16">
            <p className="eyebrow mb-4">FAQ</p>
            <h2 className="font-display text-5xl md:text-6xl leading-[0.95] tracking-[-0.02em] text-[var(--fg)]">
              Частые <em className="italic text-acid-300">вопросы</em>
            </h2>
          </div>
          <div className="border-t border-[var(--border)]">
            {faqs.map((faq) => (
              <AccordionItem key={faq.q} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
        </FadeInOnScroll>
      </section>

      {/* ─── Final CTA (ink + acid) ─── */}
      <section className="py-24 md:py-32 relative overflow-hidden bg-[var(--bg)] border-t border-[var(--border)]">
        <FadeInOnScroll>
        <div className="relative max-w-4xl mx-auto px-6">
          <h2 className="font-display text-6xl md:text-8xl leading-[0.92] tracking-[-0.02em] text-[var(--fg)] max-w-[14ch] mb-8">
            Ваша следующая запись — <em className="italic text-acid-300">текст за две минуты</em>.
          </h2>
          <p className="text-[var(--fg-muted)] text-lg md:text-xl max-w-[40ch] mb-10 leading-[1.5]">
            Зарегистрируйтесь бесплатно — 180 минут на тест без карты, и попробуйте на своей записи.
          </p>
          <Link
            ref={finalCtaRef}
            to="/register"
            onClick={() => play("confirm")}
            className="btn-accent !py-4 !px-8 !text-[16px] will-change-transform"
          >
            Попробовать бесплатно
            <span aria-hidden>→</span>
          </Link>
        </div>
        </FadeInOnScroll>
      </section>

      {/* ─── Footer (editorial) ─── */}
      <footer className="py-16 bg-[var(--bg)] border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <span className="block w-1.5 h-1.5 rounded-full bg-acid-300" aria-hidden />
              <span className="font-display text-2xl tracking-[-0.015em] text-[var(--fg)] leading-none">Dicto</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)] ml-3">© 2026</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-[var(--fg-muted)]">
              <Link to="/audio-v-tekst" className="hover:text-[var(--fg)] transition">Аудио в текст</Link>
              <Link to="/video-v-tekst" className="hover:text-[var(--fg)] transition">Видео в текст</Link>
              <Link to="/nejroset-transkribaciya" className="hover:text-[var(--fg)] transition">Нейросеть</Link>
              <Link to="/rasshifrovka-golosovyh" className="hover:text-[var(--fg)] transition">Голосовые</Link>
              <Link to="/blog" className="hover:text-[var(--fg)] transition">Блог</Link>
              <Link to="/pricing" className="hover:text-[var(--fg)] transition">Тарифы</Link>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
            <div className="flex flex-wrap gap-5">
              <Link to="/privacy" className="hover:text-[var(--fg)] transition">Конфиденциальность</Link>
              <Link to="/terms" className="hover:text-[var(--fg)] transition">Соглашение</Link>
            </div>
            <a href="mailto:support@dicto.pro" className="hover:text-[var(--fg)] transition normal-case tracking-normal font-sans text-[13px]">support@dicto.pro</a>
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
