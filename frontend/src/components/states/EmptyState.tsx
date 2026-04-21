import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/Icon";
import { fadeUp } from "@/lib/motion";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className={cn(
        "relative text-center rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)]",
        compact ? "py-10 px-6" : "py-16 md:py-20 px-8",
        className
      )}
    >
      <div className="relative">
        <div className="mx-auto mb-6 flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-2xl border border-acid-300/25 bg-acid-300/10">
          <Icon icon={icon} size={compact ? 22 : 26} strokeWidth={1.75} className="text-acid-300" />
        </div>
        <h3 className="font-display text-2xl md:text-3xl leading-tight tracking-[-0.01em] text-[var(--fg)] mb-3">
          {title}
        </h3>
        {description && (
          <p className="text-[14px] md:text-[15px] text-[var(--fg-muted)] max-w-md mx-auto leading-[1.55]">
            {description}
          </p>
        )}
        {action && <div className="mt-7 flex justify-center">{action}</div>}
      </div>
    </motion.div>
  );
}
