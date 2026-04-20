import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Gift, Sparkles } from "lucide-react";
import { Icon } from "@/components/Icon";
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
  const usedPercent = minutesLimit > 0 ? Math.min(100, (minutesUsed / minutesLimit) * 100) : 0;
  const low = bonusMinutes === 0 && usedPercent >= 80;

  const animated = useCountUp(totalAvailable);

  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (usedPercent / 100) * circumference;

  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="relative overflow-hidden rounded-3xl border border-gray-200/60 bg-white shadow-raised"
      aria-label="Использование минут"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        aria-hidden
        style={{
          background:
            "radial-gradient(120% 100% at 100% 0%, rgba(249,115,22,0.08) 0%, transparent 55%), radial-gradient(80% 80% at 0% 100%, rgba(99,102,241,0.08) 0%, transparent 55%)",
        }}
      />
      <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-6 md:p-6">
        <div className="flex items-center gap-4">
          <div className="relative h-32 w-32 shrink-0">
            <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
              <defs>
                <linearGradient id="usage-progress" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
              </defs>
              <circle cx="70" cy="70" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="10" />
              <motion.circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={low ? "#f87171" : "url(#usage-progress)"}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.1, ease: easeOutQuart.ease as [number, number, number, number] }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold tracking-tight text-gray-900 tabular">{animated}</span>
              <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">минут</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 sm:hidden">
            <span className="inline-flex items-center gap-1 self-start rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-semibold text-primary-700">
              {planName}
            </span>
            <p className="text-sm font-semibold text-gray-900">осталось</p>
            <p className="text-xs text-gray-500">из {minutesLimit} мин в месяце</p>
          </div>
        </div>

        <div className="flex-1">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-semibold text-primary-700">
              {planName}
            </span>
            <span className="text-xs font-medium text-gray-400">план активен</span>
          </div>
          <h3 className="mt-0 text-lg font-bold tracking-tight text-gray-900 sm:mt-2 sm:text-xl">
            {low ? "Минуты подходят к концу" : "У вас всё под контролем"}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-500">
            {low
              ? "Увеличьте лимит, чтобы не потерять новые идеи и встречи."
              : "Загружайте записи — транскрибация и AI-анализ под рукой."}
          </p>
          {bonusMinutes > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2 ring-1 ring-amber-200/60">
              <Icon icon={Gift} size={14} strokeWidth={2} className="text-amber-600" />
              <span className="text-[12px] font-semibold text-amber-800">
                Бонус <span className="tabular">{bonusMinutes}</span> мин
              </span>
              <span className="ml-auto text-[10px] font-medium text-amber-700/80">
                тратится первым
              </span>
            </div>
          )}
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <MicroStat label="Записей" value={totalRecords.toString()} />
            <MicroStat label="Потрачено" value={`${minutesUsed}`} unit="мин" />
            <MicroStat label="Лимит" value={`${minutesLimit}`} unit="мин" />
          </div>
          <Link
            to="/app/pricing"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:text-primary-600 transition-colors press"
          >
            <Icon icon={Sparkles} size={14} strokeWidth={2} />
            {low ? "Апгрейдить план" : "Посмотреть тарифы"}
            <Icon icon={ChevronRight} size={14} strokeWidth={2.25} />
          </Link>
        </div>
      </div>
    </motion.section>
  );
}

function MicroStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-xl bg-surface-50/80 p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-0.5 text-base font-bold text-gray-900 tabular">
        {value}
        {unit && <span className="ml-0.5 text-[10px] font-medium text-gray-400">{unit}</span>}
      </p>
    </div>
  );
}
