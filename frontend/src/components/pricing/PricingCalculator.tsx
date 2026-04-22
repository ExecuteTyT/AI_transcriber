import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PLANS, type PlanId } from "@/config/plans";
import { useSound } from "@/lib/sound";

/**
 * Интерактивный калькулятор: пользователь задвигает слайдер
 * «N часов в месяц» — компонент подсвечивает оптимальный тариф.
 *
 * Логика выбора плана:
 *  — берём самый дешёвый из тех, чей minutesLimit ≥ N*60
 *  — если не хватает даже у Премиума — показываем overage на Премиум
 */
export default function PricingCalculator() {
  const [hours, setHours] = useState(10);
  const { play } = useSound();

  const paidPlans = useMemo(() => PLANS.filter((p) => p.priceRub > 0), []);
  const selected = useMemo(() => {
    const needMin = hours * 60;
    const fit = paidPlans.find((p) => p.minutesLimit >= needMin);
    return fit ?? paidPlans[paidPlans.length - 1];
  }, [hours, paidPlans]);

  const overage = useMemo(() => {
    const needMin = hours * 60;
    const extra = Math.max(0, needMin - selected.minutesLimit);
    return extra > 0 ? { min: extra, cost: Math.ceil(extra * selected.overageRubPerMin) } : null;
  }, [hours, selected]);

  const totalCost = selected.priceRub + (overage?.cost ?? 0);
  const fitPercent = Math.min(100, Math.round((hours * 60) / selected.minutesLimit * 100));

  // Для визуализации «сколько часов на каждом тарифе».
  const scale = 120; // максимум часов на шкале

  const handleSliderChange = (v: number) => {
    const prev = Math.floor(hours / 10);
    const next = Math.floor(v / 10);
    if (prev !== next) play("focus");
    setHours(v);
  };

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 md:p-10"
      aria-label="Калькулятор тарифа"
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-10 mb-8">
        <div>
          <p className="eyebrow mb-3">Калькулятор</p>
          <h2 className="font-display text-3xl md:text-5xl leading-[1.02] tracking-[-0.02em] text-[var(--fg)]">
            Сколько вам <em className="italic text-[var(--accent)]">реально нужно</em>?
          </h2>
          <p className="mt-3 text-[14px] text-[var(--fg-muted)] leading-[1.5] max-w-[44ch]">
            Задвиньте ползунок — подберём оптимальный тариф с минимальной ценой за минуту.
          </p>
        </div>
        <div className="md:text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--fg-subtle)] mb-2">
            Рекомендация
          </p>
          <p className="font-display text-5xl md:text-6xl leading-none tabular text-[var(--accent)]">
            {selected.name}
          </p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
            {totalCost.toLocaleString("ru-RU")} ₽/мес
          </p>
        </div>
      </div>

      {/* Slider */}
      <div className="mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
            Часов в месяц
          </span>
          <span className="font-display text-4xl md:text-5xl leading-none tabular text-[var(--fg)]">
            {hours}
            <span className="font-sans font-normal text-[14px] text-[var(--fg-muted)] ml-1">ч</span>
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={scale}
          step={1}
          value={hours}
          onChange={(e) => handleSliderChange(Number(e.target.value))}
          className="w-full cursor-pointer accent-[var(--accent)]"
          aria-label="Часов в месяц"
        />
        <div className="mt-2 grid grid-cols-6 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--fg-subtle)] tabular">
          <span>1</span>
          <span className="text-center">10</span>
          <span className="text-center">25</span>
          <span className="text-center">60</span>
          <span className="text-center">90</span>
          <span className="text-right">120</span>
        </div>
      </div>

      {/* Plan rows — visual scale */}
      <div className="space-y-2">
        {paidPlans.map((plan) => {
          const planHours = plan.minutesLimit / 60;
          const widthPercent = Math.min(100, (planHours / scale) * 100);
          const fits = hours * 60 <= plan.minutesLimit;
          const isSelected = plan.id === selected.id;
          return (
            <PlanRow
              key={plan.id}
              planId={plan.id}
              name={plan.name}
              priceRub={plan.priceRub}
              hours={planHours}
              widthPercent={widthPercent}
              fits={fits}
              isSelected={isSelected}
            />
          );
        })}
      </div>

      {/* Overage warning */}
      {overage && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-4"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300/80 mb-2">
            Overage — превышение лимита
          </p>
          <p className="text-[14px] text-[var(--fg)] leading-[1.55]">
            Вам нужно <span className="font-display tabular">{hours * 60}</span> мин, но даже у Премиума —{" "}
            {selected.minutesLimit}&nbsp;мин. Доплата за превышение:{" "}
            <span className="font-display tabular text-[var(--accent)]">{overage.cost.toLocaleString("ru-RU")} ₽</span>{" "}
            за {overage.min}&nbsp;мин по {selected.overageRubPerMin}&nbsp;₽/мин.
          </p>
        </motion.div>
      )}

      {/* Effective rate */}
      {!overage && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 grid grid-cols-3 gap-px rounded-2xl border border-[var(--border)] bg-[var(--border)] overflow-hidden"
        >
          <Stat
            label="Эффективная цена"
            value={`${(selected.priceRub / hours).toFixed(0)} ₽`}
            unit="за час"
          />
          <Stat
            label="Использование плана"
            value={`${fitPercent}%`}
            unit=""
          />
          <Stat
            label="Overage-запас"
            value={`${(selected.minutesLimit - hours * 60).toLocaleString("ru-RU")}`}
            unit="мин"
          />
        </motion.div>
      )}
    </section>
  );
}

function PlanRow({
  planId,
  name,
  priceRub,
  hours,
  widthPercent,
  fits,
  isSelected,
}: {
  planId: PlanId;
  name: string;
  priceRub: number;
  hours: number;
  widthPercent: number;
  fits: boolean;
  isSelected: boolean;
}) {
  return (
    <div
      className={`relative flex items-center gap-4 rounded-xl px-4 py-3 transition-colors ${
        isSelected ? "bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] ring-1 ring-[var(--accent)]/40" : "hover:bg-[var(--bg-muted)]"
      }`}
    >
      <div className="flex-shrink-0 w-24">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
          /{planId}
        </p>
        <p className={`font-display text-lg leading-none ${isSelected ? "text-[var(--accent)]" : "text-[var(--fg)]"}`}>
          {name}
        </p>
      </div>

      <div className="flex-1 min-w-0">
        <div className="h-1.5 w-full rounded-full bg-[var(--bg-muted)] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${widthPercent}%` }}
            transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
            className={`h-full ${isSelected ? "bg-[var(--accent)]" : fits ? "bg-[var(--border-strong)]" : "bg-[var(--border)]"}`}
          />
        </div>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--fg-subtle)] tabular">
          {hours} ч
        </p>
      </div>

      <div className="flex-shrink-0 text-right">
        <p className={`font-display text-lg leading-none tabular ${isSelected ? "text-[var(--fg)]" : "text-[var(--fg-muted)]"}`}>
          {priceRub.toLocaleString("ru-RU")} ₽
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--fg-subtle)]">
          /мес
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-[var(--bg-elevated)] p-4">
      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--fg-subtle)] mb-2">
        {label}
      </p>
      <p className="font-display text-2xl leading-none text-[var(--fg)] tabular">
        {value}
        {unit && <span className="ml-1 font-mono text-[10px] text-[var(--fg-subtle)]">{unit}</span>}
      </p>
    </div>
  );
}
