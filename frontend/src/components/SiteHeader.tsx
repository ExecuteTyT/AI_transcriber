import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SoundToggle from "@/components/ui/SoundToggle";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useSound } from "@/lib/sound";
import { scrollToSection } from "@/lib/scrollToSection";

interface SiteHeaderProps {
  /** Landing: фиксированная прозрачная шапка над hero, плотнеет при скролле. */
  overlay?: boolean;
}

const NAV_SECTIONS = [
  { id: "features", label: "Возможности" },
  { id: "use-cases", label: "Кому" },
] as const;

export default function SiteHeader({ overlay = false }: SiteHeaderProps) {
  const { pathname } = useLocation();
  const { play } = useSound();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const onLanding = pathname === "/";

  useEffect(() => {
    if (!overlay) return;
    let ticking = false;
    let prev = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const next = window.scrollY > 60;
        if (next !== prev) {
          prev = next;
          setScrolled(next);
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  const headerClass = overlay
    ? `fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "bg-[var(--bg)]/80 backdrop-blur-2xl border-b border-[var(--border)]"
          : "bg-transparent border-b border-transparent"
      }`
    : "sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl";

  const renderSection = (id: string, label: string, mobile: boolean) => {
    const cls = mobile
      ? "hover:text-[var(--accent)] transition py-2 px-4 touch-target"
      : "hover:text-[var(--fg)] transition-colors";
    if (onLanding) {
      return (
        <button
          key={id}
          type="button"
          onMouseEnter={mobile ? undefined : () => play("focus")}
          onClick={() => {
            if (mobile) setMobileMenuOpen(false);
            scrollToSection(id);
          }}
          className={cls}
        >
          {label}
        </button>
      );
    }
    return (
      <Link
        key={id}
        to={`/#${id}`}
        onMouseEnter={mobile ? undefined : () => play("focus")}
        onClick={mobile ? () => setMobileMenuOpen(false) : undefined}
        className={cls}
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      <header className={headerClass} style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="max-w-7xl mx-auto px-5 md:px-8 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-display text-2xl tracking-[-0.015em] text-[var(--fg)] leading-none">
            <span className="dot-accent" aria-hidden />
            Dicto
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-[var(--fg-muted)]">
            {NAV_SECTIONS.map((s) => renderSection(s.id, s.label, false))}
            <Link to="/pricing" onMouseEnter={() => play("focus")} className="hover:text-[var(--fg)] transition-colors">Тарифы</Link>
            <Link to="/blog" onMouseEnter={() => play("focus")} className="hover:text-[var(--fg)] transition-colors">Блог</Link>
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5">
              <SoundToggle />
              <ThemeToggle />
            </div>
            <Link to="/login" onClick={() => play("tick")} className="text-[13px] px-3 py-2 rounded-full font-medium text-[var(--fg-muted)] hover:text-[var(--fg)] hidden sm:inline-flex transition-colors">
              Войти
            </Link>
            <Link to="/register" onClick={() => play("confirm")} className="btn-accent hidden sm:inline-flex !py-2.5 !px-5 !text-[13px]">
              Попробовать
            </Link>
            <button
              onClick={() => {
                play("tick");
                setMobileMenuOpen((v) => !v);
              }}
              className="md:hidden p-3 rounded-xl transition touch-target hover:bg-[var(--bg-muted)]"
              aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6 text-[var(--fg)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-6 h-6 text-[var(--fg)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-[60] md:hidden"
          style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="absolute inset-0 bg-[var(--bg)]/95 backdrop-blur-lg" onClick={() => setMobileMenuOpen(false)} />
          <nav className="relative flex flex-col items-center justify-center h-full gap-6 font-display text-2xl text-[var(--fg)]">
            {NAV_SECTIONS.map((s) => renderSection(s.id, s.label, true))}
            <Link to="/pricing" onClick={() => setMobileMenuOpen(false)} className="hover:text-[var(--accent)] transition py-2 px-4 touch-target">Тарифы</Link>
            <Link to="/blog" onClick={() => setMobileMenuOpen(false)} className="hover:text-[var(--accent)] transition py-2 px-4 touch-target">Блог</Link>
            <div className="mt-4 flex items-center gap-3">
              <SoundToggle />
              <ThemeToggle />
            </div>
            <div className="flex flex-col gap-3 mt-2 w-64">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="px-8 py-3.5 rounded-full border border-[var(--border-strong)] text-center text-[var(--fg)] hover:bg-[var(--bg-muted)] transition font-sans text-[15px]">Войти</Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="btn-accent justify-center text-center">Попробовать</Link>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
