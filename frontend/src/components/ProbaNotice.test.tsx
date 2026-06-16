import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, beforeEach } from "vitest";
import { ProbaNotice } from "./ProbaNotice";

const SEEN_KEY = "proba_notice_v1";

function renderNotice(plan?: string) {
  return render(
    <BrowserRouter>
      <ProbaNotice plan={plan} />
    </BrowserRouter>,
  );
}

describe("ProbaNotice", () => {
  beforeEach(() => localStorage.clear());

  it("показывается free-юзеру, если не видел раньше", () => {
    renderNotice("free");
    expect(screen.getByText(/Мы обновили бесплатный тариф/)).toBeInTheDocument();
  });

  it("НЕ показывается платному (pro)", () => {
    renderNotice("pro");
    expect(screen.queryByText(/Мы обновили бесплатный тариф/)).not.toBeInTheDocument();
  });

  it("НЕ показывается повторно (флаг в localStorage)", () => {
    localStorage.setItem(SEEN_KEY, "1");
    renderNotice("free");
    expect(screen.queryByText(/Мы обновили бесплатный тариф/)).not.toBeInTheDocument();
  });

  it("после «Понятно» закрывается и ставит флаг", async () => {
    renderNotice("free");
    fireEvent.click(screen.getByRole("button", { name: "Понятно" }));
    expect(localStorage.getItem(SEEN_KEY)).toBe("1");
    // AnimatePresence анимирует выход — ждём фактического удаления из DOM.
    await waitFor(() =>
      expect(screen.queryByText(/Мы обновили бесплатный тариф/)).not.toBeInTheDocument(),
    );
  });
});
