import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

const navItems = [
  { to: "/dashboard", label: "Мои транскрипции" },
  { to: "/upload", label: "Загрузить файл" },
  { to: "/pricing", label: "Тарифы" },
  { to: "/subscription", label: "Подписка" },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col">
        <Link to="/" className="text-xl font-bold text-primary-600 mb-8 block">
          AI Voice
        </Link>
        <nav className="flex flex-col gap-1 flex-1" aria-label="Основная навигация">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`px-3 py-2 rounded-lg transition ${
                  isActive
                    ? "bg-primary-50 text-primary-700 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        {user && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <p className="text-sm text-gray-600">{user.email}</p>
            <p className="text-xs text-gray-400 mb-2">
              {user.plan === "free" ? "Free" : user.plan === "start" ? "Старт" : "Про"} | {user.minutes_used}/{user.minutes_limit} мин
            </p>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
              <div
                className="bg-primary-500 h-1.5 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, Math.round((user.minutes_used / user.minutes_limit) * 100))}%`,
                }}
              />
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-red-500 hover:text-red-700"
            >
              Выйти
            </button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 bg-gray-50 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
