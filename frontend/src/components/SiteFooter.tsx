import { Link } from "react-router-dom";
import { SEO_CLUSTERS } from "@/config/seoLinks";
import { TELEGRAM_BOT_URL } from "@/config/social";
import { reachGoal } from "@/lib/metrika";

/**
 * Общий футер всех публичных страниц (главная, SEO-лендинги, блог).
 * Mega-футер: кластеры внутренних ссылок (источник — seoLinks.ts) для
 * плотной перелинковки + индексации, плюс служебные ссылки и копирайт.
 * Заменяет дублировавшиеся инлайн-футеры на 4 страницах.
 */
export default function SiteFooter() {
  return (
    <footer className="py-16 bg-[var(--bg)] border-t border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Кластеры SEO-ссылок */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-10 pb-12 border-b border-[var(--border)]">
          {SEO_CLUSTERS.map((cluster) => (
            <nav key={cluster.title} aria-label={cluster.title}>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)] mb-4">
                {cluster.title}
              </p>
              <ul className="space-y-2.5">
                {cluster.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-[13px] text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Лого + служебные ссылки */}
        <div className="mt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="dot-accent" aria-hidden />
            <span className="font-display text-2xl tracking-[-0.015em] text-[var(--fg)] leading-none">Dicto</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)] ml-3">© 2026</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-[var(--fg-muted)]">
            <Link to="/pricing" className="hover:text-[var(--fg)] transition-colors">Тарифы</Link>
            <Link to="/blog" className="hover:text-[var(--fg)] transition-colors">Блог</Link>
            <Link to="/privacy" className="hover:text-[var(--fg)] transition-colors">Конфиденциальность</Link>
            <Link to="/terms" className="hover:text-[var(--fg)] transition-colors">Оферта</Link>
            <a
              href={TELEGRAM_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => reachGoal("telegram_bot_click", { source: "footer" })}
              className="hover:text-[var(--fg)] transition-colors"
            >
              Telegram-бот
            </a>
            <a href="mailto:dicto.pro@yandex.ru" className="hover:text-[var(--fg)] transition-colors">dicto.pro@yandex.ru</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
