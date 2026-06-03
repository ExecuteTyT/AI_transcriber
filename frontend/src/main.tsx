import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/lib/theme";
import { SoundProvider } from "@/lib/sound";
import "./index.css";

/**
 * Toaster (sonner) — client-only виджет. На SSR (entry-server) он не рендерится,
 * поэтому на первом клиентском рендере (момент гидратации) его тоже не должно
 * быть: иначе в гидрируемом дереве появляется лишний хвостовой компонент,
 * которого нет в серверном HTML → рассинхрон гидратации (React #418/#423),
 * из-за которого React выбрасывает весь пре-рендеренный HTML и перерисовывает
 * страницу на клиенте (медленный FCP/LCP). Рендерим Toaster уже после mount.
 */
function DeferredToaster() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <Toaster
      position="top-center"
      richColors
      closeButton
      offset="calc(16px + env(safe-area-inset-top))"
      toastOptions={{ className: "!font-sans" }}
    />
  );
}

// Build target. Управляется через VITE_BUILD_TARGET во время сборки:
//   - "public" (default): полный сайт dicto.pro без админки.
//   - "admin": только админ-приложение для admin.dicto.pro.
// Tree-shaking гарантирует что в bundle одного target'а не попадёт другой
// (Vite/Rollup статически резолвят import() с константой).
const BUILD_TARGET = import.meta.env.VITE_BUILD_TARGET || "public";

async function bootstrap() {
  const { default: RootApp } =
    BUILD_TARGET === "admin"
      ? await import("./admin/AdminApp")
      : await import("./App");

  const root = document.getElementById("root")!;
  const app = (
    <React.StrictMode>
      <HelmetProvider>
        <ThemeProvider>
          <SoundProvider>
            <BrowserRouter>
              <RootApp />
              <DeferredToaster />
            </BrowserRouter>
          </SoundProvider>
        </ThemeProvider>
      </HelmetProvider>
    </React.StrictMode>
  );

  if (root.innerHTML.trim()) {
    ReactDOM.hydrateRoot(root, app);
  } else {
    ReactDOM.createRoot(root).render(app);
  }
}

void bootstrap();
