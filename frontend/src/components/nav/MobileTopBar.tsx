import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { getRouteMeta } from "@/config/navigation";
import { Icon } from "@/components/Icon";
import IconButton from "@/components/ui/IconButton";

export default function MobileTopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const meta = getRouteMeta(location.pathname);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-30 h-top-bar transition-colors duration-base md:hidden ${
        scrolled
          ? "bg-white/90 backdrop-blur-xl border-b border-gray-200/70"
          : "bg-white/40 backdrop-blur-sm border-b border-transparent"
      }`}
    >
      <div className="flex items-center gap-1 h-full px-2">
        {meta.showBack ? (
          <IconButton
            aria-label="Назад"
            onClick={() => navigate(meta.backTo ?? (-1 as unknown as string))}
          >
            <Icon icon={ChevronLeft} size="md" />
          </IconButton>
        ) : (
          <div className="flex items-center gap-2 px-2.5">
            <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 via-primary-600 to-accent-500 flex items-center justify-center shadow-glow-sm">
              <span className="text-white font-bold text-[12px]">S</span>
            </div>
            <span className="text-[15px] font-bold tracking-tight gradient-text">Dicto</span>
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.h1
            key={meta.title + String(meta.showBack)}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="flex-1 text-[15px] font-semibold text-gray-900 truncate"
          >
            {meta.showBack ? meta.title : ""}
          </motion.h1>
        </AnimatePresence>
        <div id="topbar-actions" className="flex items-center gap-1" />
      </div>
    </header>
  );
}
