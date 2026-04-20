import { Volume2, VolumeX } from "lucide-react";
import { useSound } from "@/lib/sound";
import { Icon } from "@/components/Icon";

interface Props {
  className?: string;
}

export default function SoundToggle({ className = "" }: Props) {
  const { enabled, toggle, play } = useSound();

  const handle = () => {
    // Цик играем до toggle, чтобы пользователь услышал эффект "off" перед отключением.
    if (enabled) play("soft");
    toggle();
    if (!enabled) {
      // Маленькая задержка после toggle чтобы state обновился и play сработал.
      setTimeout(() => play("confirm"), 20);
    }
  };

  return (
    <button
      type="button"
      onClick={handle}
      aria-label={enabled ? "Выключить звуки интерфейса" : "Включить звуки интерфейса"}
      aria-pressed={enabled}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-strong)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-muted)] transition-colors duration-200 ${className}`}
    >
      <Icon icon={enabled ? Volume2 : VolumeX} size={16} />
    </button>
  );
}
