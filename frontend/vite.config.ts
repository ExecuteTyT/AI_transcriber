import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  ssr: {
    noExternal: ["react-helmet-async"],
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    // Разбиваем vendor-библиотеки на отдельные чанки — браузер кеширует их
    // навсегда (immutable hash в имени), не перегружая на каждом relasе кода.
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — самое большое и стабильное
          "vendor-react": ["react", "react-dom", "react-router-dom", "react-router"],
          // Motion — ~80 KB, нужен во всём приложении
          "vendor-motion": ["framer-motion"],
          // Utility libraries
          "vendor-utils": ["axios", "zustand", "sonner"],
          // SEO/helmet
          "vendor-helmet": ["react-helmet-async"],
          // Icons — lucide-react сам шейкается до нужных, но отдельно удобнее
          "vendor-icons": ["lucide-react"],
          // Dropzone — только /upload
          "vendor-dropzone": ["react-dropzone"],
        },
      },
    },
    // Поднимаем лимит warning (наши чанки теперь существенно меньше 500 KB).
    chunkSizeWarningLimit: 600,
  },
});
