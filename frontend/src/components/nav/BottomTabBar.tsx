import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { MoreHorizontal } from "lucide-react";
import { PRIMARY_TABS } from "@/config/navigation";
import { Icon } from "@/components/Icon";
import { springTight } from "@/lib/motion";
import { cn } from "@/lib/cn";
import OverflowSheet from "./OverflowSheet";

export default function BottomTabBar() {
  const location = useLocation();
  const [overflowOpen, setOverflowOpen] = useState(false);

  const isActive = (tab: (typeof PRIMARY_TABS)[number]) => {
    if (tab.match) return tab.match(location.pathname);
    return location.pathname === tab.to;
  };

  return (
    <>
      <nav
        aria-label="Основная навигация"
        className="fixed inset-x-0 bottom-0 z-40 md:hidden pointer-events-none"
        style={{
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
          paddingTop: "1.5rem",
        }}
      >
        {/* Fade-out scrim — скрывает контент под баром */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[calc(100%+1.5rem)] -z-10 bg-gradient-to-t from-white via-white/95 to-transparent"
          aria-hidden
        />

        <div
          className="pointer-events-auto relative mx-3 rounded-[28px] bg-white shadow-[0_8px_32px_-8px_rgba(15,23,42,0.18),0_2px_8px_-2px_rgba(15,23,42,0.08)] ring-1 ring-gray-900/[0.06]"
        >
          <ul className="flex items-stretch justify-between gap-0.5 px-2 pb-1.5 pt-1">
            {PRIMARY_TABS.map((tab) => {
              const active = isActive(tab);

              if (tab.isFab) {
                return (
                  <li key={tab.to} className="relative flex w-16 items-start justify-center -mt-7">
                    <motion.div whileTap={{ scale: 0.92 }} transition={springTight}>
                      <Link
                        to={tab.to}
                        aria-label={tab.label}
                        className="group relative flex h-[60px] w-[60px] items-center justify-center rounded-full bg-gradient-to-br from-primary-500 via-primary-600 to-accent-500 text-white ring-[5px] ring-white shadow-[0_10px_24px_-6px_rgba(99,102,241,0.55)]"
                      >
                        <span
                          className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary-400/35 to-accent-400/35 blur-xl -z-10 opacity-80"
                          aria-hidden
                        />
                        <Icon icon={tab.Icon} size={22} strokeWidth={2.4} />
                      </Link>
                    </motion.div>
                  </li>
                );
              }

              return (
                <li key={tab.to} className="flex-1">
                  <motion.div whileTap={{ scale: 0.95 }} transition={springTight}>
                    <Link
                      to={tab.to}
                      aria-label={tab.label}
                      aria-current={active ? "page" : undefined}
                      className="relative flex h-14 flex-col items-center justify-center gap-0.5 touch-target"
                    >
                      {active && (
                        <motion.span
                          layoutId="tab-indicator-notch"
                          className="absolute -top-1 left-1/2 h-1 w-7 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
                          transition={{ type: "spring", stiffness: 500, damping: 36 }}
                        />
                      )}
                      <Icon
                        icon={tab.Icon}
                        size={22}
                        strokeWidth={active ? 2.3 : 1.9}
                        className={cn(
                          "transition-colors duration-fast",
                          active ? "text-primary-600" : "text-gray-400"
                        )}
                      />
                      <span
                        className={cn(
                          "text-[10.5px] font-semibold tracking-tight transition-colors duration-fast",
                          active ? "text-primary-700" : "text-gray-500"
                        )}
                      >
                        {tab.label}
                      </span>
                    </Link>
                  </motion.div>
                </li>
              );
            })}

            <li className="flex-1">
              <motion.div whileTap={{ scale: 0.95 }} transition={springTight}>
                <button
                  type="button"
                  onClick={() => setOverflowOpen(true)}
                  aria-label="Ещё"
                  className="relative flex h-14 w-full flex-col items-center justify-center gap-0.5 touch-target"
                >
                  <Icon icon={MoreHorizontal} size={22} strokeWidth={1.9} className="text-gray-400" />
                  <span className="text-[10.5px] font-semibold tracking-tight text-gray-500">Ещё</span>
                </button>
              </motion.div>
            </li>
          </ul>
        </div>
      </nav>

      <OverflowSheet open={overflowOpen} onClose={() => setOverflowOpen(false)} />
    </>
  );
}
