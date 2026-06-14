import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { Icon } from "@/components/Icon";

const SEEN_KEY = "proba_notice_v1";

/**
 * Одноразовое уведомление для уже зарегистрированных free-юзеров о смене
 * бесплатного тарифа (проба: 30 мин + 1 AI-разбор; чат/доп. разборы — платно).
 * Показывается один раз на браузер (localStorage), только на free-плане.
 * Накопленные минуты старых юзеров сохранены — об этом и сообщаем.
 */
export function ProbaNotice({ plan }: { plan?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (plan === "free" && !localStorage.getItem(SEEN_KEY)) {
      setOpen(true);
    }
  }, [plan]);

  const dismiss = () => {
    localStorage.setItem(SEEN_KEY, "1");
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md rounded-t-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 md:rounded-2xl"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={dismiss}
              className="absolute right-4 top-4 text-[var(--fg-subtle)] hover:text-[var(--fg)] transition-colors"
              aria-label="Закрыть"
            >
              <Icon icon={X} size={18} />
            </button>

            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-[var(--border-strong)] bg-[var(--bg-muted)]">
              <Icon icon={Sparkles} size={18} className="text-[var(--accent)]" />
            </span>

            <h2 className="mt-4 font-display text-xl text-[var(--fg)]">
              Мы обновили бесплатный тариф
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--fg-muted)]">
              Теперь бесплатная проба — это <strong className="text-[var(--fg)]">30 минут
              расшифровки и 1 AI-разбор</strong>. Больше разборов и чат по записи —
              на Pro или с кошелька (разовое пополнение, без подписки).
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--fg-muted)]">
              Ваши накопленные минуты сохранены — мы их не обнуляли.
            </p>

            <div className="mt-5 flex flex-col gap-2">
              <Link
                to="/pricing"
                onClick={dismiss}
                className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-4 py-2.5 text-[14px] font-semibold text-[var(--accent-fg)] transition-colors hover:bg-[var(--accent-hover)]"
              >
                Посмотреть тарифы и кошелёк
              </Link>
              <button
                type="button"
                onClick={dismiss}
                className="inline-flex items-center justify-center rounded-full px-4 py-2 text-[13px] text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
              >
                Понятно
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
