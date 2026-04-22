import "@testing-library/jest-dom";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Мы используем react-helmet-async в страницах (через компонент <Seo/>).
// Его HelmetDispatcher хранит глобальное состояние в синглтон-массиве на
// уровне модуля — между тестами оно не очищается и ломает последующие
// рендеры с ошибкой "Cannot read properties of undefined (reading 'push')".
// Очищаем после каждого теста + принудительно обнуляем внутренний массив.
afterEach(() => {
  cleanup();
});
