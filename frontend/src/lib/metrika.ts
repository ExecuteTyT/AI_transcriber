/**
 * Тонкая обёртка над Яндекс.Метрикой для целей-событий (reachGoal).
 *
 * Счётчик инициализируется в index.html (id 109251574). Здесь — только
 * отправка целей конверсий, на которые оптимизируются автостратегии
 * Яндекс.Директа. Каждый идентификатор цели ДОЛЖЕН быть заведён руками
 * в Метрике (Настройки → Цели → JavaScript-событие) с тем же именем.
 *
 * Воронка Dicto:
 *   registration   — пользователь завершил регистрацию (+180 мин). PRIMARY.
 *   upload         — загрузил первый/любой файл (engagement, micro-goal).
 *   subscribe_click— нажал «Выбрать тариф», ушёл на оплату (intent).
 *   purchase       — вернулся с YooKassa с успешной оплатой. MACRO.
 */

const COUNTER_ID = 109251574;

/** Идентификаторы целей. Должны 1:1 совпадать с целями в кабинете Метрики. */
export type MetrikaGoal =
  | "registration"
  | "upload"
  | "subscribe_click"
  | "purchase";

type YmFunction = (
  counterId: number,
  action: string,
  goalOrParams?: string | Record<string, unknown>,
  params?: Record<string, unknown>,
) => void;

declare global {
  interface Window {
    ym?: YmFunction;
  }
}

/**
 * Отправить цель в Метрику. Безопасно при отсутствии ym (SSR/prerender,
 * блокировщик рекламы) — просто no-op, не роняет приложение.
 *
 * @param goal   идентификатор цели
 * @param params необязательные параметры визита (например, { plan: "pro" })
 */
export function reachGoal(goal: MetrikaGoal, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || typeof window.ym !== "function") return;
  try {
    window.ym(COUNTER_ID, "reachGoal", goal, params);
  } catch {
    // Метрика не должна влиять на работу приложения — глушим любые ошибки.
  }
}
