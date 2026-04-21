import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Sparkles } from "lucide-react";
import { DESKTOP_SECTIONS } from "@/config/navigation";
import { useAuthStore } from "@/store/authStore";
import { Icon } from "@/components/Icon";

const planNames: Record<string, string> = { free: "Free", start: "Старт", pro: "Про" };

export default function DesktopSidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    if (!confirm("Выйти из аккаунта?")) return;
    logout();
    navigate("/login");
  };

  const isNavActive = (item: (typeof DESKTOP_SECTIONS)[number]["items"][number]) => {
    if ("match" in item && item.match) return item.match(location.pathname);
    return location.pathname === item.to;
  };

  // Всего доступно = bonus_minutes + остаток месячного лимита.
  // Для Free-юзера minutes_limit = 0, но bonus_minutes = 180 до первой транскрипции —
  // показывать "0 из 0" было бы ложью.
  const bonusMinutes = user?.bonus_minutes ?? 0;
  const monthlyRemaining = user ? Math.max(0, user.minutes_limit - user.minutes_used) : 0;
  const totalAvailable = bonusMinutes + monthlyRemaining;
  const totalCapacity = bonusMinutes + (user?.minutes_limit ?? 0);
  const usagePercent = totalCapacity > 0
    ? Math.min(100, Math.round(((totalCapacity - totalAvailable) / totalCapacity) * 100))
    : 0;
  const minutesLeft = totalAvailable;
  const lowUsage = totalAvailable <= Math.max(10, Math.round(totalCapacity * 0.2));

  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (usagePercent / 100) * circumference;

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-[240px] bg-sidebar-gradient flex-col border-r border-white/[0.04]">
      <div className="h-16 flex items-center gap-2.5 px-5">
        <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 via-primary-500 to-accent-500 flex items-center justify-center shadow-glow-sm">
          <span className="text-white font-bold text-[13px]">S</span>
          <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/15" />
        </div>
        <Link to="/" className="text-lg font-bold text-white tracking-tight">
          Dicto
        </Link>
      </div>

      <nav className="flex-1 px-3 pt-3 space-y-5 overflow-y-auto scrollbar-hide" aria-label="Основная навигация">
        {DESKTOP_SECTIONS.map((section, si) => (
          <div key={si}>
            {section.label && (
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500/80">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isNavActive(item);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`sidebar-nav-item ${active ? "sidebar-nav-active" : "sidebar-nav-inactive"}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon
                      icon={item.Icon}
                      size={18}
                      className={active ? "text-primary-300" : ""}
                    />
                    {item.label}
                    {active && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400 animate-glow-pulse" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {user && (
        <div className="px-3 pb-4 space-y-3">
          <div className="relative overflow-hidden rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3">
            <div className="flex items-center gap-3">
              <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0 -rotate-90">
                <defs>
                  <linearGradient id="usageGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                </defs>
                <circle cx="32" cy="32" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  fill="none"
                  stroke={lowUsage ? "#f87171" : "url(#usageGradient)"}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  className="transition-all duration-slow ease-out-quart"
                />
              </svg>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Осталось</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-primary-500/20 text-primary-300">
                    {planNames[user.plan] || user.plan}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-bold text-white tabular">{minutesLeft}</span>
                  <span className="text-[11px] text-gray-500">
                    из {totalCapacity} мин{bonusMinutes > 0 && user.minutes_limit === 0 ? " (бонус)" : ""}
                  </span>
                </div>
                {lowUsage && (
                  <Link
                    to="/app/pricing"
                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-accent-400 hover:text-accent-300 transition-colors"
                  >
                    <Icon icon={Sparkles} size={12} />
                    Добавь минуты
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-glow-sm">
              {(user.name || user.email || "U")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-gray-200 truncate">{user.name || "Пользователь"}</p>
              <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/[0.04] transition-colors duration-base"
              aria-label="Выйти"
              title="Выйти"
            >
              <Icon icon={LogOut} size={16} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
