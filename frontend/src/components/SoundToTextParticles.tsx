import { useMemo } from "react";

const WAVE_CHARS = ["~", "≈", "∿", "〜", "~", "≈"];
const TEXT_CHARS = ["А", "Т", "е", "к", "с", "т", "AI", "→"];

interface Particle {
  id: number;
  wave: string;
  text: string;
  x: number;
  y: number;
  duration: number;
  delay: number;
  size: number;
  direction: number; // 0-360 degrees
}

function generateParticles(count: number, seed: number): Particle[] {
  const particles: Particle[] = [];
  // Simple seeded random for SSR consistency
  let s = seed;
  const rand = () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };

  for (let i = 0; i < count; i++) {
    particles.push({
      id: i,
      wave: WAVE_CHARS[Math.floor(rand() * WAVE_CHARS.length)],
      text: TEXT_CHARS[Math.floor(rand() * TEXT_CHARS.length)],
      x: rand() * 100,
      y: rand() * 100,
      duration: 8 + rand() * 12, // 8-20s
      delay: rand() * -20, // stagger start
      size: 14 + rand() * 10, // 14-24px
      direction: rand() * 360,
    });
  }
  return particles;
}

interface Props {
  /** Number of particles (default: 12) */
  count?: number;
  /** "dark" for hero sections, "light" for white sections */
  variant?: "dark" | "light";
  /** Additional class for container */
  className?: string;
}

export default function SoundToTextParticles({
  count = 12,
  variant = "light",
  className = "",
}: Props) {
  const particles = useMemo(() => generateParticles(count, 42), [count]);

  const isDark = variant === "dark";
  const waveColor = isDark ? "text-primary-400/20" : "text-primary-400/10";
  const textColor = isDark ? "text-accent-400/25" : "text-accent-500/10";

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {particles.map((p) => {
        const dx = Math.cos((p.direction * Math.PI) / 180) * 80;
        const dy = Math.sin((p.direction * Math.PI) / 180) * 60;

        return (
          <div
            key={p.id}
            className="absolute particle-float"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              ["--dx" as string]: `${dx}px`,
              ["--dy" as string]: `${dy}px`,
            }}
          >
            {/* Wave char — visible first half */}
            <span
              className={`absolute inset-0 flex items-center justify-center font-mono font-bold select-none particle-wave ${waveColor}`}
              style={{ fontSize: `${p.size}px` }}
            >
              {p.wave}
            </span>
            {/* Text char — visible second half */}
            <span
              className={`absolute inset-0 flex items-center justify-center font-bold select-none particle-text ${textColor}`}
              style={{ fontSize: `${p.size * 0.85}px` }}
            >
              {p.text}
            </span>
          </div>
        );
      })}
    </div>
  );
}
