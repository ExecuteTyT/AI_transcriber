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
      className={cn("relative text-center", compact ? "py-10" : "py-12 md:py-20", className)}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
        <div className="w-48 h-48 md:w-64 md:h-64 bg-primary-500/5 rounded-full blur-3xl" />
      </div>
      <div className="relative">
        <div className="mx-auto mb-6 flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-accent-500 shadow-glow">
          <Icon icon={icon} size={compact ? 26 : 32} strokeWidth={1.75} className="text-white" />
        </div>
        <h3 className="text-lg md:text-xl font-bold tracking-tight text-gray-900 mb-2">{title}</h3>
        {description && (
          <p className="text-gray-500 max-w-md mx-auto leading-relaxed text-[15px]">{description}</p>
        )}
        {action && <div className="mt-6 flex justify-center">{action}</div>}
      </div>
    </motion.div>
  );
}
