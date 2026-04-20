import { useEffect, useRef } from "react";

interface Options {
  /** Радиус активации в px (как близко мышь должна подойти). Дефолт 90. */
  radius?: number;
  /** Сила эффекта 0..1. Сколько % от смещения курсора применяется к элементу. Дефолт 0.35. */
  strength?: number;
}

/**
 * Magnetic-cursor hook: элемент мягко тянется к курсору когда тот близко.
 * Чисто на transform → GPU-композит, ничего не пересчитывает layout.
 * Пропускает мобильные (no hover) и пользователей с reduced-motion.
 */
export function useMagnetic<T extends HTMLElement = HTMLElement>({
  radius = 90,
  strength = 0.35,
}: Options = {}) {
  const ref = useRef<T | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Skip на устройствах без hover (тач) и при reduced-motion.
    const noHover = window.matchMedia("(hover: none)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (noHover || reduced) return;

    let active = false;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const apply = () => {
      currentX += (targetX - currentX) * 0.18;
      currentY += (targetY - currentY) * 0.18;
      el.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;
      if (active || Math.abs(currentX) > 0.05 || Math.abs(currentY) > 0.05) {
        rafRef.current = requestAnimationFrame(apply);
      } else {
        rafRef.current = null;
      }
    };

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);

      if (dist < radius + Math.max(rect.width, rect.height) / 2) {
        active = true;
        targetX = dx * strength;
        targetY = dy * strength;
        if (!rafRef.current) rafRef.current = requestAnimationFrame(apply);
      } else if (active) {
        active = false;
        targetX = 0;
        targetY = 0;
        if (!rafRef.current) rafRef.current = requestAnimationFrame(apply);
      }
    };

    const onLeave = () => {
      active = false;
      targetX = 0;
      targetY = 0;
      if (!rafRef.current) rafRef.current = requestAnimationFrame(apply);
    };

    window.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);

    return () => {
      window.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      el.style.transform = "";
    };
  }, [radius, strength]);

  return ref;
}
