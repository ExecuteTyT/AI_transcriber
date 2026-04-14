import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, MessageSquareText, Download, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Icon } from "@/components/Icon";
import { fadeUp, springTight } from "@/lib/motion";
import { cn } from "@/lib/cn";

interface QuickActionsProps {
  lastTranscriptionId?: string | null;
  canExport?: boolean;
}

type ActionTile = {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: "primary" | "accent" | "neutral";
  disabled?: boolean;
};

const TONES: Record<ActionTile["tone"], string> = {
  primary:
    "from-primary-500 via-primary-600 to-primary-700 text-white shadow-glow-sm hover:shadow-glow",
  accent:
    "from-accent-500 to-accent-600 text-white shadow-glow-accent",
  neutral: "from-white to-surface-50 text-gray-900 border border-gray-200/70 shadow-card",
};

export function QuickActions({ lastTranscriptionId, canExport }: QuickActionsProps) {
  const tiles: ActionTile[] = [
    {
      to: "/upload",
      title: "Новая запись",
      description: "Загрузить файл",
      icon: Upload,
      tone: "primary",
    },
    {
      to: lastTranscriptionId ? `/transcription/${lastTranscriptionId}` : "/dashboard",
      title: "Чат с записью",
      description: lastTranscriptionId ? "Открыть последнюю" : "Нет записей",
      icon: MessageSquareText,
      tone: "accent",
      disabled: !lastTranscriptionId,
    },
    {
      to: "/dashboard",
      title: "Экспорт",
      description: canExport ? "Из истории" : "Скоро",
      icon: Download,
      tone: "neutral",
      disabled: !canExport,
    },
  ];

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="-mx-4 md:mx-0 overflow-x-auto scrollbar-hide"
    >
      <div className="flex gap-2.5 px-4 md:grid md:grid-cols-3 md:gap-3 md:px-0">
        {tiles.map((tile) => {
          const content = (
            <div
              className={cn(
                "relative flex min-w-[180px] flex-col gap-3 overflow-hidden rounded-2xl bg-gradient-to-br p-4 transition-shadow duration-base md:min-w-0",
                TONES[tile.tone],
                tile.disabled && "opacity-60 pointer-events-none"
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  tile.tone === "neutral"
                    ? "bg-primary-50 text-primary-600"
                    : "bg-white/15 text-white backdrop-blur"
                )}
                aria-hidden
              >
                <Icon icon={tile.icon} size={20} strokeWidth={2} />
              </span>
              <div>
                <p className="text-[15px] font-bold leading-tight">{tile.title}</p>
                <p
                  className={cn(
                    "mt-0.5 text-[12px] font-medium",
                    tile.tone === "neutral" ? "text-gray-500" : "text-white/85"
                  )}
                >
                  {tile.description}
                </p>
              </div>
              <Icon
                icon={ChevronRight}
                size={16}
                className={cn(
                  "absolute right-3 top-3",
                  tile.tone === "neutral" ? "text-gray-300" : "text-white/70"
                )}
              />
            </div>
          );
          return (
            <motion.div key={tile.title} whileTap={{ scale: 0.97 }} transition={springTight}>
              {tile.disabled ? (
                <div aria-disabled>{content}</div>
              ) : (
                <Link to={tile.to} aria-label={tile.title}>
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
