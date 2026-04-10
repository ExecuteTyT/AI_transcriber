type SkeletonProps = {
  variant?: "text" | "rect" | "circle";
  width?: string;
  height?: string;
  className?: string;
};

export default function Skeleton({ variant = "text", width, height, className = "" }: SkeletonProps) {
  const base = "animate-pulse bg-gray-200/70";

  const variantClasses = {
    text: "h-4 rounded-md",
    rect: "rounded-xl",
    circle: "rounded-full",
  };

  return (
    <div
      className={`${base} ${variantClasses[variant]} ${className}`}
      style={{ width, height }}
    />
  );
}
