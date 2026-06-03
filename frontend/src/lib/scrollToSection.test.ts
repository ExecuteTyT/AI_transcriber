import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { scrollToSection } from "./scrollToSection";

describe("scrollToSection", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  });
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("ничего не делает, если элемента нет", () => {
    scrollToSection("missing");
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("скроллит, если элемент найден", () => {
    const el = document.createElement("div");
    el.id = "features";
    document.body.appendChild(el);
    scrollToSection("features");
    expect(window.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "smooth" }),
    );
  });
});
