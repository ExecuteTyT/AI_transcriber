import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Сбрасывает скролл наверх при клиентском переходе на новый маршрут.
 *
 * Зачем: BrowserRouter не управляет скроллом — позиция окна сохраняется между
 * страницами. Переход из футера (низ длинной страницы) на короткую страницу
 * (например /pricing) оставлял пользователя «в конце страницы».
 *
 * Поведение:
 *  — PUSH/REPLACE на новый pathname → window.scrollTo(0, 0);
 *  — POP (кнопки браузера «назад/вперёд») → не трогаем, отдаём нативному
 *    восстановлению позиции;
 *  — переход на путь с #hash → не трогаем, чтобы работала якорная прокрутка.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === "POP") return;
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash, navigationType]);

  return null;
}
