import { AlertTriangle } from "lucide-react";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/cn";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title = "Что-то пошло не так", description, onRetry, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-2xl border border-red-500/25 bg-red-500/10 p-5 flex items-start gap-3",
        className
      )}
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-400 border border-red-500/25">
        <Icon icon={AlertTriangle} size={17} strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-display text-lg leading-tight text-[var(--fg)]">{title}</h4>
        {description && <p className="mt-1 text-[13px] text-[var(--fg-muted)] leading-[1.5]">{description}</p>}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-500/90 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-red-500 transition-colors"
          >
            Повторить
          </button>
        )}
      </div>
    </div>
  );
}
