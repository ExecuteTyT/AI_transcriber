import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeUp, easeOutQuart } from "@/lib/motion";

interface UsageCardProps {
  minutesUsed: number;
  minutesLimit: number;
  bonusMinutes: number;
  planName: string;
  totalRecords: number;
}

function useCountUp(target: number, duration = 900, trigger = true) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!trigger) return;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, trigger]);

  return value;
}

export function UsageCard({ minutesUsed, minutesLimit, bonusMinutes, planName, totalRecords }: UsageCardProps) {
  const monthlyRemaining = Math.max(0, minutesLimit - minutesUsed);
  const totalAvailable = bonusMinutes + monthlyRemaining;
  const totalCapacity = bonusMinutes + minutesLimit;
  const isBonusOnly = minutesLimit === 0 && bonusMinutes > 0;
  const usedPercent = totalCapacity > 0
    ? Math.min(100, ((totalCapacity - totalAvailable) / totalCapacity) * 100)
    : 0;
  const low = totalAvailable <= Math.max(10, Math.round(totalCapacity * 0.2));

  const animated = useCountUp(totalAvailable);

  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (usedPercent / 100) * circumference;

  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)]"
      aria-label="Использование минут"
    >
      <div className="relative flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:gap-8 md:p-7">
        {/* ── Progress ring ── */}
        <div className="flex items-center gap-5">
          <div className="relative h-36 w-36 shrink-0">
            <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
              <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--border)" strokeWidth="4" />
              <motion.circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={low ? "#f87171" : "#c5f014"}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.1, ease: easeOutQuart.ease as [number, number, number, number] }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-4xl leading-none tracking-tight text-[var(--fg)] tabular">
                {animated}
              </span>
              <span className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
                минут
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 sm:hidden">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
              {planName} · {isBonusOnly ? "бонус" : "план"}
            </p>
            <p className="font-display text-xl leading-tight text-[var(--fg)]">
              {low ? "Минуты заканчиваются" : "У вас всё под контролем"}
            </p>
            <p className="text-[12px] text-[var(--fg-muted)]">
              {isBonusOnly
                ? `${bonusMinutes} мин стартового бонуса`
                : `из ${totalCapacity} мин на счету`}
            </p>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="flex-1">
          <p className="hidden sm:block font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--fg-subtle)] mb-3">
            {planName} · {isBonusOnly ? "бонус" : "план активен"}
          </p>
          <h3 className="hidden sm:block font-display text-3xl leading-[1.1] tracking-[-0.01em] text-[var(--fg)]">
            {low ? (
              <>Минуты подходят <em className="italic text-acid-300">к концу</em></>
            ) : (
              <>У вас всё <em className="italic text-acid-300">под контролем</em></>
            )}
          </h3>
          <p className="mt-2 text-[14px] leading-[1.55] text-[var(--fg-muted)]">
            {low
              ? "Увеличьте лимит — чтобы не потерять новые записи и идеи."
              : "Загружайте записи: транскрибация и AI-анализ под рукой."}
          </p>

          {/* Bonus chip — видимая инфо-линия, тратится первым */}
          {bonusMinutes > 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-acid-300/25 bg-acid-300/10 px-3 py-2">
              <span className="block w-1.5 h-1.5 rounded-full bg-acid-300 shadow-[0_0_8px_rgba(197,240,20,0.6)]" aria-hidden />
              <span className="text-[12px] text-[var(--fg)]">
                Бонус <span className="tabular font-medium">{bonusMinutes}</span> мин
              </span>
              <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
                тратится первым
              </span>
            </div>
          )}

          {/* Micro-stats row */}
          <div className="mt-5 grid grid-cols-3 gap-px rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--border)]">
            <MicroStat label="Записей" value={totalRecords.toString()} />
            <MicroStat label="Потрачено" value={`${minutesUsed}`} unit="мин" />
            {isBonusOnly ? (
              <MicroStat label="Бонус" value={`${bonusMinutes}`} unit="мин" />
            ) : (
              <MicroStat label="Лимит" value={`${minutesLimit}`} unit="мин" />
            )}
          </div>

          <Link
            to="/app/pricing"
            className="mt-5 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)] hover:text-acid-300 transition-colors group"
          >
            {low ? "Апгрейдить план" : "Посмотреть тарифы"}
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
      </div>
    </motion.section>
  );
}

function MicroStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="bg-[var(--bg-elevated)] p-3">
      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">{label}</p>
      <p className="mt-1 font-display text-xl leading-none text-[var(--fg)] tabular">
        {value}
        {unit && <span className="ml-1 font-mono text-[10px] text-[var(--fg-subtle)]">{unit}</span>}
      </p>
    </div>
  );
}
