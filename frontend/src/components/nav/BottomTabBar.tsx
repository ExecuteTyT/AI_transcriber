import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { MoreHorizontal } from "lucide-react";
import { PRIMARY_TABS } from "@/config/navigation";
import { Icon } from "@/components/Icon";
import { springTight } from "@/lib/motion";
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
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <ul className="pointer-events-auto mx-3 flex items-center justify-between gap-1 rounded-full border border-white/70 bg-white/85 px-2 py-1.5 shadow-overlay backdrop-blur-xl ring-1 ring-gray-900/[0.03]">
          {PRIMARY_TABS.map((tab) => {
            const active = isActive(tab);

            if (tab.isFab) {
              return (
                <li key={tab.to} className="relative flex items-center justify-center -mt-6">
                  <motion.div whileTap={{ scale: 0.92 }} transition={springTight}>
                    <Link
                      to={tab.to}
                      aria-label={tab.label}
                      className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 via-primary-600 to-accent-500 text-white shadow-floating ring-4 ring-white"
                    >
                      <span className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-400/40 to-accent-400/40 blur-xl -z-10 opacity-80 transition-opacity duration-base group-active:opacity-100" />
                      <Icon icon={tab.Icon} size="lg" strokeWidth={2.25} />
                    </Link>
                  </motion.div>
                </li>
              );
            }

            return (
              <li key={tab.to} className="flex-1">
                <motion.div whileTap={{ scale: 0.96 }} transition={springTight}>
                  <Link
                    to={tab.to}
                    aria-label={tab.label}
                    aria-current={active ? "page" : undefined}
                    className="relative flex h-12 flex-col items-center justify-center gap-0.5 rounded-full touch-target"
                  >
                    {active && (
                      <motion.span
                        layoutId="tab-indicator"
                        className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-50 to-primary-100/70"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <Icon
                      icon={tab.Icon}
                      size={20}
                      strokeWidth={active ? 2.2 : 1.75}
                      className={`relative z-10 transition-colors duration-fast ${
                        active ? "text-primary-600" : "text-gray-500"
                      }`}
                    />
                    <span
                      className={`relative z-10 text-[10px] font-semibold tracking-wide transition-colors duration-fast ${
                        active ? "text-primary-700" : "text-gray-500"
                      }`}
                    >
                      {tab.label}
                    </span>
                  </Link>
                </motion.div>
              </li>
            );
          })}

          <li className="flex-1">
            <motion.div whileTap={{ scale: 0.96 }} transition={springTight}>
              <button
                type="button"
                onClick={() => setOverflowOpen(true)}
                aria-label="Ещё"
                className="relative flex h-12 w-full flex-col items-center justify-center gap-0.5 rounded-full touch-target"
              >
                <Icon icon={MoreHorizontal} size={20} className="text-gray-500" />
                <span className="text-[10px] font-semibold tracking-wide text-gray-500">Ещё</span>
              </button>
            </motion.div>
          </li>
        </ul>
      </nav>

      <OverflowSheet open={overflowOpen} onClose={() => setOverflowOpen(false)} />
    </>
  );
}
