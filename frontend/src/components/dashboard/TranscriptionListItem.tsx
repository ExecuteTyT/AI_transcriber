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
  { label: string; icon: LucideIcon; ring: string; bg: string; text: string; pulse?: boolean }
> = {
  queued: {
    label: "В очереди",
    icon: Clock,
    ring: "ring-amber-200",
    bg: "bg-amber-50 text-amber-600",
    text: "text-amber-700",
  },
  processing: {
    label: "Обработка",
    icon: Loader2,
    ring: "ring-primary-200",
    bg: "bg-primary-50 text-primary-600",
    text: "text-primary-700",
    pulse: true,
  },
  completed: {
    label: "Готово",
    icon: CheckCircle2,
    ring: "ring-emerald-200",
    bg: "bg-emerald-50 text-emerald-600",
    text: "text-emerald-700",
  },
  failed: {
    label: "Ошибка",
    icon: AlertCircle,
    ring: "ring-rose-200",
    bg: "bg-rose-50 text-rose-600",
    text: "text-rose-700",
  },
};

function MiniWaveform({ seed = 0, active }: { seed?: number; active?: boolean }) {
  const bars = Array.from({ length: 10 }).map((_, i) => {
    const h = 18 + Math.abs(Math.sin((i + 1) * (seed || 0.37))) * 24;
    return { h, delay: i * 40 };
  });
  return (
    <div className="flex items-end gap-[3px] h-6" aria-hidden>
      {bars.map((b, i) => (
        <span
          key={i}
          className={cn(
            "w-[2px] rounded-full transition-all duration-slow",
            active ? "bg-gradient-to-t from-primary-400 to-accent-400" : "bg-primary-200/80"
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.04, 0.3), ease: [0.25, 1, 0.5, 1] }}
      className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-gray-200/60 bg-white transition-all duration-base hover:border-primary-200/70 hover:shadow-raised"
    >
      <Link
        to={`/transcription/${item.id}`}
        className="flex flex-1 items-center gap-3 px-3 py-3 md:gap-4 md:px-4 md:py-3.5 min-w-0"
        aria-label={`${item.title} — ${meta.label}`}
      >
        <div
          className={cn(
            "relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ring-2 ring-offset-2 ring-offset-white",
            meta.ring,
            meta.bg
          )}
        >
          <Icon
            icon={meta.icon}
            size={18}
            strokeWidth={2}
            className={meta.pulse ? "animate-spin" : ""}
          />
          {meta.pulse && (
            <span className="absolute inset-0 rounded-xl bg-primary-400/20 animate-ping" aria-hidden />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-gray-900 group-hover:text-primary-700 transition-colors duration-fast">
            {item.title || "Без названия"}
          </h3>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
            <span className={cn("font-semibold tabular", meta.text)}>{meta.label}</span>
            {formatDuration(item.duration_sec) && (
              <>
                <span className="h-0.5 w-0.5 rounded-full bg-gray-300" />
                <span className="tabular">{formatDuration(item.duration_sec)}</span>
              </>
            )}
            <span className="h-0.5 w-0.5 rounded-full bg-gray-300" />
            <span>{formatDate(item.created_at)}</span>
          </div>
        </div>

        <div className="hidden sm:block flex-shrink-0 pr-1">
          <MiniWaveform seed={(item.id.charCodeAt(0) || 0) / 100} active={isDone} />
        </div>
      </Link>

      <div className="flex-shrink-0 pr-2">
        <IconButton
          aria-label={`Действия: ${item.title}`}
          className="md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
          onClick={() => onAction(item)}
        >
          <Icon icon={MoreVertical} size={18} />
        </IconButton>
      </div>
    </motion.div>
  );
}

export { FileAudio2 };
