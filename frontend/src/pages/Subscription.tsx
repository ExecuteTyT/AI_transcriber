import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Crown, Sparkles } from "lucide-react";
import { paymentsApi, type SubscriptionInfo } from "@/api/payments";
import { Icon } from "@/components/Icon";
import { ErrorState } from "@/components/states/ErrorState";
import { fadeUp, staggerChildren } from "@/lib/motion";
import { cn } from "@/lib/cn";

const PLAN_NAMES: Record<string, string> = { free: "Free", start: "Старт", pro: "Про", business: "Бизнес", premium: "Премиум" };

const PLAN_FEATURES: Record<string, string[]> = {
  free: ["15 минут в месяц", "Базовое саммари", "Экспорт TXT"],
  start: [
    "300 минут в месяц",
    "Разметка спикеров",
    "Саммари и тезисы",
    "Экспорт TXT / SRT / DOCX",
    "5 вопросов чата на запись",
  ],
  pro: [
    "1200 минут в месяц",
    "Разметка спикеров",
    "Саммари, тезисы, задачи",
    "Безлимитный RAG-чат",
    "Приоритетная обработка",
  ],
};

export default function Subscription() {
  const navigate = useNavigate();
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
        <div className="h-8 w-1/3 rounded-xl bg-surface-100" />
        <div className="space-y-4 rounded-3xl border border-gray-200/60 bg-white p-8">
          <div className="h-6 w-1/2 rounded-xl bg-surface-100" />
          <div className="h-3 w-full rounded-full bg-surface-100" />
          <div className="h-10 w-full rounded-xl bg-surface-100" />
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
  const isPro = sub.plan === "pro";
  const low = usagePercent >= 80;

  return (
    <motion.div
      variants={staggerChildren(0.06)}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-lg space-y-5"
    >
      <motion.header variants={fadeUp}>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Подписка</h1>
        <p className="mt-1 text-sm text-gray-500">
          Управляйте тарифом, лимитами и датой продления.
        </p>
      </motion.header>

      {error && (
        <motion.div variants={fadeUp}>
          <ErrorState title="Ошибка" description={error} />
        </motion.div>
      )}

      <motion.section variants={fadeUp}>
        <div
          className={cn(
            "relative overflow-hidden rounded-3xl p-6 md:p-7",
            isPro
              ? "bg-gradient-to-br from-primary-600 via-primary-700 to-accent-600 text-white shadow-elevated"
              : "border border-gray-200/70 bg-white shadow-raised"
          )}
        >
          <div
            className={cn(
              "pointer-events-none absolute inset-0",
              isPro ? "bg-grid opacity-30" : "opacity-60"
            )}
            aria-hidden
            style={
              !isPro
                ? {
                    background:
                      "radial-gradient(80% 60% at 0% 0%, rgba(99,102,241,0.10) 0%, transparent 55%), radial-gradient(80% 60% at 100% 100%, rgba(249,115,22,0.10) 0%, transparent 55%)",
                  }
                : undefined
            }
          />
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  className={cn(
                    "text-xs font-semibold uppercase tracking-[0.14em]",
                    isPro ? "text-white/80" : "text-gray-400"
                  )}
                >
                  Текущий тариф
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <h2 className="text-3xl font-bold tracking-tight">
                    {PLAN_NAMES[sub.plan] || sub.plan}
                  </h2>
                  {isPro && <Icon icon={Crown} size={20} className="text-amber-300" />}
                </div>
              </div>
              {sub.status === "active" && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold",
                    isPro
                      ? "bg-white/20 text-white backdrop-blur"
                      : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      isPro ? "bg-white animate-pulse" : "bg-emerald-500 animate-pulse"
                    )}
                  />
                  Активна
                </span>
              )}
            </div>

            {sub.status === "active" && sub.current_period_end && (
              <p
                className={cn(
                  "mt-2 text-sm",
                  isPro ? "text-white/80" : "text-gray-500"
                )}
              >
                Действует до {new Date(sub.current_period_end).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}

            <div className="mt-6">
              <div
                className={cn(
                  "mb-2 flex items-center justify-between text-sm",
                  isPro ? "text-white/90" : "text-gray-700"
                )}
              >
                <span>Использовано</span>
                <span className="font-semibold tabular">
                  {sub.minutes_used} / {sub.minutes_limit} мин
                </span>
              </div>
              <div
                className={cn(
                  "h-2.5 w-full overflow-hidden rounded-full",
                  isPro ? "bg-white/20" : "bg-surface-100"
                )}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${usagePercent}%` }}
                  transition={{ duration: 0.9, ease: [0.25, 1, 0.5, 1] }}
                  className={cn(
                    "h-full rounded-full",
                    isPro
                      ? "bg-gradient-to-r from-white to-amber-200"
                      : low
                      ? usagePercent >= 100
                        ? "bg-rose-500"
                        : "bg-amber-500"
                      : "bg-gradient-to-r from-primary-500 to-accent-400"
                  )}
                />
              </div>
              <p
                className={cn(
                  "mt-1.5 text-xs tabular",
                  isPro ? "text-white/70" : "text-gray-400"
                )}
              >
                {usagePercent}% использовано
              </p>
            </div>

            <ul className="mt-6 space-y-2">
              {planFeatures.map((feature) => (
                <li
                  key={feature}
                  className={cn(
                    "flex items-center gap-2 text-sm",
                    isPro ? "text-white/95" : "text-gray-700"
                  )}
                >
                  <Icon
                    icon={Check}
                    size={14}
                    strokeWidth={2.5}
                    className={isPro ? "text-emerald-300" : "text-emerald-500"}
                  />
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate("/app/pricing")}
                className={cn(
                  "flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-3 text-sm font-bold transition-all duration-base press",
                  isPro
                    ? "bg-white text-primary-700 hover:bg-surface-50 shadow-raised"
                    : "btn-primary"
                )}
              >
                <Icon icon={Sparkles} size={14} strokeWidth={2.25} />
                {sub.plan === "free" ? "Улучшить план" : "Сменить план"}
              </button>
              {sub.status === "active" && sub.plan !== "free" && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={cancelling}
                  className={cn(
                    "text-sm font-semibold px-4 py-3 rounded-xl transition-colors duration-fast disabled:opacity-60",
                    isPro
                      ? "text-white/80 hover:bg-white/10"
                      : "text-gray-500 hover:text-gray-900 hover:bg-surface-100"
                  )}
                >
                  {cancelling ? "Отмена…" : "Отменить подписку"}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
