import { motion } from "framer-motion";
import { Send, FileAudio, Sparkles, CreditCard } from "lucide-react";
import { Icon } from "@/components/Icon";
import { reachGoal } from "@/lib/metrika";
import { TELEGRAM_BOT_URL } from "@/config/social";

const POINTS = [
  { icon: FileAudio, text: "Голос, аудио, видео или ссылка — файлы до 2 ГБ" },
  { icon: Sparkles, text: "Саммари, тезисы, задачи и чат по записи" },
  { icon: CreditCard, text: "Баланс общий с сайтом, оплата прямо в чате" },
];

/** Промо-секция Telegram-бота на лендинге. */
export default function TelegramPromoSection() {
  return (
    <section className="py-20 md:py-28 bg-[var(--bg)] border-t border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
          className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] px-6 py-12 md:px-12 md:py-16"
        >
          <div className="flex flex-col gap-10 md:flex-row md:items-center md:justify-between md:gap-12">
            <div className="max-w-[48ch]">
              <p className="eyebrow mb-4 flex items-center gap-2">
                <Icon icon={Send} size={13} strokeWidth={2} className="text-[var(--accent)]" />
                Telegram
              </p>
              <h2 className="font-display text-4xl md:text-6xl leading-[0.95] tracking-[-0.02em] text-[var(--fg)]">
                Расшифровка прямо <em className="italic text-[var(--accent)]">в Telegram</em>
              </h2>
              <p className="mt-5 text-[15px] leading-[1.55] text-[var(--fg-muted)] max-w-[44ch]">
                Пришлите боту запись или ссылку — получите текст и AI-разбор, не выходя
                из мессенджера. Без регистрации на сайте.
              </p>
              <ul className="mt-7 space-y-3">
                {POINTS.map((p) => (
                  <li key={p.text} className="flex items-start gap-3 text-[14px] text-[var(--fg-muted)]">
                    <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)] border border-[var(--accent)]/20">
                      <Icon icon={p.icon} size={14} strokeWidth={1.75} />
                    </span>
                    {p.text}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex-shrink-0">
              <a
                href={TELEGRAM_BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => reachGoal("telegram_bot_click", { source: "landing" })}
                className="btn-accent !py-4 !px-8 !text-[15px] inline-flex items-center gap-2"
              >
                <Icon icon={Send} size={17} strokeWidth={2} />
                Открыть бота <span aria-hidden>→</span>
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
