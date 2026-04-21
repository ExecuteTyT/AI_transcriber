import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileAudio2,
  Loader2,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import { Icon } from "@/components/Icon";
import type { TranscriptionListItem as TItem } from "@/api/transcriptions";
import { cn } from "@/lib/cn";

const STATUS_META: Record<
  string,
  { label: string; icon: LucideIcon; color: string; pulse?: boolean }
> = {
  queued: {
    label: "В очереди",
    icon: Clock,
    color: "text-amber-400",
  },
  processing: {
    label: "Обработка",
    icon: Loader2,
    color: "text-acid-300",
    pulse: true,
  },
  completed: {
    label: "Готово",
    icon: CheckCircle2,
    color: "text-acid-300",
  },
  failed: {
    label: "Ошибка",
    icon: AlertCircle,
    color: "text-red-400",
  },
};

function MiniWaveform({ seed = 0, active }: { seed?: number; active?: boolean }) {
  const bars = Array.from({ length: 12 }).map((_, i) => {
    const h = 20 + Math.abs(Math.sin((i + 1) * (seed || 0.37))) * 28;
    return { h };
  });
  return (
    <div className="flex items-end gap-[2px] h-5" aria-hidden>
      {bars.map((b, i) => (
        <span
          key={i}
          className={cn(
            "w-[2px] rounded-full transition-colors duration-slow",
            active ? "bg-acid-300/80" : "bg-[var(--fg-subtle)]/40"
          )}
          style={{ height: `${b.h}%` }}
        />
      ))}
    </div>
  );
}

interface Props {
  item: TItem;
  index: number;
  formatDuration: (sec: number | null) => string;
  formatDate: (d: string) => string;
  onAction: (item: TItem) => void;
}

export function TranscriptionRow({ item, index, formatDuration, formatDate, onAction }: Props) {
  const meta = STATUS_META[item.status] ?? STATUS_META.queued;
  const isDone = item.status === "completed";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, delay: Math.min(index * 0.03, 0.2), ease: [0.25, 1, 0.5, 1] }}
      className="group relative flex items-center border-b border-[var(--border)] transition-colors hover:bg-[var(--bg-elevated)]"
    >
      <Link
        to={`/transcription/${item.id}`}
        className="flex flex-1 items-center gap-4 px-1 py-4 md:px-2 md:py-5 min-w-0"
        aria-label={`${item.title} — ${meta.label}`}
      >
        {/* Status icon */}
        <div
          className={cn(
            "relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]",
            meta.color
          )}
        >
          <Icon
            icon={meta.icon}
            size={16}
            strokeWidth={1.75}
            className={meta.pulse ? "animate-spin" : ""}
          />
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <h3 className="truncate font-display text-lg leading-tight text-[var(--fg)] group-hover:text-acid-300 transition-colors">
            {item.title || "Без названия"}
          </h3>
          <div className="mt-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--fg-subtle)]">
            <span className={meta.color}>{meta.label}</span>
            {formatDuration(item.duration_sec) && (
              <>
                <span aria-hidden>·</span>
                <span>{formatDuration(item.duration_sec)}</span>
              </>
            )}
            <span aria-hidden>·</span>
            <span>{formatDate(item.created_at)}</span>
          </div>
        </div>

        {/* Waveform */}
        <div className="hidden sm:block flex-shrink-0 w-[80px] pr-2">
          <MiniWaveform seed={(item.id.charCodeAt(0) || 0) / 100} active={isDone} />
        </div>
      </Link>

      {/* Actions */}
      <div className="flex-shrink-0 pr-2">
        <IconButton
          aria-label={`Действия: ${item.title}`}
          className="md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
          onClick={() => onAction(item)}
        >
          <Icon icon={MoreVertical} size={16} strokeWidth={1.75} className="text-[var(--fg-muted)]" />
        </IconButton>
      </div>
    </motion.div>
  );
}

export { FileAudio2 };
