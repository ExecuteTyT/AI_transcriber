import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

const navSections = [
  {
    items: [
      {
        to: "/dashboard",
        label: "Транскрипции",
        icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
      },
      {
        to: "/upload",
        label: "Загрузить",
        icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" /></svg>,
      },
    ],
  },
  {
    label: "Аккаунт",
    items: [
      {
        to: "/app/pricing",
        label: "Тарифы",
        icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>,
      },
      {
        to: "/subscription",
        label: "Подписка",
        icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>,
      },
      {
        to: "/profile",
        label: "Профиль",
        icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>,
      },
    ],
  },
];

const planNames: Record<string, string> = { free: "Free", start: "Старт", pro: "Про" };

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

  const isNavActive = (to: string) =>
    to === "/dashboard"
      ? location.pathname === "/dashboard" || location.pathname.startsWith("/transcription/")
      : location.pathname === to;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Navigation */}
      <nav className="flex-1 px-3 pt-4 space-y-6" aria-label="Основная навигация">
        {navSections.map((section, si) => (
          <div key={si}>
            {section.label && (
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isNavActive(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`sidebar-nav-item ${active ? "sidebar-nav-active" : "sidebar-nav-inactive"}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className={active ? "text-primary-400" : ""}>{item.icon}</span>
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
              className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/[0.04] transition-colors duration-200"
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
    </div>
  );

  return (
    <div className="flex min-h-screen bg-surface-50">
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 bg-dark-100/95 backdrop-blur-xl border-b border-white/[0.06]">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
            <span className="text-white font-bold text-[11px]">V</span>
          </div>
          <span className="text-base font-bold text-white tracking-tight">Voitra</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-3 -mr-1 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
        >
          {mobileMenuOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`md:hidden fixed top-14 left-0 bottom-0 z-40 w-[280px] bg-sidebar-gradient border-r border-white/[0.06] shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
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
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main className="flex-1 pt-14 md:pt-0 min-h-screen">
        <div className="p-4 md:p-8 lg:p-10">
          <div className="max-w-5xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
