import React from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import { HelmetProvider, HelmetServerState } from "react-helmet-async";
import { ThemeProvider } from "@/lib/theme";
import { SoundProvider } from "@/lib/sound";
import App from "./App";

export function render(url: string) {
  const helmetContext: { helmet?: HelmetServerState } = {};
  // Оборачиваем в те же провайдеры, что и клиент (main.tsx). Без ThemeProvider/
  // SoundProvider на SSR useTheme()/useSound() возвращали NOOP-дефолты
  // (enabled=false), а клиент — реальные (enabled=true) → SoundToggle рендерил
  // разные иконку/aria → рассинхрон гидратации (React #418/#423) на каждой
  // странице. React при этом выбрасывал серверный HTML и перерисовывал всё на
  // клиенте — отсюда и медленный FCP несмотря на пре-рендер.
  const html = renderToString(
    <React.StrictMode>
      <HelmetProvider context={helmetContext}>
        <ThemeProvider>
          <SoundProvider>
            <StaticRouter location={url}>
              <App />
            </StaticRouter>
          </SoundProvider>
        </ThemeProvider>
      </HelmetProvider>
    </React.StrictMode>
  );
  return { html, helmet: helmetContext.helmet };
}
