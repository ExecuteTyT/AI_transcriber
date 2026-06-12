import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { paymentsApi, type SubscriptionInfo } from "@/api/payments";
import { useAuthStore } from "@/store/authStore";
import { Icon } from "@/components/Icon";
import { ErrorState } from "@/components/states/ErrorState";
import { fadeUp, staggerChildren } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { useSound } from "@/lib/sound";
import { reachGoal } from "@/lib/metrika";
import Seo from "@/components/Seo";

const PLAN_NAMES: Record<string, string> = {
  free: "Free",
  start: "Старт",
  pro: "Про",
  expert: "Эксперт",
  premium: "Премиум",
};

const PLAN_FEATURES: Record<string, string[]> = {
  free: ["30 минут на пробу (разово)", "1 AI-разбор (проба)", "Экспорт TXT / SRT", "Спикеры до 3"],
  start: [
    "600 минут в месяц (10 часов)",
    "Разметка до 10 спикеров",
    "Саммари и тезисы без лимита",
    "Экспорт TXT / SRT / DOCX",
    "10 вопросов чата на запись",
  ],
  pro: [
    "1 800 минут в месяц (30 часов)",
    "Для журналистов и регулярной работы",
    "До 10 спикеров",
    "RAG-чат без лимита",
    "Action items",
    "Приоритетная обработка",
  ],
  expert: [
    "4 200 минут в месяц (70 часов)",
    "Для адвокатов, секретарей, ежедневных митингов",
    "Файлы до 4 часов",
    "Всё из Pro",
    "Приоритетная обработка",
  ],
  premium: [
    "8 400 минут в месяц (140 часов)",
    "Для студий и максимальных объёмов",
    "Файлы до 6 часов",
    "Всё из Expert",
  ],
};

export default function Subscription() {
  const navigate = useNavigate();
  const { play } = useSound();
  const { user } = useAuthStore();
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  // YooKassa возвращает на /subscription?status=success после оплаты.
  // Шлём macro-цель «purchase» один раз и чистим query, чтобы перезагрузка
  // страницы не задвоила конверсию.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("status") === "success") {
      reachGoal("purchase");
      params.delete("status");
      const clean = params.toString();
      window.history.replaceState(
        {},
        "",
        window.location.pathname + (clean ? `?${clean}` : ""),
      );
    }
  }, []);

  useEffect(() => {
    paymentsApi
      .getSubscription()
      .then(setSub)
      .catch((err: unknown) => {
        const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
        const status = axiosErr.response?.status;
        // 404 — у юзера нет подписки, это нормальный кейс (free tier).
        if (status === 404) {
          setSub(null);
          return;
        }
        setError(axiosErr.response?.data?.detail || "Не удалось загрузить подписку");
      })
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
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      const detail = axiosErr.response?.data?.detail || "Ошибка при отмене подписки";
      setError(detail);
      toast.error(detail);
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
  // Приветственный бонус (разовый, 30 мин на пробу при регистрации) живёт отдельно от
  // месячного лимита тарифа и расходуется ПЕРВЫМ. Показываем его явной строкой,
  // чтобы «0 / 600» на карточке не путало с реально доступным остатком.
  const bonusMinutes = user?.bonus_minutes ?? 0;

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
          Ваш <em className="italic text-[var(--accent)]">план</em>
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
      {/* Pro использует contrast-flip: acid в dark, ink в light. Остальные планы —
          обычная elevated-карточка. Это согласовано с /pricing. */}
      <motion.section variants={fadeUp}>
        <div
          className={cn(
            "relative overflow-hidden rounded-3xl p-6 md:p-8 border",
            isPopular
              ? "bg-[var(--highlight-bg)] border-[var(--highlight-bg)]"
              : "bg-[var(--bg-elevated)] border-[var(--border)]"
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                className={cn(
                  "font-mono text-[10px] uppercase tracking-[0.22em]",
                  isPopular ? "text-[var(--highlight-fg-muted)]" : "text-[var(--fg-subtle)]"
                )}
              >
                /{sub.plan}
              </p>
              <h2
                className={cn(
                  "mt-3 font-display text-4xl md:text-5xl leading-none tracking-[-0.01em]",
                  isPopular ? "text-[var(--highlight-fg)]" : "text-[var(--fg)]"
                )}
              >
                {PLAN_NAMES[sub.plan] || sub.plan}
              </h2>
            </div>
            {sub.status === "active" && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em]",
                  isPopular ? "text-[var(--highlight-fg)]" : "text-[var(--accent)]"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full animate-pulse",
                    isPopular ? "bg-[var(--highlight-accent)]" : "bg-[var(--accent)]"
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
                isPopular ? "text-[var(--highlight-fg-muted)]" : "text-[var(--fg-muted)]"
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
                  isPopular ? "text-[var(--highlight-fg-muted)]" : "text-[var(--fg-subtle)]"
                )}
              >
                <span>Использовано</span>
                <span className={cn(isPopular ? "text-[var(--highlight-fg)]" : "text-[var(--fg)]")}>
                  {sub.minutes_used} / {sub.minutes_limit} мин
                </span>
              </div>
              <div
                className={cn(
                  "h-1.5 w-full overflow-hidden rounded-full",
                  isPopular ? "bg-[var(--highlight-accent)]/15" : "bg-[var(--bg-muted)]"
                )}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${usagePercent}%` }}
                  transition={{ duration: 0.9, ease: [0.25, 1, 0.5, 1] }}
                  className={cn(
                    "h-full rounded-full",
                    isPopular
                      ? "bg-[var(--highlight-accent)]"
                      : low
                      ? usagePercent >= 100
                        ? "bg-red-400"
                        : "bg-amber-400"
                      : "bg-[var(--accent)]"
                  )}
                />
              </div>
            </div>
          )}

          {/* Бонусные минуты — отдельный кошелёк поверх тарифа, тратится первым. */}
          {bonusMinutes > 0 && (
            <div
              className={cn(
                "mt-4 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[12px] leading-[1.4]",
                isPopular
                  ? "bg-[var(--highlight-accent)]/10 text-[var(--highlight-fg-muted)]"
                  : "bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] text-[var(--fg-muted)]"
              )}
            >
              <Icon
                icon={Check}
                size={13}
                strokeWidth={2}
                className={cn("flex-shrink-0", isPopular ? "text-[var(--highlight-accent)]" : "text-[var(--accent)]")}
              />
              <span>
                <span className={cn("font-semibold", isPopular ? "text-[var(--highlight-fg)]" : "text-[var(--fg)]")}>
                  +{bonusMinutes} бонусных минут
                </span>{" "}
                на счету сверх тарифа — расходуются первыми.
              </span>
            </div>
          )}

          {/* Features */}
          <ul className="mt-7 space-y-2.5">
            {planFeatures.map((feature) => (
              <li
                key={feature}
                className={cn(
                  "flex items-start gap-2.5 text-[13px] leading-[1.5]",
                  isPopular ? "text-[var(--highlight-fg-muted)]" : "text-[var(--fg-muted)]"
                )}
              >
                <Icon
                  icon={Check}
                  size={14}
                  strokeWidth={2}
                  className={cn(
                    "mt-0.5 flex-shrink-0",
                    isPopular ? "text-[var(--highlight-accent)]" : "text-[var(--accent)]"
                  )}
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
                  ? "bg-[var(--highlight-accent)] text-[var(--highlight-accent-fg)] hover:opacity-90"
                  : "bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]"
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
                    ? "text-[var(--highlight-fg-muted)] hover:bg-[var(--highlight-accent)]/10"
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
