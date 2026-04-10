import { useState, useEffect, useRef } from "react";

/* ─── Data: real transcript lines for the demo ─── */
const LINES = [
  { time: "0:00", speaker: "Алексей", color: "from-blue-400 to-blue-600", badge: "bg-blue-500/20 text-blue-300 border-blue-500/30", text: "Давайте обсудим результаты третьего квартала и ключевые метрики роста." },
  { time: "0:15", speaker: "Мария", color: "from-violet-400 to-violet-600", badge: "bg-violet-500/20 text-violet-300 border-violet-500/30", text: "Конверсия выросла на 23%, основной вклад — мобильный трафик." },
  { time: "0:32", speaker: "Алексей", color: "from-blue-400 to-blue-600", badge: "bg-blue-500/20 text-blue-300 border-blue-500/30", text: "Отлично. Какие каналы показали лучший результат?" },
  { time: "0:48", speaker: "Дмитрий", color: "from-amber-400 to-amber-600", badge: "bg-amber-500/20 text-amber-300 border-amber-500/30", text: "Органика и рефералы — 68% новых пользователей оттуда." },
];

const SUMMARY_TEXT = "Обсуждение результатов Q3: конверсия +23% за счёт мобильного трафика. Органика и рефералы — основные каналы роста (68%). Рекомендация — увеличить бюджет на контент-маркетинг.";

/* ─── Mini waveform bars ─── */
function MiniWaveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-end gap-[2px] h-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full transition-all duration-300 ${
            active ? "bg-green-400 hero-eq-bar" : "bg-white/10 h-1"
          }`}
          style={{
            animationDuration: active ? `${0.8 + i * 0.15}s` : undefined,
            animationDelay: active ? `${i * 0.1}s` : undefined,
            height: active ? undefined : "4px",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Typing text with cursor ─── */
function TypingText({ text, speed = 30, onDone }: { text: string; speed?: number; onDone?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const idxRef = useRef(0);

  useEffect(() => {
    idxRef.current = 0;
    setDisplayed("");
    const interval = setInterval(() => {
      idxRef.current++;
      if (idxRef.current <= text.length) {
        setDisplayed(text.slice(0, idxRef.current));
      } else {
        clearInterval(interval);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, onDone]);

  const done = displayed.length === text.length;

  return (
    <span className="text-gray-300 text-[13px] md:text-sm leading-relaxed">
      {displayed}
      {!done && (
        <span className="inline-block w-[2px] h-[14px] bg-primary-400 ml-[1px] animate-pulse align-middle" />
      )}
    </span>
  );
}

/* ─── Main component ─── */
export default function HeroLiveDemo() {
  const [phase, setPhase] = useState<"recording" | "line0" | "line1" | "line2" | "line3" | "done" | "summary" | "reset">("recording");
  const [visibleLines, setVisibleLines] = useState<number[]>([]);
  const [typingLine, setTypingLine] = useState<number | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const clearT = () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };

  // State machine for the animation sequence
  useEffect(() => {
    clearT();

    switch (phase) {
      case "recording":
        // Brief "recording" state, then start first line
        timeoutRef.current = setTimeout(() => setPhase("line0"), 1200);
        break;
      case "line0":
      case "line1":
      case "line2":
      case "line3": {
        const idx = parseInt(phase.replace("line", ""));
        setVisibleLines((prev) => [...prev, idx]);
        setTypingLine(idx);
        break;
      }
      case "done":
        setShowDone(true);
        timeoutRef.current = setTimeout(() => setPhase("summary"), 1000);
        break;
      case "summary":
        setShowSummary(true);
        timeoutRef.current = setTimeout(() => setPhase("reset"), 4000);
        break;
      case "reset":
        // Fade out, then restart
        timeoutRef.current = setTimeout(() => {
          setVisibleLines([]);
          setTypingLine(null);
          setShowSummary(false);
          setShowDone(false);
          setPhase("recording");
        }, 800);
        break;
    }

    return clearT;
  }, [phase]);

  const handleLineDone = (idx: number) => {
    setTypingLine(null);
    const nextLine = idx + 1;
    if (nextLine < LINES.length) {
      timeoutRef.current = setTimeout(() => setPhase(`line${nextLine}` as typeof phase), 400);
    } else {
      timeoutRef.current = setTimeout(() => setPhase("done"), 600);
    }
  };

  const isRecording = phase !== "done" && phase !== "summary" && phase !== "reset";
  const isFading = phase === "reset";

  return (
    <div className={`relative max-w-4xl mx-auto mt-12 md:mt-16 px-4 md:px-6 animate-fade-up transition-opacity duration-700 ${isFading ? "opacity-0" : "opacity-100"}`} style={{ animationDelay: "0.3s" }}>
      {/* Glow behind the card */}
      <div className="absolute inset-0 -inset-x-4 -inset-y-4 bg-primary-500/10 rounded-3xl blur-3xl pointer-events-none" />

      <div className="relative rounded-2xl glass-dark overflow-hidden shadow-elevated-lg border border-white/[0.08]">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
          <div className="flex-1 flex justify-center">
            <div className="px-4 py-0.5 bg-white/[0.06] rounded-md text-[11px] text-primary-300/70 border border-white/[0.06]">voitra.pro</div>
          </div>
        </div>

        {/* Top bar inside mockup */}
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">V</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white text-[13px] font-medium">Совещание Q3</span>
              <span className="text-gray-500 text-[10px]">3 спикера · 12 мин</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MiniWaveform active={isRecording} />
            {showDone ? (
              <span className="badge bg-green-500/20 text-green-300 border border-green-500/30 text-[10px] animate-fade-in">
                Готово
              </span>
            ) : isRecording ? (
              <span className="badge bg-blue-500/15 text-blue-300 border border-blue-500/20 text-[10px] animate-pulse">
                Обработка...
              </span>
            ) : null}
          </div>
        </div>

        {/* Transcript area */}
        <div className="p-4 md:px-6 md:py-5 min-h-[200px] md:min-h-[220px] relative">
          {/* Tab bar */}
          <div className="flex gap-1.5 mb-4">
            {["Транскрипт", "Саммари"].map((t, i) => (
              <button
                key={t}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-500 ${
                  (i === 0 && !showSummary) || (i === 1 && showSummary)
                    ? "bg-primary-500/30 text-primary-200 shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                    : "bg-white/[0.04] text-gray-500"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Lines */}
          {!showSummary && (
            <div className="space-y-1">
              {visibleLines.map((idx) => {
                const line = LINES[idx];
                const isTyping = typingLine === idx;
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-2 md:gap-3 py-2 px-2 rounded-lg transition-all duration-500 ${
                      isTyping ? "bg-white/[0.04] border-l-2 border-primary-400/60" : "border-l-2 border-transparent"
                    }`}
                    style={{
                      animation: "fadeSlideIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
                    }}
                  >
                    <span className="text-primary-400/70 font-mono text-[11px] w-8 flex-shrink-0 pt-[3px] tabular-nums">
                      {line.time}
                    </span>
                    <span
                      className={`badge ${line.badge} border text-[10px] flex-shrink-0`}
                      style={{
                        animation: "badgePop 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards",
                        animationDelay: "0.1s",
                        opacity: 0,
                        transform: "scale(0.7)",
                      }}
                    >
                      {line.speaker}
                    </span>
                    <div className="flex-1 min-w-0">
                      {isTyping ? (
                        <TypingText text={line.text} speed={25} onDone={() => handleLineDone(idx)} />
                      ) : (
                        <span className="text-gray-300 text-[13px] md:text-sm leading-relaxed">{line.text}</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Ghost "next line" shimmer */}
              {isRecording && visibleLines.length < LINES.length && (
                <div className="flex items-center gap-3 py-2 px-2 animate-pulse opacity-30">
                  <div className="w-8 h-3 bg-white/10 rounded" />
                  <div className="w-14 h-5 bg-white/10 rounded-full" />
                  <div className="flex-1 h-3 bg-white/[0.05] rounded" />
                </div>
              )}
            </div>
          )}

          {/* Summary view */}
          {showSummary && (
            <div className="animate-fade-up space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12" />
                  </svg>
                </div>
                <span className="text-[12px] font-semibold text-primary-300">AI-саммари</span>
              </div>
              <p className="text-gray-300 text-[13px] md:text-sm leading-relaxed">{SUMMARY_TEXT}</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {["Конверсия +23%", "Мобильный трафик", "Органика 68%"].map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-md bg-primary-500/15 text-primary-300 text-[10px] font-medium border border-primary-500/20">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
