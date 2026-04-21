import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, MessageSquareText, Download } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Icon } from "@/components/Icon";
import { fadeUp, springTight } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { useSound } from "@/lib/sound";

interface QuickActionsProps {
  lastTranscriptionId?: string | null;
  canExport?: boolean;
}

type ActionTile = {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent?: boolean;
  disabled?: boolean;
};

export function QuickActions({ lastTranscriptionId, canExport }: QuickActionsProps) {
  const { play } = useSound();

  const tiles: ActionTile[] = [
    {
      to: "/upload",
      title: "Новая запись",
      description: "Загрузить файл или ссылку",
      icon: Upload,
      accent: true,
    },
    {
      to: lastTranscriptionId ? `/transcription/${lastTranscriptionId}` : "/dashboard",
      title: "Чат с записью",
      description: lastTranscriptionId ? "Открыть последнюю" : "Нет готовых записей",
      icon: MessageSquareText,
      disabled: !lastTranscriptionId,
    },
    {
      to: "/dashboard",
      title: "Экспорт",
      description: canExport ? "Из истории транскрипций" : "Скоро",
      icon: Download,
      disabled: !canExport,
    },
  ];

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="-mx-5 md:mx-0 overflow-x-auto scrollbar-hide"
    >
      <div className="flex gap-3 px-5 md:grid md:grid-cols-3 md:gap-4 md:px-0">
        {tiles.map((tile) => {
          const content = (
            <div
              className={cn(
                "relative flex h-full min-w-[200px] flex-col justify-between gap-6 overflow-hidden rounded-2xl p-5 transition-colors duration-base md:min-w-0",
                tile.accent
                  ? "bg-acid-300 text-ink-900 hover:bg-acid-200"
                  : "bg-[var(--bg-elevated)] text-[var(--fg)] border border-[var(--border)] hover:border-[var(--border-strong)]",
                tile.disabled && "opacity-50 pointer-events-none"
              )}
            >
              <div className="flex items-start justify-between">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl",
                    tile.accent
                      ? "bg-ink-900/15 text-ink-900"
                      : "bg-acid-300/10 text-acid-300 border border-acid-300/20"
                  )}
                  aria-hidden
                >
                  <Icon icon={tile.icon} size={18} strokeWidth={1.75} />
                </span>
                <span
                  className={cn(
                    "font-mono text-[10px] uppercase tracking-[0.2em]",
                    tile.accent ? "text-ink-900/65" : "text-[var(--fg-subtle)]"
                  )}
                >
                  {tile.accent ? "primary" : tile.disabled ? "locked" : "action"}
                </span>
              </div>
              <div>
                <p className="font-display text-2xl leading-tight tracking-[-0.01em]">
                  {tile.title}
                </p>
                <p
                  className={cn(
                    "mt-1 text-[13px]",
                    tile.accent ? "text-ink-900/75" : "text-[var(--fg-muted)]"
                  )}
                >
                  {tile.description}
                </p>
              </div>
            </div>
          );
          return (
            <motion.div
              key={tile.title}
              whileTap={{ scale: 0.98 }}
              transition={springTight}
              className="snap-start"
            >
              {tile.disabled ? (
                <div aria-disabled>{content}</div>
              ) : (
                <Link
                  to={tile.to}
                  onClick={() => play("tick")}
                  aria-label={tile.title}
                  className="block h-full"
                >
                  {content}
                </Link>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
