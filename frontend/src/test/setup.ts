import "@testing-library/jest-dom";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom не реализует IntersectionObserver — нужен для framer-motion whileInView
// (например, TelegramPromoSection). Минимальный no-op полифилл.
if (typeof globalThis.IntersectionObserver === "undefined") {
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  // @ts-expect-error — тестовый полифилл, сигнатура упрощена.
  globalThis.IntersectionObserver = IO;
}

// Мы используем react-helmet-async в страницах (через компонент <Seo/>).
// Его HelmetDispatcher хранит глобальное состояние в синглтон-массиве на
// уровне модуля — между тестами оно не очищается и ломает последующие
// рендеры с ошибкой "Cannot read properties of undefined (reading 'push')".
// Очищаем после каждого теста + принудительно обнуляем внутренний массив.
afterEach(() => {
  cleanup();
});
