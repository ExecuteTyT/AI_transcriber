import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useSound } from "@/lib/sound";
import { Icon } from "@/components/Icon";

interface Props {
  className?: string;
}

export default function ThemeToggle({ className = "" }: Props) {
  const { theme, toggle } = useTheme();
  const { play } = useSound();

  const handle = () => {
    play("soft");
    toggle();
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={handle}
      aria-label={isDark ? "Переключить на светлую тему" : "Переключить на тёмную тему"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-strong)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-muted)] transition-colors duration-200 ${className}`}
    >
      <Icon icon={isDark ? Sun : Moon} size={16} />
    </button>
  );
}
