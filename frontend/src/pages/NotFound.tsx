import { Link } from "react-router-dom";
import Seo from "@/components/Seo";

// ASCII-waveform как фирменная деталь 404 — играет на продукте про звук.
const WAVE_FRAMES = [
  "╌╌▁▁▂▃▅▆▇▆▅▃▂▁▁╌╌",
  "╌▁▂▃▅▆▇▇▇▆▅▃▂▁╌╌╌",
  "▂▃▅▆▇▇▇▆▇▇▆▅▃▂▁╌╌",
  "▁▂▃▅▆▇▆▅▆▇▆▅▃▂▁╌╌",
];

export default function NotFound() {
  return (
    <>
    <Seo title="Страница не найдена — 404 · Dicto" noindex />
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] flex items-center justify-center relative overflow-hidden px-6">
      <div className="relative max-w-xl w-full">
        {/* ASCII-waveform */}
        <pre
          aria-hidden
          className="font-mono text-acid-300 text-xl md:text-2xl leading-tight tracking-[0.18em] select-none mb-8 animate-fade-up opacity-90"
        >
{WAVE_FRAMES[0]}
{WAVE_FRAMES[1]}
{WAVE_FRAMES[2]}
{WAVE_FRAMES[3]}
        </pre>

        <p className="eyebrow mb-4">Страница не найдена</p>
        <h1 className="font-display text-6xl md:text-7xl leading-[0.92] tracking-[-0.02em] text-[var(--fg)] mb-6">
          Здесь <em className="italic text-acid-300">тихо</em>.
        </h1>
        <p className="text-[15px] text-[var(--fg-muted)] leading-[1.55] max-w-[40ch] mb-10">
          Адрес, который вы открыли, не существует или страница была удалена.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/" className="btn-accent">
            На главную <span aria-hidden>→</span>
          </Link>
          <Link to="/pricing" className="btn-editorial-ghost">
            Тарифы
          </Link>
        </div>

        <p className="mt-14 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
          HTTP/2 404 · dicto.pro
        </p>
      </div>
    </div>
    </>
  );
}
