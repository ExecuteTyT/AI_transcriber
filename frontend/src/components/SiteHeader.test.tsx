import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SiteHeader from "./SiteHeader";

function renderAt(path: string, overlay = false) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SiteHeader overlay={overlay} />
    </MemoryRouter>,
  );
}

describe("SiteHeader", () => {
  it("на внутренней странице якоря — ссылки на /#section", () => {
    renderAt("/blog");
    expect(screen.getByRole("link", { name: "Возможности" })).toHaveAttribute("href", "/#features");
    expect(screen.getByRole("link", { name: "Кому" })).toHaveAttribute("href", "/#use-cases");
    expect(screen.getByRole("link", { name: "Тарифы" })).toHaveAttribute("href", "/pricing");
    expect(screen.getByRole("link", { name: "Блог" })).toHaveAttribute("href", "/blog");
  });

  it("на Landing якоря — кнопки скролла, а не ссылки", () => {
    renderAt("/", true);
    expect(screen.getByRole("button", { name: "Возможности" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Возможности" })).toBeNull();
  });

  it("бургер открывает мобильное меню (дублирует пункты)", () => {
    renderAt("/blog");
    expect(screen.getAllByRole("link", { name: "Тарифы" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Открыть меню" }));
    expect(screen.getAllByRole("link", { name: "Тарифы" })).toHaveLength(2);
  });
});
