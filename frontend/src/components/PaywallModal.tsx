import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wallet, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { paymentsApi, WALLET_PACKS } from "@/api/payments";
import { usePaywallStore } from "@/store/paywallStore";
import { useAuthStore } from "@/store/authStore";
import { Icon } from "@/components/Icon";
import { reachGoal } from "@/lib/metrika";
import { cn } from "@/lib/cn";

/**
 * Заголовки модалки по reason. Дефолт — общий «Пополните, чтобы продолжить».
 */
const TITLE_BY_REASON: Record<string, string> = {
  no_minutes: "Минуты закончились",
  file_exceeds_balance: "Файл длиннее остатка",
  analysis_locked: "AI-разбор недоступен",
  chat_locked: "Чат недоступен",
};

/**
 * Глобальный пейволл. Монтируется один раз в App; открывается через
 * usePaywallStore (его дёргает axios-интерсептор на 402). На любой странице.
 */
export default function PaywallModal() {
  const { open, detail, closePaywall } = usePaywallStore();
  const user = useAuthStore((s) => s.user);
  // pending — код активного запроса оплаты (pack code / "pro"), для disabled+спиннера.
  const [pending, setPending] = useState<string | null>(null);

  // Цель воронки теста: пользователь увидел пейволл (упёрся в лимит/файл/чат).
  useEffect(() => {
    if (open && detail) reachGoal("paywall_hit", { reason: detail.reason });
  }, [open, detail]);

  const title = (detail && TITLE_BY_REASON[detail.reason]) || "Пополните, чтобы продолжить";

  /** Запускает создание платежа и редиректит на YooKassa. */
  const startPayment = async (
    key: string,
    request: () => Promise<{ confirmation_url: string }>,
    goalParams: Record<string, unknown>,
  ) => {
    setPending(key);
    try {
      const resp = await request();
      // Цель воронки теста: начал оплату из пейволла (кошелёк/Pro) перед уходом на YooKassa.
      reachGoal("checkout_started", { source: "paywall", ...goalParams });
      window.location.href = resp.confirmation_url;
    } catch (err) {
      const axiosErr = err as {
        response?: { status?: number; data?: { detail?: string | { message?: string } } };
        message?: string;
      };
      const status = axiosErr.response?.status;
      const rawDetail = axiosErr.response?.data?.detail;
      const detailMsg = typeof rawDetail === "string" ? rawDetail : rawDetail?.message;
      let msg: string;
      if (status === 502 || status === 503) {
        msg = "Платёжный сервис временно недоступен. Попробуйте позже.";
      } else if (status === 500) {
        msg = "Ошибка сервера. Попробуйте позже.";
      } else {
        msg = detailMsg || axiosErr.message || "Не удалось создать платёж";
      }
      toast.error(msg);
      setPending(null);
    }
    // При успехе не сбрасываем pending — уходим редиректом, кнопка остаётся disabled.
  };

  const topup = detail?.topup;
  const busy = pending !== null;

  return (
    <AnimatePresence>
      {open && detail && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Overlay */}
          <button
            type="button"
            aria-label="Закрыть"
            onClick={busy ? undefined : closePaywall}
            disabled={busy}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Card */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.25, 1, 0.5, 1] }}
            className="relative w-full max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 md:p-7 shadow-2xl"
          >
            <button
              type="button"
              onClick={closePaywall}
              disabled={busy}
              aria-label="Закрыть"
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--fg-subtle)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--fg)] disabled:opacity-40"
            >
              <Icon icon={X} size={16} strokeWidth={2} />
            </button>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] border border-[var(--accent)]/20">
              <Icon icon={Wallet} size={20} strokeWidth={1.75} />
            </div>

            <h2 className="mt-4 font-display text-2xl md:text-3xl leading-[1.05] tracking-[-0.01em] text-[var(--fg)]">
              {title}
            </h2>
            <p className="mt-2.5 text-[14px] leading-[1.55] text-[var(--fg-muted)]">
              {detail.message}
            </p>

            {/* Текущий остаток пользователя — прозрачность перед оплатой. */}
            {user && (
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-[var(--bg-muted)] px-3.5 py-2.5 font-mono text-[12px] tabular text-[var(--fg-muted)]">
                <span>
                  Осталось всего{" "}
                  <span className="font-semibold text-[var(--fg)]">
                    {(user.bonus_minutes ?? 0) +
                      Math.max(0, user.minutes_limit - user.minutes_used) +
                      (user.wallet_minutes ?? 0)}
                  </span>{" "}
                  мин
                </span>
                {(user.wallet_minutes ?? 0) > 0 && (
                  <span>
                    в кошельке{" "}
                    <span className="font-semibold text-[var(--fg)]">{user.wallet_minutes}</span> мин
                  </span>
                )}
              </div>
            )}

            {/* Кейс file_exceeds_balance — баланс + единственная рекомендованная докупка. */}
            {topup && (
              <p className="mt-4 rounded-xl bg-[var(--bg-muted)] px-3.5 py-2.5 font-mono text-[12px] tabular text-[var(--fg-muted)]">
                Файл ~{detail.file_minutes} мин · бесплатно осталось{" "}
                {detail.available_minutes} мин
              </p>
            )}

            <div className="mt-6 space-y-2.5">
              {topup ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    startPayment(
                      topup.pack,
                      () => paymentsApi.topupWallet(topup.pack),
                      { kind: "topup", pack: topup.pack, reason: detail.reason },
                    )
                  }
                  className={cn(
                    "inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-[14px] font-semibold transition-colors duration-base",
                    "bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]",
                    busy && "opacity-60 cursor-wait",
                  )}
                >
                  {pending === topup.pack
                    ? "Перенаправление…"
                    : `Пополнить на ${topup.pack_minutes} мин — ${topup.price_rub} ₽`}
                </button>
              ) : (
                WALLET_PACKS.map((pack) => (
                  <button
                    key={pack.code}
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      startPayment(
                        pack.code,
                        () => paymentsApi.topupWallet(pack.code),
                        { kind: "topup", pack: pack.code, reason: detail.reason },
                      )
                    }
                    className={cn(
                      "inline-flex w-full items-center justify-between gap-2 rounded-full border border-[var(--border-strong)] px-5 py-3 text-[14px] font-semibold text-[var(--fg)] transition-colors duration-base hover:bg-[var(--bg-muted)]",
                      busy && "opacity-60 cursor-wait",
                    )}
                  >
                    <span>{pack.minutes} мин</span>
                    <span className="font-mono tabular text-[var(--fg-muted)]">
                      {pending === pack.code ? "…" : `${pack.price} ₽`}
                    </span>
                  </button>
                ))
              )}

              {/* Вторичный путь — оформить Pro-подписку. */}
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  startPayment(
                    "pro",
                    () => paymentsApi.subscribe("pro"),
                    { kind: "subscribe", plan: "pro", reason: detail.reason },
                  )
                }
                className={cn(
                  "inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-[13px] font-medium text-[var(--fg-muted)] transition-colors duration-base hover:bg-[var(--bg-muted)] hover:text-[var(--fg)]",
                  busy && "opacity-60 cursor-wait",
                )}
              >
                <Icon icon={Sparkles} size={14} strokeWidth={1.75} />
                {pending === "pro" ? "Перенаправление…" : "Оформить Pro — безлимит AI"}
              </button>
            </div>

            <button
              type="button"
              onClick={closePaywall}
              disabled={busy}
              className="mt-4 w-full text-center text-[12px] text-[var(--fg-subtle)] transition-colors hover:text-[var(--fg-muted)] disabled:opacity-40"
            >
              Позже
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
