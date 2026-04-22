import { useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Pause, Play, Rewind, FastForward } from "lucide-react";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/cn";
import { springTight } from "@/lib/motion";
import type { Segment } from "@/api/transcriptions";

interface AudioPlayerBarProps {
  src: string;
  segments?: Segment[] | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  rate: number;
  onToggle: () => void;
  onSeek: (seconds: number) => void;
  onSkip: (delta: number) => void;
  onRate: (rate: number) => void;
  audioRef: React.RefObject<HTMLAudioElement>;
}

const RATE_OPTIONS = [1, 1.25, 1.5, 2];
const BAR_COUNT = 48;

function formatTime(sec: number) {
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function AudioPlayerBar({
  src,
  segments,
  currentTime,
  duration,
  isPlaying,
  rate,
  onToggle,
  onSeek,
  onSkip,
  onRate,
  audioRef,
}: AudioPlayerBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const waveform = useMemo(() => {
    const heights: number[] = [];
    const segs = segments || [];
    for (let i = 0; i < BAR_COUNT; i++) {
      const portion = segs.length > 0 ? segs[i % segs.length] : null;
      const base = portion ? Math.min(1, portion.text.length / 140) : 0.4;
      heights.push(0.25 + base * 0.75 + (Math.sin(i * 1.7) + 1) * 0.08);
    }
    return heights;
  }, [segments]);

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current || !duration) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = x / rect.width;
    onSeek(ratio * duration);
  };

  return (
    <div className="sticky top-top-bar z-20 md:top-0 -mx-4 md:mx-0 md:rounded-2xl overflow-hidden">
      <div className="relative border-b border-[var(--border)] md:border bg-[var(--bg-elevated)] px-4 py-3 md:px-5 md:py-4">
        <audio ref={audioRef} src={src} preload="metadata" />
        <div className="flex items-center gap-3">
          <motion.button
            type="button"
            onClick={onToggle}
            aria-label={isPlaying ? "Пауза" : "Воспроизведение"}
            whileTap={{ scale: 0.92 }}
            transition={springTight}
            className="relative flex h-11 w-11 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2"
            style={{
              background: "var(--accent)",
              color: "var(--accent-fg)",
              boxShadow:
                "0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent), 0 8px 24px -6px color-mix(in srgb, var(--accent) 40%, transparent)",
            }}
          >
            <Icon icon={isPlaying ? Pause : Play} size={18} strokeWidth={2} />
          </motion.button>

          <button
            type="button"
            onClick={() => onSkip(-10)}
            className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-muted)] transition-colors duration-fast"
            aria-label="Назад 10 секунд"
          >
            <Icon icon={Rewind} size={16} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => onSkip(10)}
            className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-muted)] transition-colors duration-fast"
            aria-label="Вперёд 10 секунд"
          >
            <Icon icon={FastForward} size={16} strokeWidth={1.75} />
          </button>

          <div className="flex-1 min-w-0">
            <div
              ref={trackRef}
              role="slider"
              tabIndex={0}
              aria-label="Позиция воспроизведения"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(currentTime)}
              onClick={handleTrackClick}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") onSkip(-5);
                else if (e.key === "ArrowRight") onSkip(5);
              }}
              className="relative flex h-8 w-full cursor-pointer items-center gap-[2px] focus-visible:outline-none"
            >
              {waveform.map((h, i) => {
                const barProgress = i / BAR_COUNT;
                const active = barProgress <= progress;
                return (
                  <span
                    key={i}
                    className="flex-1 rounded-full transition-colors duration-fast"
                    style={{
                      height: `${Math.max(18, h * 100)}%`,
                      background: active ? "var(--accent)" : "var(--border-strong)",
                    }}
                  />
                );
              })}
            </div>
            <div className="mt-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--fg-subtle)] tabular">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--bg-muted)] p-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--fg-subtle)] tabular">
            {RATE_OPTIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onRate(r)}
                className={cn(
                  "rounded-full px-2 py-0.5 transition-colors duration-fast",
                  rate === r ? "" : "hover:text-[var(--fg)]"
                )}
                style={
                  rate === r
                    ? { background: "var(--accent)", color: "var(--accent-fg)" }
                    : undefined
                }
              >
                {r}x
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              const idx = RATE_OPTIONS.indexOf(rate);
              const next = RATE_OPTIONS[(idx + 1) % RATE_OPTIONS.length];
              onRate(next);
            }}
            className="md:hidden rounded-full border border-[var(--border)] bg-[var(--bg-muted)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--fg-muted)] tabular"
          >
            {rate}x
          </button>
        </div>
      </div>
    </div>
  );
}
