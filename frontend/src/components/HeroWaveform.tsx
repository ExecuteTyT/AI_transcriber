import { useMemo } from "react";

/**
 * Анимированная аудио-волна для hero-секции.
 * Три слоя SVG-синусоид + яркий эквалайзер по центру = мгновенный wow.
 */

const EQ_BARS = 32;

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
    const baseHeight = 0.2 + (1 - centerDist * centerDist) * 0.8;
    bars.push({
      id: i,
      height: baseHeight * (0.5 + rand() * 0.5),
      delay: rand() * -4,
      duration: 0.8 + rand() * 1.2,
    });
  }
  return bars;
}

export default function HeroWaveform() {
  const eqBars = useMemo(() => generateEqBars(EQ_BARS), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">

      {/* Large ambient glow */}
      <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary-500/15 rounded-full blur-[120px]" />
      <div className="absolute top-[45%] left-[30%] -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] bg-violet-500/10 rounded-full blur-[80px]" />
      <div className="absolute top-[45%] left-[70%] -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] bg-accent-500/8 rounded-full blur-[80px]" />

      {/* ─── Flowing sine waves (3 layers) ─── */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="none">
        <defs>
          <linearGradient id="wg1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(99,102,241,0)" />
            <stop offset="20%" stopColor="rgba(99,102,241,0.2)" />
            <stop offset="50%" stopColor="rgba(139,92,246,0.35)" />
            <stop offset="80%" stopColor="rgba(99,102,241,0.2)" />
            <stop offset="100%" stopColor="rgba(99,102,241,0)" />
          </linearGradient>
          <linearGradient id="wg2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(139,92,246,0)" />
            <stop offset="30%" stopColor="rgba(139,92,246,0.15)" />
            <stop offset="50%" stopColor="rgba(168,85,247,0.25)" />
            <stop offset="70%" stopColor="rgba(139,92,246,0.15)" />
            <stop offset="100%" stopColor="rgba(139,92,246,0)" />
          </linearGradient>
          <linearGradient id="wg3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(249,115,22,0)" />
            <stop offset="25%" stopColor="rgba(249,115,22,0.08)" />
            <stop offset="50%" stopColor="rgba(249,115,22,0.15)" />
            <stop offset="75%" stopColor="rgba(249,115,22,0.08)" />
            <stop offset="100%" stopColor="rgba(249,115,22,0)" />
          </linearGradient>
        </defs>

        {/* Wave 1 — primary indigo, slow */}
        <path stroke="url(#wg1)" strokeWidth="2.5" fill="none">
          <animate
            attributeName="d"
            dur="7s"
            repeatCount="indefinite"
            values="
              M0,400 C150,340 300,460 450,400 S750,340 900,400 S1050,460 1200,400;
              M0,400 C150,460 300,340 450,400 S750,460 900,400 S1050,340 1200,400;
              M0,400 C150,340 300,460 450,400 S750,340 900,400 S1050,460 1200,400
            "
          />
        </path>

        {/* Wave 2 — violet, medium */}
        <path stroke="url(#wg2)" strokeWidth="2" fill="none">
          <animate
            attributeName="d"
            dur="5s"
            repeatCount="indefinite"
            values="
              M0,400 C100,360 200,440 350,400 S550,360 700,400 S900,440 1050,400 L1200,400;
              M0,400 C100,440 200,360 350,400 S550,440 700,400 S900,360 1050,400 L1200,400;
              M0,400 C100,360 200,440 350,400 S550,360 700,400 S900,440 1050,400 L1200,400
            "
          />
        </path>

        {/* Wave 3 — accent orange, fastest */}
        <path stroke="url(#wg3)" strokeWidth="1.5" fill="none">
          <animate
            attributeName="d"
            dur="4s"
            repeatCount="indefinite"
            values="
              M0,400 C80,375 160,425 240,400 S400,375 480,400 S640,425 720,400 S880,375 960,400 S1120,425 1200,400;
              M0,400 C80,425 160,375 240,400 S400,425 480,400 S640,375 720,400 S880,425 960,400 S1120,375 1200,400;
              M0,400 C80,375 160,425 240,400 S400,375 480,400 S640,425 720,400 S880,375 960,400 S1120,425 1200,400
            "
          />
        </path>
      </svg>

      {/* ─── Center equalizer bars ─── */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-[3px] md:gap-1 h-[120px] md:h-[180px]">
          {eqBars.map((bar) => (
            <div
              key={bar.id}
              className="hero-eq-bar rounded-full"
              style={{
                width: "3px",
                height: `${bar.height * 100}%`,
                animationDelay: `${bar.delay}s`,
                animationDuration: `${bar.duration}s`,
                background: "linear-gradient(to top, rgba(99,102,241,0.8), rgba(139,92,246,0.6), rgba(168,85,247,0.3))",
                boxShadow: "0 0 8px rgba(99,102,241,0.3)",
              }}
            />
          ))}
        </div>
      </div>

      {/* ─── Glowing orb at center (microphone metaphor) ─── */}
      <div className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative">
          {/* Outer ring pulse */}
          <div className="absolute -inset-8 rounded-full border border-primary-400/20 animate-ping" style={{ animationDuration: "3s" }} />
          <div className="absolute -inset-4 rounded-full border border-primary-400/10 animate-ping" style={{ animationDuration: "2.5s", animationDelay: "0.5s" }} />
          {/* Core orb */}
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-primary-500/30 via-violet-500/20 to-accent-500/10 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-[0_0_60px_rgba(99,102,241,0.3)]">
            <svg className="w-7 h-7 md:w-8 md:h-8 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </div>
        </div>
      </div>

    </div>
  );
}
