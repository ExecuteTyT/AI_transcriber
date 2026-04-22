import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Sparkles, ListChecks, CheckSquare } from "lucide-react";
import { Icon } from "@/components/Icon";

/**
 * Scroll-storytelling секция на Landing.
 * Слева: фейковая транскрипция со спикерами, раскрывается по мере скролла.
 * Справа: три наплывающие AI-инсайт-карточки (саммари → тезисы → задачи).
 *
 * На мобилке — sequential layout: сначала transcript, потом insights.
 */

const TRANSCRIPT = [
  { t: "0:00", speaker: "Алексей", color: "text-blue-300", text: "Давайте обсудим результаты третьего квартала и ключевые метрики роста." },
  { t: "0:08", speaker: "Мария", color: "text-violet-300", text: "Конверсия выросла на 23%, основной вклад — мобильный трафик." },
  { t: "0:19", speaker: "Алексей", color: "text-blue-300", text: "Отлично. Какие каналы показали лучший результат?" },
  { t: "0:26", speaker: "Дмитрий", color: "text-amber-300", text: "Органика и рефералы — 68% новых пользователей оттуда. Платный трафик дал 24%." },
  { t: "0:42", speaker: "Мария", color: "text-violet-300", text: "Предлагаю увеличить бюджет на контент-маркетинг — это наш самый сильный канал." },
  { t: "1:05", speaker: "Алексей", color: "text-blue-300", text: "Согласен. Дмитрий, подготовь предложение к следующей встрече." },
];

const INSIGHTS = [
  {
    id: "summary" as const,
    kicker: "Саммари",
    icon: Sparkles,
    title: "Q3: конверсия +23%",
    body: "Рост обеспечен мобильным трафиком. Органика и рефералы — 68% новых пользователей. Команда согласовала увеличение бюджета на контент-маркетинг.",
  },
  {
    id: "key_points" as const,
    kicker: "Ключевые тезисы",
    icon: ListChecks,
    title: "3 главных пункта",
    body: "• Конверсия: +23% к Q2\n• Органика + рефералы: 68% acquisition\n• Бюджет на контент-маркетинг — увеличить",
  },
  {
    id: "action_items" as const,
    kicker: "Action items",
    icon: CheckSquare,
    title: "1 задача на исполнителе",
    body: "Дмитрий — подготовить предложение по увеличению бюджета на контент-маркетинг к следующей встрече.",
  },
];

export default function LiveInsightsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // Раскрытие транскрипта по прогрессу.
  const visibleLines = useTransform(scrollYProgress, [0.1, 0.65], [0, TRANSCRIPT.length]);
  const [linesShown, setLinesShown] = useState(0);
  useEffect(() => {
    const unsub = visibleLines.on("change", (v) => {
      setLinesShown(Math.max(0, Math.min(TRANSCRIPT.length, Math.floor(v))));
    });
    return unsub;
  }, [visibleLines]);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 md:py-32 bg-[var(--bg)] border-t border-[var(--border)]"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-16 md:mb-20 max-w-3xl">
          <p className="eyebrow mb-4">Живые инсайты</p>
          <h2 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-[-0.02em] text-[var(--fg)]">
            От текста — <em className="italic text-[var(--accent)]">к решениям</em>
          </h2>
          <p className="mt-5 text-[15px] text-[var(--fg-muted)] leading-[1.55] max-w-[52ch]">
            AI не просто расшифровывает, а структурирует: вытаскивает саммари, ключевые тезисы и задачи на исполнителях. Промотайте ниже — посмотрите как.
          </p>
        </div>

        {/* Desktop: 2-col (sticky transcript + scrolling insights) */}
        {/* Mobile: sequential */}
        <div className="grid md:grid-cols-[1fr_1fr] md:gap-12 md:items-start">
          {/* ── Left: transcript ── */}
          <div className="md:sticky md:top-24">
            <div className="rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] overflow-hidden">
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border)]">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-acid-300/80" />
                <div className="flex-1 flex justify-center">
                  <div className="px-3 py-0.5 rounded-md bg-[var(--bg)] font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
                    Q3_meeting.mp3 · 12:34
                  </div>
                </div>
              </div>

              <div className="p-5 md:p-6 min-h-[480px] relative">
                <div className="flex items-center gap-2 mb-5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inset-0 rounded-full bg-acid-300 animate-ping opacity-60" />
                    <span className="relative rounded-full bg-acid-300 h-2 w-2" />
                  </span>
                  Транскрипт · 3 спикера
                </div>

                <div className="space-y-3">
                  {TRANSCRIPT.map((line, idx) => {
                    const visible = idx < linesShown;
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: visible ? 1 : 0.2, y: 0 }}
                        transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                        className="flex items-start gap-3"
                      >
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--fg-subtle)] pt-1 w-8 flex-shrink-0 tabular">
                          {line.t}
                        </span>
                        <span className={`font-mono text-[10px] uppercase tracking-[0.14em] ${line.color} pt-1 flex-shrink-0`}>
                          {line.speaker}
                        </span>
                        <span className="text-[13px] leading-[1.55] text-[var(--fg-muted)]">
                          {line.text}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>

                {linesShown < TRANSCRIPT.length && (
                  <div className="mt-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
                    <span className="inline-flex w-3 h-3 items-end gap-[1px]">
                      <span className="w-[2px] bg-acid-300/60 hero-eq-bar" style={{ animationDelay: "0s" }} />
                      <span className="w-[2px] bg-acid-300/60 hero-eq-bar" style={{ animationDelay: "0.15s" }} />
                      <span className="w-[2px] bg-acid-300/60 hero-eq-bar" style={{ animationDelay: "0.3s" }} />
                    </span>
                    Обработка…
                  </div>
                )}
              </div>
            </div>

            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
              ← Скролл раскрывает транскрипт
            </p>
          </div>

          {/* ── Right: scrolling insights ── */}
          <div className="mt-12 md:mt-0 space-y-5 md:space-y-8">
            {INSIGHTS.map((insight, idx) => (
              <InsightCard key={insight.id} insight={insight} index={idx} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function InsightCard({
  insight,
  index,
}: {
  insight: (typeof INSIGHTS)[number];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 85%", "start 40%"],
  });
  const opacity = useTransform(scrollYProgress, [0, 1], [0.3, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [24, 0]);

  return (
    <motion.article
      ref={ref}
      style={{ opacity, y }}
      className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 md:p-8"
    >
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--accent)]/25 bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)]">
            <Icon icon={insight.icon} size={16} strokeWidth={1.75} />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
              /0{index + 1}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
              {insight.kicker}
            </p>
          </div>
        </div>
      </div>
      <h3 className="font-display text-2xl md:text-3xl leading-tight tracking-[-0.01em] text-[var(--fg)] mb-3">
        {insight.title}
      </h3>
      <p className="text-[14px] text-[var(--fg-muted)] leading-[1.6] whitespace-pre-line">
        {insight.body}
      </p>
    </motion.article>
  );
}
