import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col">
        <h1 className="text-xl font-bold text-primary-600 mb-8">AI Voice</h1>
        <nav className="flex flex-col gap-1 flex-1">
          <Link
            to="/"
            className="px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700"
          >
            Мои транскрипции
          </Link>
          <Link
            to="/upload"
            className="px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700"
          >
            Загрузить файл
          </Link>
          <Link
            to="/pricing"
            className="px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700"
          >
            Тарифы
          </Link>
          <Link
            to="/subscription"
            className="px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700"
          >
            Подписка
          </Link>
        </nav>
        {user && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <p className="text-sm text-gray-500">{user.email}</p>
            <p className="text-xs text-gray-400 mb-1">
              Тариф: {user.plan} | {user.minutes_used}/{user.minutes_limit} мин
            </p>
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
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
