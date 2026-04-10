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
    <>
      {/* ─── Mobile shell ─── */}
      <div className="md:hidden min-h-screen bg-surface-50">
        <MobileTopBar />
        <main className="pt-top-bar min-h-screen">
          <div className="px-4 py-4">
            {pageContent}
          </div>
          <BottomBarSpacer />
        </main>
        <BottomTabBar />
      </div>

      {/* ─── Desktop shell ─── */}
      <div className="hidden md:flex min-h-screen bg-surface-50">
        <DesktopSidebar />
        <main className="flex-1 min-h-screen">
          <div className="p-8 lg:p-10">
            <div className="max-w-5xl mx-auto">
              {pageContent}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
