import Skeleton from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

interface LoadingRowsProps {
  count?: number;
  className?: string;
}

export function LoadingRows({ count = 3, className }: LoadingRowsProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3.5"
          aria-hidden
        >
          <Skeleton variant="rect" className="h-11 w-11 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton width="62%" />
            <Skeleton width="30%" className="h-3" />
          </div>
          <Skeleton variant="rect" className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
