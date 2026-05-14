/**
 * Отдельное приложение для админ-панели.
 *
 * Зачем отдельный entry-point вместо /admin маршрута в основном App:
 * 1. Публичный bundle dicto.pro НЕ содержит код админки — меньше attack surface
 *    (даже если найти XSS в публичной части, он не получит доступ к admin-роутам).
 * 2. Деплоится на отдельный VPS под admin.dicto.pro с nginx IP-allowlist.
 * 3. Можно повторно скейлить и обновлять независимо от public.
 *
 * Маршруты тут минимальные:
 *   /login     — форма входа (та же что и в public, но изолированная)
 *   /          — Admin (главная панель)
 *   /*         — 404
 */
import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

const Login = lazy(() => import("@/pages/Login"));
const Admin = lazy(() => import("@/pages/Admin"));

function AdminRouteLoader() {
  return (
    <div className="min-h-dvh bg-[var(--bg)] flex items-center justify-center">
      <span
        className="inline-flex items-end gap-[2px] h-5"
        role="status"
        aria-label="Загрузка"
      >
        {[0.35, 0.7, 1, 0.7, 0.35].map((base, i) => (
          <span
            key={i}
            className="rounded-full bg-[var(--accent)]"
            style={{
              width: 2,
              height: `${base * 100}%`,
              animationDelay: `${i * 0.12}s`,
              animationDuration: `${0.9 + (i % 3) * 0.25}s`,
            }}
          />
        ))}
      </span>
    </div>
  );
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // user может быть null пока loadUser() не отработал — рендерим loader
  if (!user) return <AdminRouteLoader />;
  // Только админы. is_admin=false → редирект на dicto.pro
  // (с admin.dicto.pro не может быть кабинета — там нет регулярного приложения).
  if (!user.is_admin) {
    window.location.href = "https://dicto.pro";
    return null;
  }
  return <>{children}</>;
}

export default function AdminApp() {
  const { isAuthenticated, loadUser } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      loadUser();
    }
  }, [isAuthenticated, loadUser]);

  return (
    <Suspense fallback={<AdminRouteLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <AdminGuard>
              <Admin />
            </AdminGuard>
          }
        />
        {/* Любой неизвестный путь — на админ-главную (или /login если не авторизован) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
