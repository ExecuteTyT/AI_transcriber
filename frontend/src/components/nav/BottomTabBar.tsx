import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { MoreHorizontal } from "lucide-react";
import { PRIMARY_TABS } from "@/config/navigation";
import { Icon } from "@/components/Icon";
import { springTight } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { useSound } from "@/lib/sound";
import OverflowSheet from "./OverflowSheet";

export default function BottomTabBar() {
  const location = useLocation();
  const [overflowOpen, setOverflowOpen] = useState(false);
  const { play } = useSound();

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
        {/* Fade-out scrim */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[calc(100%+1.5rem)] -z-10 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/92 to-transparent"
          aria-hidden
        />

        <div className="pointer-events-auto relative mx-3 rounded-[28px] bg-[var(--bg-elevated)] border border-[var(--border-strong)] shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.45)]">
          <ul className="flex items-stretch justify-between gap-0.5 px-2 pb-1.5 pt-1">
            {PRIMARY_TABS.map((tab) => {
              const active = isActive(tab);

              if (tab.isFab) {
                return (
                  <li key={tab.to} className="relative flex flex-1 items-start justify-center -mt-7">
                    <motion.div whileTap={{ scale: 0.92 }} transition={springTight}>
                      <Link
                        to={tab.to}
                        onClick={() => play("tick")}
                        aria-label={tab.label}
                        className="group relative flex h-[60px] w-[60px] items-center justify-center rounded-full ring-[5px] ring-[var(--bg)]"
                        style={{
                          background: "var(--accent)",
                          color: "var(--accent-fg)",
                          boxShadow:
                            "0 10px 28px -6px color-mix(in srgb, var(--accent) 55%, transparent)",
                        }}
                      >
                        <span
                          className="absolute -inset-1 rounded-full blur-xl -z-10 opacity-80"
                          style={{
                            background: "color-mix(in srgb, var(--accent) 35%, transparent)",
                          }}
                          aria-hidden
                        />
                        <Icon icon={tab.Icon} size={22} strokeWidth={2.2} />
                      </Link>
                    </motion.div>
                  </li>
                );
              }

              return (
                <li key={tab.to} className="flex flex-1">
                  <motion.div
                    whileTap={{ scale: 0.95 }}
                    transition={springTight}
                    className="w-full"
                  >
                    <Link
                      to={tab.to}
                      onClick={() => play("focus")}
                      aria-label={tab.label}
                      aria-current={active ? "page" : undefined}
                      className="relative flex h-14 w-full flex-col items-center justify-center gap-0.5"
                    >
                      {active && (
                        <motion.span
                          layoutId="tab-indicator-notch"
                          className="absolute -top-1 left-1/2 h-1 w-7 -translate-x-1/2 rounded-full"
                          style={{
                            background: "var(--accent)",
                            boxShadow:
                              "0 0 10px color-mix(in srgb, var(--accent) 70%, transparent)",
                          }}
                          transition={{ type: "spring", stiffness: 500, damping: 36 }}
                        />
                      )}
                      <Icon
                        icon={tab.Icon}
                        size={21}
                        strokeWidth={active ? 2 : 1.75}
                        className={cn(
                          "transition-colors duration-fast",
                          active ? "text-[var(--fg)]" : "text-[var(--fg-subtle)]"
                        )}
                      />
                      <span
                        className={cn(
                          "font-mono text-[9px] uppercase tracking-[0.14em] transition-colors duration-fast",
                          active ? "text-[var(--fg)]" : "text-[var(--fg-subtle)]"
                        )}
                      >
                        {tab.label}
                      </span>
                    </Link>
                  </motion.div>
                </li>
              );
            })}

            <li className="flex flex-1">
              <motion.div
                whileTap={{ scale: 0.95 }}
                transition={springTight}
                className="w-full"
              >
                <button
                  type="button"
                  onClick={() => {
                    play("tick");
                    setOverflowOpen(true);
                  }}
                  aria-label="Ещё"
                  className="relative flex h-14 w-full flex-col items-center justify-center gap-0.5"
                >
                  <Icon icon={MoreHorizontal} size={21} strokeWidth={1.75} className="text-[var(--fg-subtle)]" />
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">Ещё</span>
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
