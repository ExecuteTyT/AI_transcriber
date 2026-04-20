import { useEffect, useRef } from "react";

interface Options {
  /** Интервал в мс. Если 0/undefined — polling выключен, только visibility-refresh. */
  interval?: number;
  /** Выполнять ли callback сразу при mount. */
  immediate?: boolean;
}

/**
 * Вызывает `callback`:
 * - при монтировании (если immediate=true),
 * - каждые `interval` мс, но ТОЛЬКО пока вкладка видимая (document.visibilityState === "visible"),
 * - сразу при возврате на вкладку (visibilitychange → visible).
 *
 * Это даёт авто-синхронизацию между устройствами, не сжигая батарею когда tab скрыт.
 */
export function useVisibilityPolling(callback: () => void, options: Options = {}) {
  const { interval = 30000, immediate = true } = options;
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (immediate) savedCallback.current();

    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer != null || interval <= 0) return;
      timer = setInterval(() => {
        if (document.visibilityState === "visible") savedCallback.current();
      }, interval);
    };
    const stop = () => {
      if (timer != null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        savedCallback.current();
        start();
      } else {
        stop();
      }
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [interval, immediate]);
}
