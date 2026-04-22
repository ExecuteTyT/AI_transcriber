import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { paymentsApi, type SubscriptionInfo } from "@/api/payments";
import { Icon } from "@/components/Icon";
import { ErrorState } from "@/components/states/ErrorState";
import { fadeUp, staggerChildren } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { useSound } from "@/lib/sound";
import Seo from "@/components/Seo";

const PLAN_NAMES: Record<string, string> = {
  free: "Free",
  start: "Старт",
  pro: "Про",
  business: "Бизнес",
  premium: "Премиум",
};

const PLAN_FEATURES: Record<string, string[]> = {
  free: ["180 минут при регистрации (единоразово)", "5 AI-саммари", "Экспорт TXT / SRT", "Спикеры до 3"],
  start: [
    "600 минут в месяц (10 часов)",
    "Разметка до 10 спикеров",
    "Саммари и тезисы без лимита",
    "Экспорт TXT / SRT / DOCX",
    "10 вопросов чата на запись",
  ],
  pro: [
    "1 500 минут в месяц (25 часов)",
    "Спикеры без ограничений",
    "RAG-чат без лимита",
    "Action items",
    "Приоритетная обработка",
  ],
  business: [
    "3 600 минут в месяц (60 часов)",
    "Всё из Pro",
    "До 5 пользователей",
    "Файлы до 4 часов",
  ],
  premium: [
    "7 200 минут в месяц (120 часов)",
    "Всё из Business",
    "До 10 пользователей",
    "Файлы до 6 часов",
  ],
};

export default function Subscription() {
  const navigate = useNavigate();
  const { play } = useSound();
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    paymentsApi
      .getSubscription()
      .then(setSub)
      .catch(() => setError("Не удалось загрузить подписку"))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async () => {
    if (!confirm("Вы уверены, что хотите отменить подписку?")) return;
    setCancelling(true);
    play("soft");
    try {
      await paymentsApi.cancel();
      const updated = await paymentsApi.getSubscription();
      setSub(updated);
    } catch {
      setError("Ошибка при отмене подписки");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-lg animate-pulse space-y-4">
        <div className="h-8 w-1/3 rounded-xl bg-[var(--bg-elevated)]" />
        <div className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-8">
          <div className="h-6 w-1/2 rounded-xl bg-[var(--bg-muted)]" />
          <div className="h-3 w-full rounded-full bg-[var(--bg-muted)]" />
          <div className="h-10 w-full rounded-xl bg-[var(--bg-muted)]" />
        </div>
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="mx-auto max-w-lg">
        <ErrorState title="Нет данных" description={error || "Попробуйте обновить страницу."} />
      </div>
    );
  }

  const usagePercent =
    sub.minutes_limit > 0 ? Math.min(100, Math.round((sub.minutes_used / sub.minutes_limit) * 100)) : 0;
  const planFeatures = PLAN_FEATURES[sub.plan] || [];
  const isPopular = sub.plan === "pro";
  const low = usagePercent >= 80;

  return (
    <motion.div
      variants={staggerChildren(0.06)}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-2xl space-y-6"
    >
      <Seo title="Подписка — Dicto" noindex />
      <motion.header variants={fadeUp}>
        <p className="eyebrow mb-3">Подписка</p>
        <h1 className="font-display text-4xl md:text-5xl leading-[1.02] tracking-[-0.02em] text-[var(--fg)]">
          Ваш <em className="italic text-acid-300">план</em>
        </h1>
        <p className="mt-3 text-[14px] text-[var(--fg-muted)] leading-[1.55]">
          Управляйте тарифом, лимитами и датой продления.
        </p>
      </motion.header>

      {error && (
        <motion.div variants={fadeUp}>
          <ErrorState title="Ошибка" description={error} />
        </motion.div>
      )}

      {/* ── Current plan card ── */}
      <motion.section variants={fadeUp}>
        <div
          className={cn(
            "relative overflow-hidden rounded-3xl p-6 md:p-8 border",
            isPopular
              ? "bg-acid-300 text-ink-900 border-acid-300"
              : "bg-[var(--bg-elevated)] text-[var(--fg)] border-[var(--border)]"
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                className={cn(
                  "font-mono text-[10px] uppercase tracking-[0.22em]",
                  isPopular ? "text-ink-900/70" : "text-[var(--fg-subtle)]"
                )}
              >
                /{sub.plan}
              </p>
              <h2
                className={cn(
                  "mt-3 font-display text-4xl md:text-5xl leading-none tracking-[-0.01em]",
                  isPopular ? "text-ink-900" : "text-[var(--fg)]"
                )}
              >
                {PLAN_NAMES[sub.plan] || sub.plan}
              </h2>
            </div>
            {sub.status === "active" && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em]",
                  isPopular ? "text-ink-900/85" : "text-acid-300"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full animate-pulse",
                    isPopular ? "bg-ink-900" : "bg-acid-300"
                  )}
                />
                Активна
              </span>
            )}
          </div>

          {sub.status === "active" && sub.current_period_end && (
            <p
              className={cn(
                "mt-3 text-[13px]",
                isPopular ? "text-ink-900/75" : "text-[var(--fg-muted)]"
              )}
            >
              Действует до{" "}
              {new Date(sub.current_period_end).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}

          {/* Usage bar */}
          {sub.minutes_limit > 0 && (
            <div className="mt-6">
              <div
                className={cn(
                  "mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em]",
                  isPopular ? "text-ink-900/70" : "text-[var(--fg-subtle)]"
                )}
              >
                <span>Использовано</span>
                <span className={cn(isPopular ? "text-ink-900" : "text-[var(--fg)]")}>
                  {sub.minutes_used} / {sub.minutes_limit} мин
                </span>
              </div>
              <div
                className={cn(
                  "h-1.5 w-full overflow-hidden rounded-full",
                  isPopular ? "bg-ink-900/15" : "bg-[var(--bg-muted)]"
                )}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${usagePercent}%` }}
                  transition={{ duration: 0.9, ease: [0.25, 1, 0.5, 1] }}
                  className={cn(
                    "h-full rounded-full",
                    isPopular
                      ? "bg-ink-900"
                      : low
                      ? usagePercent >= 100
                        ? "bg-red-400"
                        : "bg-amber-400"
                      : "bg-acid-300"
                  )}
                />
              </div>
            </div>
          )}

          {/* Features */}
          <ul className="mt-7 space-y-2.5">
            {planFeatures.map((feature) => (
              <li
                key={feature}
                className={cn(
                  "flex items-start gap-2.5 text-[13px] leading-[1.5]",
                  isPopular ? "text-ink-900/90" : "text-[var(--fg-muted)]"
                )}
              >
                <Icon
                  icon={Check}
                  size={14}
                  strokeWidth={2}
                  className={cn("mt-0.5 flex-shrink-0", isPopular ? "text-ink-900" : "text-acid-300")}
                />
                {feature}
              </li>
            ))}
          </ul>

          {/* Actions */}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                play("tick");
                navigate("/app/pricing");
              }}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 text-[13px] font-semibold transition-colors duration-base",
                isPopular
                  ? "bg-ink-900 text-acid-300 hover:bg-ink-800"
                  : "bg-acid-300 text-ink-900 hover:bg-acid-200"
              )}
            >
              {sub.plan === "free" ? "Улучшить план" : "Сменить план"} <span aria-hidden>→</span>
            </button>
            {sub.status === "active" && sub.plan !== "free" && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className={cn(
                  "text-[13px] font-medium px-4 py-3 rounded-full transition-colors duration-fast disabled:opacity-50",
                  isPopular
                    ? "text-ink-900/70 hover:bg-ink-900/10"
                    : "text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-muted)]"
                )}
              >
                {cancelling ? "Отмена…" : "Отменить подписку"}
              </button>
            )}
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
