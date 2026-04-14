import type { LucideIcon, LucideProps } from "lucide-react";
import { cn } from "../lib/cn";

type IconSize = "xs" | "sm" | "md" | "lg" | "xl";

interface IconProps extends Omit<LucideProps, "size"> {
  icon: LucideIcon;
  size?: IconSize | number;
}

const SIZE_MAP: Record<IconSize, number> = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

export function Icon({ icon: LucideComp, size = "md", className, strokeWidth = 1.75, ...rest }: IconProps) {
  const pixelSize = typeof size === "number" ? size : SIZE_MAP[size];
  return <LucideComp size={pixelSize} strokeWidth={strokeWidth} className={cn("shrink-0", className)} {...rest} />;
}
