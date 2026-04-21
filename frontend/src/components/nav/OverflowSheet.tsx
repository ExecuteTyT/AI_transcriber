import { Link, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { OVERFLOW_ITEMS } from "@/config/navigation";
import { useAuthStore } from "@/store/authStore";
import { useSound } from "@/lib/sound";
import ThemeToggle from "@/components/ui/ThemeToggle";
import SoundToggle from "@/components/ui/SoundToggle";
import MobileSheet from "@/components/ui/MobileSheet";

type OverflowSheetProps = {
  open: boolean;
  onClose: () => void;
};

export default function OverflowSheet({ open, onClose }: OverflowSheetProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { play } = useSound();

  const handleLogout = () => {
    onClose();
    play("soft");
    logout();
    navigate("/login");
  };

  return (
    <MobileSheet open={open} onClose={onClose} title="Ещё">
      <div className="space-y-1">
        {OVERFLOW_ITEMS.map((item) => {
          const Icon = item.Icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => {
                play("focus");
                onClose();
              }}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-[var(--fg)] hover:bg-[var(--bg-muted)] active:bg-[var(--bg-elevated)] transition-colors touch-target"
            >
              <Icon className="w-5 h-5 text-[var(--fg-subtle)]" />
              <span className="text-[15px] font-medium">{item.label}</span>
            </Link>
          );
        })}

        <div className="border-t border-[var(--border)] mt-3 pt-3">
          <div className="flex items-center justify-between px-2 mb-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
              Настройки
            </p>
            <div className="flex items-center gap-1.5">
              <SoundToggle />
              <ThemeToggle />
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-xl bg-[var(--bg-elevated)]">
              <div className="w-9 h-9 rounded-full border border-[var(--border-strong)] bg-[var(--bg)] flex items-center justify-center text-[var(--fg)] text-xs font-medium">
                {(user.name || user.email || "U")[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-[var(--fg)] truncate">{user.name || "Пользователь"}</p>
                <p className="text-[12px] text-[var(--fg-subtle)] truncate">{user.email}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-colors w-full touch-target"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[15px] font-medium">Выйти</span>
          </button>
        </div>
      </div>
    </MobileSheet>
  );
}
