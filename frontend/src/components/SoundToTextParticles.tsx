import { useMemo } from "react";

/**
 * Волновые потоки: цепочки символов ~≈∿ плывут по экрану синусоидой
 * и на середине пути трансформируются в текст "Текст" / "AI" / "речь"
 */

const WAVE_STRINGS = ["~≈∿~≈∿~", "≈~∿≈~∿≈", "∿≈~∿≈~", "~∿≈~∿≈~∿", "≈∿~≈∿~"];
const TEXT_STRINGS = ["Текст", "AI речь", "саммари", "спикеры", "тезисы", "запись", "экспорт"];

interface Stream {
  id: number;
  waveStr: string;
  textStr: string;
  startX: number;
  startY: number;
  duration: number;
  delay: number;
  fontSize: number;
  amplitude: number; // sine wave amplitude
  reverse: boolean; // direction: left→right or right→left
}

function generateStreams(count: number, seed: number): Stream[] {
  const streams: Stream[] = [];
  let s = seed;
  const rand = () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };

  for (let i = 0; i < count; i++) {
    const reverse = rand() > 0.5;
    streams.push({
      id: i,
      waveStr: WAVE_STRINGS[Math.floor(rand() * WAVE_STRINGS.length)],
      textStr: TEXT_STRINGS[Math.floor(rand() * TEXT_STRINGS.length)],
      startX: reverse ? 100 + rand() * 10 : -(10 + rand() * 10),
      startY: 5 + rand() * 90,
      duration: 14 + rand() * 16, // 14-30s for a full pass
      delay: rand() * -30,
      fontSize: 16 + rand() * 12, // 16-28px
      amplitude: 20 + rand() * 40, // 20-60px sine amplitude
      reverse,
    });
  }
  return streams;
}

interface Props {
  count?: number;
  variant?: "dark" | "light";
  className?: string;
}

export default function SoundToTextParticles({
  count = 8,
  variant = "light",
  className = "",
}: Props) {
  const streams = useMemo(() => generateStreams(count, 42), [count]);

  const isDark = variant === "dark";
  const waveOpacity = isDark ? "0.08" : "0.04";
  const textOpacity = isDark ? "0.12" : "0.05";
  const waveColor = isDark ? "#818cf8" : "#6366f1";
  const textColor = isDark ? "#fb923c" : "#f97316";

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {streams.map((st) => (
        <div
          key={st.id}
          className="absolute whitespace-nowrap stream-flow"
          style={{
            top: `${st.startY}%`,
            left: st.reverse ? "auto" : "0",
            right: st.reverse ? "0" : "auto",
            animationDuration: `${st.duration}s`,
            animationDelay: `${st.delay}s`,
            ["--amplitude" as string]: `${st.amplitude}px`,
            ["--direction" as string]: st.reverse ? "-1" : "1",
          }}
        >
          {/* Wave string — visible first half */}
          <span
            className="absolute inset-0 stream-wave font-mono font-bold tracking-[0.3em] select-none"
            style={{
              fontSize: `${st.fontSize}px`,
              color: waveColor,
              opacity: waveOpacity,
            }}
          >
            {st.waveStr}
          </span>
          {/* Text string — visible second half */}
          <span
            className="stream-text font-semibold tracking-wide select-none"
            style={{
              fontSize: `${st.fontSize * 0.9}px`,
              color: textColor,
              opacity: textOpacity,
            }}
          >
            {st.textStr}
          </span>
        </div>
      ))}
    </div>
  );
}
