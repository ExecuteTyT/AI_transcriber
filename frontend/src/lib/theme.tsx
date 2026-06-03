import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "dicto:theme";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  set: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeToDocument(theme: Theme) {
  const root = document.documentElement;
  // Глушим transition на момент смены темы (см. правило [data-theme-switching]
  // в index.css), иначе элементы анимируют смену var(--fg)/var(--bg) через
  // промежуточный цвет. Снимаем через два кадра, когда новые цвета уже применены.
  root.setAttribute("data-theme-switching", "");
  root.dataset.theme = theme;
  // Обновляем цвет системного UI (адрес-бар на мобиле).
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#0b0805" : "#faf7f2");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.removeAttribute("data-theme-switching"));
  });
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return "dark"; // dark-first по умолчанию
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Первый рендер ВСЕГДА "dark" — это SSR-дефолт, совпадающий с пре-рендеренным
  // HTML. Если читать localStorage прямо в useState, клиент с сохранённой "light"
  // отрендерит тогглы темы иначе, чем серверный HTML → рассинхрон гидратации
  // (React error #418/#423, перерисовка поддерева). Сохранённую тему применяем
  // уже ПОСЛЕ гидратации, в эффекте.
  const [theme, setTheme] = useState<Theme>("dark");

  // Адаптируем сохранённую тему после монтирования (это уже клиент, без SSR).
  useEffect(() => {
    setTheme(readStoredTheme());
  }, []);

  // Применяем тему к документу при изменении. На самом первом проходе НЕ трогаем
  // DOM: data-theme уже выставлен инлайн-скриптом в <head> до краски, иначе
  // мигнём дефолтом перед adoption-эффектом.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    applyThemeToDocument(theme);
  }, [theme]);

  // Запись в localStorage — только по действию пользователя (не в эффекте на
  // [theme]), чтобы initial-дефолт не затирал сохранённое значение.
  const persist = (t: Theme) => {
    window.localStorage.setItem(STORAGE_KEY, t);
    setTheme(t);
  };

  const value: ThemeContextValue = {
    theme,
    toggle: () => persist(theme === "dark" ? "light" : "dark"),
    set: persist,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** No-op fallback — для тестов и edge-cases где провайдер случайно не подключён.
 *  В production main.tsx обёрнут <ThemeProvider>, так что это путь только для defensive-render. */
const NOOP_THEME: ThemeContextValue = { theme: "dark", toggle: () => {}, set: () => {} };

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext) ?? NOOP_THEME;
}
