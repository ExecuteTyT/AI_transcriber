import type { Transition, Variants } from "framer-motion";

export const springBase: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 28,
  mass: 0.9,
};

export const springTight: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 32,
};

export const easeOutQuart: Transition = {
  duration: 0.28,
  ease: [0.25, 1, 0.5, 1],
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: easeOutQuart },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.24, ease: "easeOut" } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: springTight },
};

export const staggerChildren = (staggerDelay = 0.04, delayChildren = 0.04): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: staggerDelay, delayChildren },
  },
});

export const pressTap = {
  whileTap: { scale: 0.96 },
  transition: springTight,
};

export const DURATIONS = {
  fast: 0.15,
  base: 0.22,
  slow: 0.32,
} as const;
