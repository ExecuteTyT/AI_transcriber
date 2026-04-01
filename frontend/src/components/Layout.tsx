import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

const navItems = [
  {
    to: "/dashboard",
    label: "Транскрипции",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    to: "/upload",
    label: "Загрузить",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
      </svg>
    ),
  },
  { divider: true },
  {
    to: "/pricing",
    label: "Тарифы",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
      </svg>
    ),
  },
  {
    to: "/subscription",
    label: "Подписка",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
  },
  {
    to: "/profile",
    label: "Профиль",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
] as const;

type NavItem = { to: string; label: string; icon: JSX.Element; divider?: never } | { divider: true; to?: never; label?: never; icon?: never };

const planNames: Record<string, string> = { free: "Free", start: "Старт", pro: "Про" };
const planColors: Record<string, string> = {
  free: "bg-gray-100 text-gray-600",
  start: "bg-primary-50 text-primary-700",
  pro: "bg-gradient-to-r from-primary-500 to-accent-500 text-white",
};

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    if (!confirm("Выйти из аккаунта?")) return;
    logout();
    navigate("/login");
  };

  const usagePercent = user ? Math.min(100, Math.round((user.minutes_used / user.minutes_limit) * 100)) : 0;
  const minutesLeft = user ? Math.max(0, user.minutes_limit - user.minutes_used) : 0;

  const sidebarContent = (
    <>
      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5" aria-label="Основная навигация">
        {(navItems as readonly NavItem[]).map((item, i) => {
          if (item.divider) {
            return <div key={`div-${i}`} className="h-px bg-gray-100 my-3 mx-2" />;
          }
          const isActive = item.to === "/dashboard"
            ? location.pathname === "/dashboard" || location.pathname.startsWith("/transcription/")
            : location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20"
                  : "text-gray-500 hover:bg-surface-100 hover:text-gray-900"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className={`transition-colors duration-200 ${isActive ? "text-white/90" : "text-gray-400 group-hover:text-gray-600"}`}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User panel */}
      {user && (
        <div className="mx-3 mb-3">
          {/* Usage card */}
          <div className="p-3.5 rounded-2xl bg-surface-50 border border-gray-100 mb-2">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Лимит</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${planColors[user.plan] || planColors.free}`}>
                {planNames[user.plan] || user.plan}
              </span>
            </div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-lg font-bold text-gray-900">{minutesLeft}</span>
              <span className="text-xs text-gray-400">мин осталось</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5" role="progressbar" aria-valuenow={usagePercent} aria-valuemin={0} aria-valuemax={100}>
              <div
                className={`h-1.5 rounded-full transition-all duration-700 ease-out ${
                  usagePercent >= 90 ? "bg-red-500" : usagePercent >= 70 ? "bg-amber-500" : "bg-gradient-to-r from-primary-500 to-primary-400"
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>

          {/* User info */}
          <div className="flex items-center gap-3 px-2 py-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm">
              {(user.name || user.email || "U")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.name || "Пользователь"}</p>
              <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
              aria-label="Выйти"
              title="Выйти"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen bg-surface-50">
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-200/40 h-14 flex items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-xs">V</span>
          </div>
          <span className="text-lg font-extrabold text-gray-900 tracking-tight">Voitra</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-3 -mr-1 rounded-xl hover:bg-surface-100 transition-colors"
          aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
        >
          {mobileMenuOpen ? (
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`md:hidden fixed top-14 left-0 bottom-0 z-40 w-[280px] bg-white/95 backdrop-blur-xl border-r border-gray-100 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[240px] bg-white/80 backdrop-blur-xl border-r border-gray-100 flex-col flex-shrink-0 sticky top-0 h-screen">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-gray-100">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <Link to="/" className="text-lg font-extrabold text-gray-900 tracking-tight">Voitra</Link>
        </div>
        {sidebarContent}
      </aside>

      {/* Main */}
      <main className="flex-1 pt-14 md:pt-0 min-h-screen">
        <div className="p-4 md:p-8 lg:p-10">
          <div className="max-w-5xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
