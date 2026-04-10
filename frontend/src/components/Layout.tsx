import { Outlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import DesktopSidebar from "@/components/nav/DesktopSidebar";
import MobileTopBar from "@/components/nav/MobileTopBar";
import BottomTabBar from "@/components/nav/BottomTabBar";
import BottomBarSpacer from "@/components/ui/BottomBarSpacer";

export default function Layout() {
  const location = useLocation();

  const pageContent = (
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
  );

  return (
    <div className="flex min-h-screen bg-surface-50">
      {/* Desktop: sticky sidebar + content */}
      <DesktopSidebar />

      {/* Mobile: top bar + bottom tab bar */}
      <MobileTopBar />

      {/* Main content */}
      <main className="flex-1 pt-top-bar md:pt-0 min-h-screen">
        <div className="p-4 md:p-8 lg:p-10">
          <div className="max-w-5xl mx-auto">
            {pageContent}
          </div>
        </div>
        <BottomBarSpacer />
      </main>

      <BottomTabBar />
    </div>
  );
}
