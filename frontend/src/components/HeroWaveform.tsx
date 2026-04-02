import { useMemo } from "react";

/**
 * Анимированная аудио-волна для hero-секции.
 * Две зоны визуализации: верхняя (за заголовком, тонкие волны) и нижняя (эквалайзер над мокапом).
 * Центральная зона текста остаётся чистой.
 */

const EQ_BARS = 48;

interface EqBar {
  id: number;
  height: number;
  delay: number;
  duration: number;
}

function generateEqBars(count: number): EqBar[] {
  const bars: EqBar[] = [];
  let seed = 42;
  const rand = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < count; i++) {
    const centerDist = Math.abs(i - count / 2) / (count / 2);
    const baseHeight = 0.15 + (1 - centerDist * centerDist) * 0.85;
    bars.push({
      id: i,
      height: baseHeight * (0.4 + rand() * 0.6),
      delay: rand() * -4,
      duration: 0.8 + rand() * 1.4,
    });
  }
  return bars;
}

export default function HeroWaveform() {
  const eqBars = useMemo(() => generateEqBars(EQ_BARS), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">

      {/* ─── Ambient glow blobs ─── */}
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-primary-500/12 rounded-full blur-[120px]" />
      <div className="absolute top-[20%] left-[25%] -translate-x-1/2 w-[300px] h-[250px] bg-violet-500/8 rounded-full blur-[80px]" />
      <div className="absolute top-[20%] left-[75%] -translate-x-1/2 w-[300px] h-[250px] bg-accent-500/6 rounded-full blur-[80px]" />
      <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary-600/10 rounded-full blur-[100px]" />

      {/* ─── Upper sine waves — behind title area (subtle) ─── */}
      <svg className="absolute top-0 left-0 w-full h-[40%]" viewBox="0 0 1200 300" preserveAspectRatio="none">
        <defs>
          <linearGradient id="wg1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(99,102,241,0)" />
            <stop offset="30%" stopColor="rgba(99,102,241,0.12)" />
            <stop offset="50%" stopColor="rgba(139,92,246,0.2)" />
            <stop offset="70%" stopColor="rgba(99,102,241,0.12)" />
            <stop offset="100%" stopColor="rgba(99,102,241,0)" />
          </linearGradient>
          <linearGradient id="wg2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(168,85,247,0)" />
            <stop offset="25%" stopColor="rgba(168,85,247,0.08)" />
            <stop offset="50%" stopColor="rgba(168,85,247,0.15)" />
            <stop offset="75%" stopColor="rgba(168,85,247,0.08)" />
            <stop offset="100%" stopColor="rgba(168,85,247,0)" />
          </linearGradient>
        </defs>

        <path stroke="url(#wg1)" strokeWidth="1.5" fill="none">
          <animate attributeName="d" dur="8s" repeatCount="indefinite" values="
            M0,200 C200,160 400,240 600,200 S1000,160 1200,200;
            M0,200 C200,240 400,160 600,200 S1000,240 1200,200;
            M0,200 C200,160 400,240 600,200 S1000,160 1200,200
          " />
        </path>
        <path stroke="url(#wg2)" strokeWidth="1" fill="none">
          <animate attributeName="d" dur="6s" repeatCount="indefinite" values="
            M0,220 C150,190 350,250 550,220 S850,190 1050,220 L1200,220;
            M0,220 C150,250 350,190 550,220 S850,250 1050,220 L1200,220;
            M0,220 C150,190 350,250 550,220 S850,190 1050,220 L1200,220
          " />
        </path>
      </svg>

      {/* ─── Lower sine waves — above mockup (more visible) ─── */}
      <svg className="absolute bottom-0 left-0 w-full h-[45%]" viewBox="0 0 1200 350" preserveAspectRatio="none">
        <defs>
          <linearGradient id="wg3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(99,102,241,0)" />
            <stop offset="20%" stopColor="rgba(99,102,241,0.18)" />
            <stop offset="50%" stopColor="rgba(139,92,246,0.3)" />
            <stop offset="80%" stopColor="rgba(99,102,241,0.18)" />
            <stop offset="100%" stopColor="rgba(99,102,241,0)" />
          </linearGradient>
          <linearGradient id="wg4" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(249,115,22,0)" />
            <stop offset="25%" stopColor="rgba(249,115,22,0.06)" />
            <stop offset="50%" stopColor="rgba(249,115,22,0.12)" />
            <stop offset="75%" stopColor="rgba(249,115,22,0.06)" />
            <stop offset="100%" stopColor="rgba(249,115,22,0)" />
          </linearGradient>
          <linearGradient id="wg5" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(139,92,246,0)" />
            <stop offset="30%" stopColor="rgba(139,92,246,0.1)" />
            <stop offset="50%" stopColor="rgba(139,92,246,0.2)" />
            <stop offset="70%" stopColor="rgba(139,92,246,0.1)" />
            <stop offset="100%" stopColor="rgba(139,92,246,0)" />
          </linearGradient>
        </defs>

        <path stroke="url(#wg3)" strokeWidth="2" fill="none">
          <animate attributeName="d" dur="7s" repeatCount="indefinite" values="
            M0,120 C200,80 400,160 600,120 S1000,80 1200,120;
            M0,120 C200,160 400,80 600,120 S1000,160 1200,120;
            M0,120 C200,80 400,160 600,120 S1000,80 1200,120
          " />
        </path>
        <path stroke="url(#wg4)" strokeWidth="1.5" fill="none">
          <animate attributeName="d" dur="5s" repeatCount="indefinite" values="
            M0,140 C100,115 250,165 400,140 S650,115 800,140 S1000,165 1200,140;
            M0,140 C100,165 250,115 400,140 S650,165 800,140 S1000,115 1200,140;
            M0,140 C100,115 250,165 400,140 S650,115 800,140 S1000,165 1200,140
          " />
        </path>
        <path stroke="url(#wg5)" strokeWidth="1" fill="none">
          <animate attributeName="d" dur="9s" repeatCount="indefinite" values="
            M0,100 C180,70 360,130 540,100 S900,70 1080,100 L1200,100;
            M0,100 C180,130 360,70 540,100 S900,130 1080,100 L1200,100;
            M0,100 C180,70 360,130 540,100 S900,70 1080,100 L1200,100
          " />
        </path>
      </svg>

      {/* ─── Equalizer bars — bottom zone, above mockup ─── */}
      <div className="absolute bottom-[18%] md:bottom-[22%] left-1/2 -translate-x-1/2">
        <div className="flex items-end gap-[2px] md:gap-[3px] h-[60px] md:h-[80px] opacity-60">
          {eqBars.map((bar) => (
            <div
              key={bar.id}
              className="hero-eq-bar rounded-full"
              style={{
                width: "2px",
                height: `${bar.height * 100}%`,
                animationDelay: `${bar.delay}s`,
                animationDuration: `${bar.duration}s`,
                background: "linear-gradient(to top, rgba(99,102,241,0.7), rgba(139,92,246,0.4), rgba(168,85,247,0.15))",
              }}
            />
          ))}
        </div>
      </div>

    </div>
  );
}
