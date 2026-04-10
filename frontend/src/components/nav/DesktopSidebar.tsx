import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { DESKTOP_SECTIONS } from "@/config/navigation";
import { useAuthStore } from "@/store/authStore";

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

  const usagePercent = user ? Math.min(100, Math.round((user.minutes_used / user.minutes_limit) * 100)) : 0;
  const minutesLeft = user ? Math.max(0, user.minutes_limit - user.minutes_used) : 0;

  return (
    <aside className="hidden md:flex w-[248px] bg-sidebar-gradient flex-col flex-shrink-0 sticky top-0 h-screen border-r border-white/[0.04]">
      {/* Logo */}
      <div className="h-16 flex items-center gap-2.5 px-5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-glow-sm">
          <span className="text-white font-bold text-sm">V</span>
        </div>
        <Link to="/" className="text-lg font-bold text-white tracking-tight">
          Voitra
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-4 space-y-6" aria-label="Основная навигация">
        {DESKTOP_SECTIONS.map((section, si) => (
          <div key={si}>
            {section.label && (
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isNavActive(item);
                const Icon = item.Icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`sidebar-nav-item ${active ? "sidebar-nav-active" : "sidebar-nav-inactive"}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className={`w-[18px] h-[18px] ${active ? "text-primary-400" : ""}`} />
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

      {/* Bottom panel */}
      {user && (
        <div className="px-3 pb-4 space-y-3">
          {/* Usage */}
          <div className="px-3 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Лимит</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary-500/20 text-primary-300">
                {planNames[user.plan] || user.plan}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mb-2.5">
              <span className="text-xl font-bold text-white tabular-nums">{minutesLeft}</span>
              <span className="text-[11px] text-gray-500">мин</span>
            </div>
            <div className="w-full bg-white/[0.06] rounded-full h-1">
              <div
                className={`h-1 rounded-full transition-all duration-700 ease-out ${
                  usagePercent >= 90
                    ? "bg-red-400"
                    : usagePercent >= 70
                    ? "bg-amber-400"
                    : "bg-gradient-to-r from-primary-400 to-primary-300"
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>

          {/* User */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {(user.name || user.email || "U")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-gray-200 truncate">{user.name || "Пользователь"}</p>
              <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/[0.04] transition-colors duration-200"
              aria-label="Выйти"
              title="Выйти"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
