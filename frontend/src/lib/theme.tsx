import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

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
  root.dataset.theme = theme;
  // Обновляем цвет системного UI (адрес-бар на мобиле).
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#0b0805" : "#faf7f2");
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return "dark"; // dark-first по умолчанию
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    applyThemeToDocument(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const value: ThemeContextValue = {
    theme,
    toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    set: setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}
