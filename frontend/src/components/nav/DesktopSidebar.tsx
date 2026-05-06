import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { DESKTOP_SECTIONS } from "@/config/navigation";
import { useAuthStore } from "@/store/authStore";
import { Icon } from "@/components/Icon";
import ThemeToggle from "@/components/ui/ThemeToggle";
import SoundToggle from "@/components/ui/SoundToggle";
import { useSound } from "@/lib/sound";

const planNames: Record<string, string> = {
  free: "Free",
  start: "Старт",
  meet_solo: "Митинги",
  pro: "Про",
  expert: "Эксперт",
  business: "Бизнес",
  premium: "Премиум",
};

export default function DesktopSidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { play } = useSound();

  const handleLogout = () => {
    if (!confirm("Выйти из аккаунта?")) return;
    play("soft");
    logout();
    navigate("/login");
  };

  const isNavActive = (item: (typeof DESKTOP_SECTIONS)[number]["items"][number]) => {
    if ("match" in item && item.match) return item.match(location.pathname);
    return location.pathname === item.to;
  };

  // Остаток = bonus + (лимит − использовано). Для Free: лимит 0, весь ресурс в bonus.
  const bonusMinutes = user?.bonus_minutes ?? 0;
  const monthlyRemaining = user ? Math.max(0, user.minutes_limit - user.minutes_used) : 0;
  const totalAvailable = bonusMinutes + monthlyRemaining;
  const totalCapacity = bonusMinutes + (user?.minutes_limit ?? 0);
  const usagePercent = totalCapacity > 0
    ? Math.min(100, Math.round(((totalCapacity - totalAvailable) / totalCapacity) * 100))
    : 0;
  const lowUsage = totalAvailable <= Math.max(10, Math.round(totalCapacity * 0.2));
  const isBonusOnly = user?.minutes_limit === 0 && bonusMinutes > 0;

  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (usagePercent / 100) * circumference;

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-[260px] bg-[var(--bg)] flex-col border-r border-[var(--border)]">
      {/* ── Header: logo ── */}
      <div className="h-16 flex items-center gap-2 px-5 border-b border-[var(--border)]">
        <Link to="/" className="flex items-center gap-2 font-display text-2xl tracking-[-0.015em] text-[var(--fg)] leading-none">
          <span
            className="block w-1.5 h-1.5 rounded-full"
            style={{
              background: "var(--accent)",
              boxShadow: "0 0 12px color-mix(in srgb, var(--accent) 55%, transparent)",
            }}
            aria-hidden
          />
          Dicto
        </Link>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide py-6" aria-label="Основная навигация">
        {DESKTOP_SECTIONS.map((section, si) => (
          <div key={si} className={si > 0 ? "mt-8" : ""}>
            {section.label && (
              <p className="px-6 mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
                /{section.label.toLowerCase()}
              </p>
            )}
            <div>
              {section.items.map((item) => {
                const active = isNavActive(item);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => play("focus")}
                    className={`group flex items-center gap-3 px-6 py-2.5 text-[14px] transition-colors ${
                      active
                        ? "text-[var(--fg)] bg-[var(--bg-elevated)]"
                        : "text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-elevated)]/60"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    {active && (
                      <span
                        className="absolute left-0 h-5 w-[2px]"
                        style={{
                          background: "var(--accent)",
                          boxShadow: "0 0 8px color-mix(in srgb, var(--accent) 65%, transparent)",
                        }}
                        aria-hidden
                      />
                    )}
                    <Icon icon={item.Icon} size={17} strokeWidth={1.75} className={active ? "text-[var(--accent)]" : "text-[var(--fg-subtle)] group-hover:text-[var(--fg-muted)]"} />
                    <span className={active ? "font-medium" : ""}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Usage card ── */}
      {user && (
        <div className="px-4 pb-3">
          <Link
            to="/app/pricing"
            onClick={() => play("tick")}
            className="block rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-4 hover:border-[var(--accent)]/40 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
                  <circle
                    cx="28"
                    cy="28"
                    r={radius}
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r={radius}
                    fill="none"
                    stroke={lowUsage ? "#e11d48" : "var(--accent)"}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-[stroke-dashoffset] duration-slow"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-sans font-semibold text-sm leading-none text-[var(--fg)] tabular">
                    {totalAvailable}
                  </span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--fg-subtle)] mb-1">
                  {planNames[user.plan] || user.plan} · {isBonusOnly ? "бонус" : "план"}
                </p>
                <p className="text-[13px] text-[var(--fg)] leading-tight">
                  {totalAvailable} из {totalCapacity}&nbsp;мин
                </p>
                <p className={`mt-1 text-[11px] ${lowUsage ? "text-red-400" : "text-[var(--fg-subtle)]"} group-hover:text-[var(--accent)] transition-colors`}>
                  {lowUsage ? "Пополнить →" : "Посмотреть тарифы →"}
                </p>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* ── Bottom: user + controls ── */}
      {user && (
        <div className="border-t border-[var(--border)] px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-strong)] flex items-center justify-center text-[var(--fg)] text-xs font-medium flex-shrink-0">
              {(user.name || user.email || "U")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-[var(--fg)] truncate leading-tight">
                {user.name || "Пользователь"}
              </p>
              <p className="text-[11px] text-[var(--fg-subtle)] truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <SoundToggle />
            <ThemeToggle />
            <button
              type="button"
              onClick={handleLogout}
              className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-strong)] text-[var(--fg-subtle)] hover:text-red-400 hover:border-red-400/40 transition-colors"
              aria-label="Выйти"
              title="Выйти"
            >
              <Icon icon={LogOut} size={14} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
