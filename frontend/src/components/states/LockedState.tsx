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
        "relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 text-center",
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at top, color-mix(in srgb, var(--accent) 12%, transparent), transparent 70%)",
        }}
        aria-hidden
      />
      <div className="relative">
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl shadow-card ring-1"
          style={{
            background: "var(--bg-muted)",
            boxShadow: "0 0 0 1px var(--border)",
            color: "var(--accent)",
          }}
        >
          <Icon icon={Lock} size={20} />
        </div>
        <h3 className="text-lg font-bold tracking-tight text-[var(--fg)]">{title}</h3>
        {description && <p className="mt-1 text-sm text-[var(--fg-muted)] max-w-sm mx-auto">{description}</p>}
        <Link
          to={ctaTo}
          className="btn-accent mt-4 !py-2.5 !px-4 !text-sm inline-flex items-center gap-1.5"
        >
          <Icon icon={Sparkles} size={14} strokeWidth={2.25} />
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
