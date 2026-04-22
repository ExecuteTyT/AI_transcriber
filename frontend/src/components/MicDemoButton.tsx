import { useEffect, useRef, useState } from "react";
import { Mic, Square, X } from "lucide-react";
import { Icon } from "@/components/Icon";
import { useSound } from "@/lib/sound";

const BAR_COUNT = 48;
const RECORD_SEC = 10;

type Phase = "idle" | "permission" | "listening" | "done" | "denied" | "unsupported";

/**
 * Awwwards-level signature moment: пользователь нажимает микрофон,
 * браузер спрашивает разрешение, живая аудио-волна реагирует на его голос,
 * через 10 секунд показывается CTA «Зарегистрируйтесь для полного транскрипта».
 * Никаких backend-вызовов — просто визуальная proof-of-concept.
 */
export default function MicDemoButton() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [amplitudes, setAmplitudes] = useState<number[]>(() => Array(BAR_COUNT).fill(0));
  const [remaining, setRemaining] = useState<number>(RECORD_SEC);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const { play } = useSound();

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    rafRef.current = null;
    timerRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (ctxRef.current && ctxRef.current.state !== "closed") {
      void ctxRef.current.close();
      ctxRef.current = null;
    }
    analyserRef.current = null;
  };

  useEffect(() => () => cleanup(), []);

  const start = async () => {
    setErrorMsg("");
    play("tick");

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setPhase("unsupported");
      return;
    }

    setPhase("permission");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AC();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);

      ctxRef.current = audioCtx;
      analyserRef.current = analyser;

      setPhase("listening");
      play("confirm");
      setRemaining(RECORD_SEC);

      // Countdown
      timerRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            stopAndFinalize();
            return 0;
          }
          return r - 1;
        });
      }, 1000);

      // Waveform loop
      const data = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        // Сэмплируем BAR_COUNT полос, смешиваем предыдущее значение для мягкости.
        const step = Math.floor(data.length / BAR_COUNT) || 1;
        setAmplitudes((prev) => {
          const next: number[] = new Array(BAR_COUNT);
          for (let i = 0; i < BAR_COUNT; i++) {
            const raw = (data[i * step] ?? 0) / 255;
            // Smooth-follow с gain boost для тишины/голоса.
            next[i] = prev[i] * 0.55 + raw * 0.45 * 1.4;
          }
          return next;
        });
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch (err) {
      const name = (err as { name?: string })?.name ?? "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setPhase("denied");
        setErrorMsg("Нужен доступ к микрофону. Разрешите в настройках браузера.");
      } else {
        setPhase("denied");
        setErrorMsg("Не удалось получить аудио-поток.");
      }
      cleanup();
    }
  };

  const stopAndFinalize = () => {
    cleanup();
    setPhase("done");
    play("confirm");
  };

  const reset = () => {
    cleanup();
    setPhase("idle");
    setAmplitudes(Array(BAR_COUNT).fill(0));
    setRemaining(RECORD_SEC);
    setErrorMsg("");
  };

  if (phase === "idle") {
    return (
      <button
        type="button"
        onClick={start}
        className="group inline-flex items-center gap-2.5 font-mono text-[12px] uppercase tracking-[0.18em] text-[var(--fg-subtle)] hover:text-[var(--fg)] transition-colors"
      >
        <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-strong)] group-hover:border-[var(--accent)] group-hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] transition-all">
          <Icon icon={Mic} size={14} className="group-hover:text-[var(--accent)] transition-colors" />
          <span className="absolute inset-0 rounded-full border border-[var(--accent)] opacity-0 group-hover:opacity-60 group-hover:animate-ping" />
        </span>
        Попробовать со своим голосом
      </button>
    );
  }

  return (
    <div className="relative w-full max-w-xl rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-5 md:p-6 animate-fade-up">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${phase === "listening" ? "bg-acid-300" : "bg-[var(--fg-subtle)]"}`}>
            {phase === "listening" && (
              <span className="absolute inset-0 rounded-full bg-acid-300 opacity-70 animate-ping" />
            )}
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
            {phase === "permission" && "Ожидание разрешения…"}
            {phase === "listening" && `REC · ${remaining.toString().padStart(2, "0")}s`}
            {phase === "done" && "Запись завершена"}
            {phase === "denied" && "Нет доступа к микрофону"}
            {phase === "unsupported" && "Микрофон не поддержан"}
          </span>
        </div>
        <button
          type="button"
          onClick={reset}
          aria-label="Закрыть демо"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--fg-subtle)] hover:text-[var(--fg)] hover:bg-[var(--bg-muted)] transition-colors"
        >
          <Icon icon={X} size={14} />
        </button>
      </div>

      {/* Waveform visualization */}
      <div className="flex items-center gap-[2px] h-20 md:h-24 mb-4">
        {amplitudes.map((amp, i) => {
          const height = phase === "listening" ? Math.max(4, amp * 100) : 4;
          const isActive = phase === "listening" && amp > 0.15;
          return (
            <div
              key={i}
              className="flex-1 rounded-full transition-[height,background-color] duration-75 ease-out"
              style={{
                height: `${height}%`,
                backgroundColor: isActive ? "rgb(197,240,20)" : "rgba(247,243,236,0.18)",
                boxShadow: isActive ? "0 0 8px rgba(197,240,20,0.5)" : "none",
              }}
            />
          );
        })}
      </div>

      {/* State-specific content */}
      {phase === "listening" && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] text-[var(--fg-muted)] flex-1">
            Говорите — мы показываем, как Dicto слышит ваш голос в реальном времени.
          </p>
          <button
            type="button"
            onClick={() => {
              play("tick");
              stopAndFinalize();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-muted)] border border-[var(--border-strong)] text-[var(--fg)] text-[13px] font-medium hover:bg-[var(--bg)] transition-colors"
          >
            <Icon icon={Square} size={12} />
            Стоп
          </button>
        </div>
      )}

      {phase === "done" && (
        <div className="space-y-3">
          <p className="font-serif text-[22px] leading-tight text-[var(--fg)]">
            Записалось <em className="italic text-[var(--accent)]">чисто</em> — хорошее аудио.
          </p>
          <p className="text-[13px] text-[var(--fg-muted)]">
            Зарегистрируйтесь, загрузите реальную запись и получите полный транскрипт с AI-инсайтами.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <a href="/register" onClick={() => play("confirm")} className="btn-accent !py-2.5 !px-5 !text-[13px]">
              Получить полный транскрипт →
            </a>
            <button type="button" onClick={reset} className="btn-editorial-ghost !py-2.5 !px-5 !text-[13px]">
              Записать ещё раз
            </button>
          </div>
        </div>
      )}

      {(phase === "denied" || phase === "unsupported") && (
        <div className="space-y-2">
          <p className="text-[13px] text-[var(--fg-muted)]">{errorMsg || "Микрофон не поддержан в этом браузере."}</p>
          <button type="button" onClick={reset} className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)] hover:text-[var(--fg)] transition-colors">
            Попробовать иначе
          </button>
        </div>
      )}

      {phase === "permission" && (
        <p className="text-[13px] text-[var(--fg-muted)]">
          Разрешите доступ к микрофону во всплывающем окне браузера.
        </p>
      )}
    </div>
  );
}
