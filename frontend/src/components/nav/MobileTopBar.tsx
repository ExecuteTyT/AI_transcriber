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
    let ticking = false;
    let prev = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const next = window.scrollY > 4;
        if (next !== prev) {
          prev = next;
          setScrolled(next);
        }
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-30 transition-colors duration-base md:hidden ${
        scrolled
          ? "bg-[var(--bg)]/95 backdrop-blur-xl border-b border-[var(--border)]"
          : "bg-[var(--bg)] border-b border-transparent"
      }`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center gap-1 h-top-bar px-2">
        {meta.showBack ? (
          <IconButton
            aria-label="Назад"
            onClick={() => navigate(meta.backTo ?? (-1 as unknown as string))}
          >
            <Icon icon={ChevronLeft} size="md" />
          </IconButton>
        ) : (
          <div className="flex items-center gap-2 px-3">
            <span className="block w-1.5 h-1.5 rounded-full bg-acid-300 shadow-[0_0_10px_rgba(197,240,20,0.6)]" aria-hidden />
            <span className="font-display text-[20px] tracking-[-0.015em] text-[var(--fg)] leading-none">
              Dicto
            </span>
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.h1
            key={meta.title + String(meta.showBack)}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="flex-1 font-display text-[17px] text-[var(--fg)] truncate"
          >
            {meta.showBack ? meta.title : ""}
          </motion.h1>
        </AnimatePresence>
        <div id="topbar-actions" className="flex items-center gap-1" />
      </div>
    </header>
  );
}
