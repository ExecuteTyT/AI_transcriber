import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import DesktopSidebar from "@/components/nav/DesktopSidebar";
import MobileTopBar from "@/components/nav/MobileTopBar";
import BottomTabBar from "@/components/nav/BottomTabBar";
import BottomBarSpacer from "@/components/ui/BottomBarSpacer";

/** Фолбэк на время загрузки lazy-чанка страницы. Рендерится внутри
 *  Layout, чтобы сайдбар/топбар не мигали. */
function OutletFallback() {
  return (
    <div className="flex items-center justify-center py-16" role="status" aria-label="Загрузка">
      <span className="inline-flex items-end gap-[2px] h-5">
        {[0.35, 0.7, 1, 0.7, 0.35].map((base, i) => (
          <span
            key={i}
            className="hero-eq-bar rounded-full"
            style={{
              width: 2,
              height: `${base * 100}%`,
              background: "var(--accent)",
              animationDelay: `${i * 0.12}s`,
              animationDuration: `${0.9 + (i % 3) * 0.25}s`,
            }}
          />
        ))}
      </span>
    </div>
  );
}

export default function Layout() {
  // Ранее здесь был AnimatePresence mode="wait" + обёрточный motion.div вокруг
  // <Outlet />. Проблема: при переходе на lazy-маршрут (например /upload)
  // Suspense приостанавливал рендер, пока грузился чанк. AnimatePresence в
  // "wait" режиме прерывал exit старой страницы и монтировал новую motion.div
  // в момент резолва Suspense'а — но дочерние motion.* у страницы, завязанные
  // на variant-пропагацию от родителя, застревали в состоянии "hidden" (opacity 0).
  // Страница оставалась пустой до ручного refresh.
  //
  // Убрали лишний слой — каждая страница и так рендерит свою входную
  // анимацию у корневого motion.div. Экономим на complexity, фиксим баг.
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Mobile top bar */}
      <MobileTopBar />

      {/* Desktop sidebar */}
      <DesktopSidebar />

      {/* Main content area.
          Mobile padding-top = top bar (56px) + iOS safe-area, иначе контент заезжает под фиксированный хедер на устройствах с челкой. */}
      <main className="pt-[calc(56px+env(safe-area-inset-top))] md:pt-0 md:pl-[240px] min-h-screen">
        <div className="px-4 py-4 md:p-8 lg:p-10">
          <div className="max-w-5xl md:mx-auto">
            <Suspense fallback={<OutletFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </div>
        <BottomBarSpacer />
      </main>

      {/* Mobile bottom tab bar */}
      <BottomTabBar />
    </div>
  );
}
