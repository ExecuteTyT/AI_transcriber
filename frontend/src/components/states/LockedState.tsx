import { Link } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/cn";

interface LockedStateProps {
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaTo?: string;
  className?: string;
}

export function LockedState({
  title,
  description,
  ctaLabel = "Открыть в Про",
  ctaTo = "/app/pricing",
  className,
}: LockedStateProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary-100/70 bg-white p-6 text-center",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-50/60 via-white to-accent-50/40" aria-hidden />
      <div className="relative">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-card ring-1 ring-primary-100">
          <Icon icon={Lock} size={20} className="text-primary-500" />
        </div>
        <h3 className="text-lg font-bold tracking-tight text-gray-900">{title}</h3>
        {description && <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">{description}</p>}
        <Link
          to={ctaTo}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary-600 to-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-glow-sm hover:shadow-glow transition-shadow duration-base press"
        >
          <Icon icon={Sparkles} size={14} strokeWidth={2.25} />
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
