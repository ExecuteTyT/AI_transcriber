import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

const navItems = [
  {
    to: "/dashboard",
    label: "Транскрипции",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    to: "/upload",
    label: "Загрузить",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
      </svg>
    ),
  },
  {
    to: "/pricing",
    label: "Тарифы",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
      </svg>
    ),
  },
  {
    to: "/subscription",
    label: "Подписка",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
  },
  {
    to: "/profile",
    label: "Профиль",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
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

  const sidebarContent = (
    <>
      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Основная навигация">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-primary-50 text-primary-700 font-semibold glow-ring"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className={isActive ? "text-primary-600" : "text-gray-400"}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User panel */}
      {user && (
        <div className="p-4 m-3 rounded-2xl bg-gray-50 border border-gray-200/60">
          {/* Usage */}
          <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
            <span>{user.minutes_used} / {user.minutes_limit} мин</span>
            <span className="badge bg-primary-50 text-primary-700 !text-[10px] !px-2 !py-0.5">
              {planNames[user.plan] || user.plan}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4" role="progressbar" aria-valuenow={usagePercent} aria-valuemin={0} aria-valuemax={100} aria-label="Использование лимита">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                usagePercent >= 90 ? "bg-red-500" : usagePercent >= 70 ? "bg-amber-500" : "bg-primary-500"
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>

          {/* User info */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ring-2 ring-primary-200">
              {(user.name || user.email || "U")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name || "Пользователь"}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="mt-3 w-full text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 py-2 rounded-xl transition-all duration-200"
          >
            Выйти
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen bg-surface-50">
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-200/60 h-14 shadow-sm flex items-center justify-between px-4">
        <Link to="/" className="text-lg font-extrabold text-gray-900 tracking-tight">Voitra</Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2.5 rounded-lg hover:bg-surface-100 transition"
          aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
        >
          {mobileMenuOpen ? (
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`md:hidden fixed top-14 left-0 bottom-0 z-40 w-[280px] bg-white border-r border-gray-200/60 shadow-xl flex flex-col transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[260px] bg-white border-r border-gray-200/60 flex-col flex-shrink-0">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200/60">
          <Link to="/" className="text-xl font-extrabold text-gray-900 tracking-tight">Voitra</Link>
        </div>
        {sidebarContent}
      </aside>

      {/* Main */}
      <main className="flex-1 pt-14 md:pt-8 p-4 md:px-8 md:pb-8 overflow-auto">
        <div className="max-w-5xl mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
