import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import DesktopSidebar from "@/components/nav/DesktopSidebar";
import MobileTopBar from "@/components/nav/MobileTopBar";
import BottomTabBar from "@/components/nav/BottomTabBar";
import BottomBarSpacer from "@/components/ui/BottomBarSpacer";

/** Локальный фолбэк на время загрузки lazy-чанка страницы.
 *  Держим внутри Layout, чтобы при первом заходе сайдбар/топбар оставались
 *  на месте, а не сменялись полноэкранным глобальным лоадером (это ломало
 *  transition AnimatePresence, из-за чего новая страница застревала в
 *  hidden-варианте и контент оставался пустым до ручного refresh). */
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
  const location = useLocation();

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
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
              >
                <Suspense fallback={<OutletFallback />}>
                  <Outlet />
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        <BottomBarSpacer />
      </main>

      {/* Mobile bottom tab bar */}
      <BottomTabBar />
    </div>
  );
}
