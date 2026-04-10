import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { MoreHorizontal } from "lucide-react";
import { PRIMARY_TABS } from "@/config/navigation";
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
      <nav className="fixed inset-x-0 bottom-0 z-40 md:hidden bg-white/95 backdrop-blur-xl border-t border-gray-200/70">
        <ul className="relative mx-auto flex h-tab-bar items-stretch justify-around pb-safe">
          {PRIMARY_TABS.map((tab) => {
            const active = isActive(tab);
            const Icon = tab.Icon;

            if (tab.isFab) {
              return (
                <li key={tab.to} className="flex items-center justify-center flex-1">
                  <Link
                    to={tab.to}
                    className="relative -mt-5 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-floating flex items-center justify-center active:scale-95 transition-transform duration-150"
                    aria-label={tab.label}
                  >
                    <Icon className="w-6 h-6" />
                  </Link>
                </li>
              );
            }

            return (
              <li key={tab.to} className="flex-1">
                <Link
                  to={tab.to}
                  className="relative flex flex-col items-center justify-center h-full gap-0.5 touch-target"
                  aria-label={tab.label}
                >
                  {active && (
                    <motion.span
                      layoutId="tab-indicator"
                      className="absolute inset-x-3 top-1 bottom-1 rounded-xl bg-primary-50"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  )}
                  <Icon className={`relative z-10 w-5 h-5 ${active ? "text-primary-600" : "text-gray-400"}`} />
                  <span className={`relative z-10 text-[11px] font-medium ${active ? "text-primary-600" : "text-gray-400"}`}>
                    {tab.label}
                  </span>
                </Link>
              </li>
            );
          })}

          {/* Overflow (More) */}
          <li className="flex-1">
            <button
              onClick={() => setOverflowOpen(true)}
              className="relative flex flex-col items-center justify-center h-full w-full gap-0.5 touch-target"
              aria-label="Ещё"
            >
              <MoreHorizontal className="w-5 h-5 text-gray-400" />
              <span className="text-[11px] font-medium text-gray-400">Ещё</span>
            </button>
          </li>
        </ul>
      </nav>

      <OverflowSheet open={overflowOpen} onClose={() => setOverflowOpen(false)} />
    </>
  );
}
