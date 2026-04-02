import { useMemo } from "react";

/**
 * Анимированный аудио-эквалайзер для hero-секции.
 * Вертикальные бары пульсируют как реальный аудио-визуализатор,
 * создавая wow-эффект и мгновенно передавая суть продукта — звук → текст.
 */

const BAR_COUNT = 48;

interface Bar {
  id: number;
  x: number;
  height: number;
  delay: number;
  duration: number;
  opacity: number;
}

function generateBars(count: number): Bar[] {
  const bars: Bar[] = [];
  let seed = 42;
  const rand = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < count; i++) {
    const centerDist = Math.abs(i - count / 2) / (count / 2); // 0 at center, 1 at edges
    const baseHeight = 0.3 + (1 - centerDist) * 0.7; // Higher in center

    bars.push({
      id: i,
      x: (i / (count - 1)) * 100,
      height: baseHeight * (0.4 + rand() * 0.6),
      delay: rand() * -5,
      duration: 1.5 + rand() * 2,
      opacity: 0.15 + (1 - centerDist) * 0.35,
    });
  }
  return bars;
}

export default function HeroWaveform() {
  const bars = useMemo(() => generateBars(BAR_COUNT), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Central glow behind the waveform */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary-500/8 rounded-full blur-[100px]" />

      {/* Waveform bars */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full max-w-5xl h-[280px] md:h-[360px]">
          {bars.map((bar) => (
            <div
              key={bar.id}
              className="absolute bottom-1/2 hero-bar"
              style={{
                left: `${bar.x}%`,
                width: "2px",
                height: `${bar.height * 100}%`,
                opacity: bar.opacity,
                animationDelay: `${bar.delay}s`,
                animationDuration: `${bar.duration}s`,
                transformOrigin: "bottom center",
              }}
            >
              {/* Top bar (goes up) */}
              <div
                className="absolute bottom-0 left-0 w-full rounded-full"
                style={{
                  height: "100%",
                  background: `linear-gradient(to top, rgba(99, 102, 241, 0.6), rgba(139, 92, 246, 0.2), transparent)`,
                }}
              />
            </div>
          ))}
          {/* Mirror bars (bottom half) */}
          {bars.map((bar) => (
            <div
              key={`m-${bar.id}`}
              className="absolute top-1/2 hero-bar"
              style={{
                left: `${bar.x}%`,
                width: "2px",
                height: `${bar.height * 50}%`,
                opacity: bar.opacity * 0.5,
                animationDelay: `${bar.delay}s`,
                animationDuration: `${bar.duration}s`,
                transformOrigin: "top center",
              }}
            >
              <div
                className="absolute top-0 left-0 w-full rounded-full"
                style={{
                  height: "100%",
                  background: `linear-gradient(to bottom, rgba(99, 102, 241, 0.4), transparent)`,
                }}
              />
            </div>
          ))}

          {/* Horizontal center line */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/20 to-transparent" />
        </div>
      </div>

      {/* Floating text fragments that appear from the waveform — sound becoming text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full max-w-4xl h-[300px]">
          {[
            { text: "Транскрипт", x: "8%", y: "20%", delay: "0s", size: "text-xs" },
            { text: "AI саммари", x: "82%", y: "25%", delay: "2s", size: "text-xs" },
            { text: "Спикер 1", x: "15%", y: "72%", delay: "4s", size: "text-[11px]" },
            { text: "тезисы", x: "78%", y: "70%", delay: "6s", size: "text-[11px]" },
            { text: "таймкоды", x: "5%", y: "48%", delay: "3s", size: "text-[11px]" },
            { text: "экспорт", x: "88%", y: "50%", delay: "5s", size: "text-[11px]" },
          ].map((item, i) => (
            <span
              key={i}
              className={`absolute ${item.size} font-medium text-primary-300/0 hero-text-float select-none`}
              style={{
                left: item.x,
                top: item.y,
                animationDelay: item.delay,
              }}
            >
              {item.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
