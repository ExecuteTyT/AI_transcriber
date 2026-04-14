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
        "rounded-2xl border border-red-100 bg-red-50/60 p-5 flex items-start gap-3",
        className
      )}
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
        <Icon icon={AlertTriangle} size={18} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-[15px] font-semibold text-red-900">{title}</h4>
        {description && <p className="mt-0.5 text-sm text-red-700/80">{description}</p>}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500 active:bg-red-700 transition-colors duration-fast press"
          >
            Повторить
          </button>
        )}
      </div>
    </div>
  );
}
