import { Suspense, useEffect, useState, type ReactNode } from "react";

/**
 * Рендерит тяжёлый client-only виджет ТОЛЬКО после mount.
 *
 * Зачем: `renderToString` (React 18, наш пре-рендер) не умеет завершать
 * Suspense-границы на сервере. Если обернуть ленивый виджет в голый
 * `<Suspense>`, на сервере граница «не завершается», а на клиенте при
 * гидратации возникает React error #419 → React выбрасывает поддерево и
 * до-рендеривает его, засоряя консоль.
 *
 * Решение: на SSR и на ПЕРВОМ клиентском рендере отдаём fallback-плейсхолдер
 * (той же высоты — без сдвига лэйаута и без Suspense-границы на сервере). Сам
 * виджет (со своим code-split через Suspense) монтируем уже после mount, когда
 * мы гарантированно на клиенте.
 */
export default function ClientOnly({
  fallback,
  children,
}: {
  fallback: ReactNode;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <Suspense fallback={fallback}>{children}</Suspense> : <>{fallback}</>;
}
