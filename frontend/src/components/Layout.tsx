import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import DesktopSidebar from "@/components/nav/DesktopSidebar";
import MobileTopBar from "@/components/nav/MobileTopBar";
import BottomTabBar from "@/components/nav/BottomTabBar";
import BottomBarSpacer from "@/components/ui/BottomBarSpacer";

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Mobile top bar */}
      <MobileTopBar />

      {/* Desktop sidebar */}
      <DesktopSidebar />

      {/* Main content area */}
      <main className="pt-top-bar md:pt-0 md:pl-[240px] min-h-screen">
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
                <Outlet />
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
