import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import SoundToggle from "@/components/ui/SoundToggle";

interface Props {
  /** Eyebrow строкой над заголовком, mono-uppercase. */
  eyebrow: string;
  /** Display-serif заголовок. Italic-вставку оборачивайте в <em>...</em>. */
  title: ReactNode;
  /** Sub-line под заголовком. */
  subtitle?: ReactNode;
  /** Сама форма / контент карточки. */
  children: ReactNode;
  /** Дополнительная нижняя ссылка («Уже есть аккаунт? Войти»). */
  footer?: ReactNode;
}

/**
 * Editorial single-column layout для всех auth-страниц
 * (Login, Register, ForgotPassword, ResetPassword).
 * Dark-first, минимум хром, серьёзный editorial серif для H1.
 */
export default function AuthLayout({ eyebrow, title, subtitle, children, footer }: Props) {
  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--fg)] flex flex-col">
      {/* Top bar */}
      <header
        className="border-b border-[var(--border)]"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
          <Link to="/" className="flex items-center gap-2 font-display text-2xl tracking-[-0.015em] text-[var(--fg)] leading-none">
            <span className="dot-accent" aria-hidden />
            Dicto
          </Link>
          <div className="flex items-center gap-1.5">
            <SoundToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-start md:items-center justify-center px-5 md:px-8 py-10 md:py-16">
        <div className="w-full max-w-md animate-fade-up">
          <p className="eyebrow mb-4">{eyebrow}</p>
          <h1 className="font-display text-5xl md:text-6xl leading-[0.95] tracking-[-0.02em] text-[var(--fg)] mb-3">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[15px] text-[var(--fg-muted)] leading-[1.55] mb-8 md:mb-10 max-w-[40ch]">
              {subtitle}
            </p>
          )}
          {!subtitle && <div className="mb-8 md:mb-10" />}

          {children}

          {footer && (
            <div className="mt-8 pt-6 border-t border-[var(--border)] text-[13px] text-[var(--fg-muted)]">
              {footer}
            </div>
          )}
        </div>
      </main>

      {/* Footer line */}
      <footer
        className="border-t border-[var(--border)] py-5"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto max-w-7xl px-5 md:px-8 flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
            © 2026 dicto.pro
          </span>
          <div className="flex items-center gap-5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
            <Link to="/privacy" className="hover:text-[var(--fg)] transition-colors">Конфиденциальность</Link>
            <Link to="/terms" className="hover:text-[var(--fg)] transition-colors">Соглашение</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
