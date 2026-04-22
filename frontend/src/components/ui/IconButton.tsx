import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

type IconButtonProps = {
  variant?: "ghost" | "solid" | "danger";
  size?: "md" | "lg";
  loading?: boolean;
  "aria-label": string;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

const variantClasses = {
  ghost:
    "text-[var(--fg-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--fg)] active:bg-[var(--bg-muted)]",
  solid:
    "bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] shadow-sm",
  danger: "text-[var(--fg-subtle)] hover:bg-red-500/10 hover:text-red-500 active:bg-red-500/20",
};

const sizeClasses = {
  md: "min-w-[44px] min-h-[44px] p-2.5",
  lg: "min-w-[56px] min-h-[56px] p-3.5",
};

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = "ghost", size = "md", loading, children, className = "", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center rounded-xl transition-all duration-200
          ${sizeClasses[size]} ${variantClasses[variant]}
          disabled:opacity-40 disabled:pointer-events-none
          ${className}`}
        {...props}
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : children}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
export default IconButton;
