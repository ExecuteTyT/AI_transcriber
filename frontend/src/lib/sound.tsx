import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

const STORAGE_KEY = "dicto:sound";

export type Cue = "tick" | "confirm" | "focus" | "soft";

interface SoundContextValue {
  enabled: boolean;
  toggle: () => void;
  set: (enabled: boolean) => void;
  play: (cue: Cue) => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

function readStored(): boolean {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (v === "off") return false;
  return true; // вкл по умолчанию
}

/**
 * Короткие UI-цики, синтезированные через Web Audio API (без файлов).
 * Отключаются при prefers-reduced-motion или ручным toggle.
 */
export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState<boolean>(readStored);
  const ctxRef = useRef<AudioContext | null>(null);
  const reducedMotionRef = useRef<boolean>(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => { reducedMotionRef.current = e.matches; };
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  }, [enabled]);

  const getCtx = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctxRef.current = new AC();
    }
    // Браузеры блокируют audio до пользовательского жеста — resume внутри обработчика клика снимает блок.
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const play = useCallback((cue: Cue) => {
    if (!enabled || reducedMotionRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Настройки цика — короткий атак, быстрый decay, без громкости выше 0.06 (очень тихо).
    const presets: Record<Cue, { freq: number; dur: number; peak: number; type: OscillatorType; sweep?: number }> = {
      tick:    { freq: 1800, dur: 0.05,  peak: 0.035, type: "sine" },
      focus:   { freq: 2200, dur: 0.04,  peak: 0.025, type: "sine" },
      soft:    { freq: 900,  dur: 0.08,  peak: 0.04,  type: "triangle" },
      confirm: { freq: 620,  dur: 0.18,  peak: 0.05,  type: "sine", sweep: 880 },
    };
    const p = presets[cue];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = p.type;
    osc.frequency.setValueAtTime(p.freq, now);
    if (p.sweep) osc.frequency.exponentialRampToValueAtTime(p.sweep, now + p.dur);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(p.peak, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + p.dur);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + p.dur + 0.02);
  }, [enabled, getCtx]);

  const value: SoundContextValue = useMemo(() => ({
    enabled,
    toggle: () => setEnabled((v) => !v),
    set: setEnabled,
    play,
  }), [enabled, play]);

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

/** No-op fallback — для тестов и edge-cases. В production main.tsx обёрнут <SoundProvider>. */
const NOOP_SOUND: SoundContextValue = {
  enabled: false,
  toggle: () => {},
  set: () => {},
  play: () => {},
};

export function useSound(): SoundContextValue {
  return useContext(SoundContext) ?? NOOP_SOUND;
}
