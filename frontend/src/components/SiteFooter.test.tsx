import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SiteFooter from "./SiteFooter";
import { SEO_CLUSTERS } from "@/config/seoLinks";

function renderFooter() {
  return render(
    <MemoryRouter>
      <SiteFooter />
    </MemoryRouter>,
  );
}

describe("SiteFooter", () => {
  it("рендерит заголовки всех кластеров", () => {
    renderFooter();
    for (const c of SEO_CLUSTERS) {
      // Find by text + role to distinguish cluster title from link label (if same text)
      const titleElement = screen.getAllByText(c.title).find((el) => el.tagName === "P");
      expect(titleElement).toBeInTheDocument();
    }
  });

  it("рендерит ссылку на каждый SEO-лендинг с корректным href", () => {
    renderFooter();
    const all = SEO_CLUSTERS.flatMap((c) => c.links);
    for (const l of all) {
      const link = screen.getByRole("link", { name: l.label });
      expect(link).toHaveAttribute("href", l.href);
    }
  });

  it("содержит служебные ссылки (Тарифы, Блог, Конфиденциальность)", () => {
    renderFooter();
    expect(screen.getByRole("link", { name: "Тарифы" })).toHaveAttribute("href", "/pricing");
    expect(screen.getByRole("link", { name: "Блог" })).toHaveAttribute("href", "/blog");
    expect(screen.getByRole("link", { name: "Конфиденциальность" })).toHaveAttribute("href", "/privacy");
  });
});
