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
  ghost: "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 active:bg-gray-200/60",
  solid: "bg-primary-600 text-white hover:bg-primary-500 active:bg-primary-700 shadow-sm",
  danger: "text-gray-500 hover:bg-red-50 hover:text-red-600 active:bg-red-100",
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
