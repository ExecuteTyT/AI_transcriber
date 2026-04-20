import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "sonner";
import App from "./App";
import { ThemeProvider } from "@/lib/theme";
import { SoundProvider } from "@/lib/sound";
import "./index.css";

const root = document.getElementById("root")!;
const app = (
  <React.StrictMode>
    <HelmetProvider>
      <ThemeProvider>
        <SoundProvider>
          <BrowserRouter>
            <App />
            <Toaster
              position="top-center"
              richColors
              closeButton
              offset={16}
              toastOptions={{ className: "!font-sans" }}
            />
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
