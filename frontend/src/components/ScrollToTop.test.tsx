import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import ScrollToTop from "./ScrollToTop";

function Harness({ to }: { to: string }) {
  const navigate = useNavigate();
  return <button onClick={() => navigate(to)}>go</button>;
}

function renderApp(to: string) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <ScrollToTop />
      <Harness to={to} />
      <Routes>
        <Route path="/" element={<div>home</div>} />
        <Route path="/pricing" element={<div>pricing</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ScrollToTop", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  });

  it("прокручивает наверх при PUSH-навигации на новый путь", () => {
    renderApp("/pricing");
    (window.scrollTo as unknown as ReturnType<typeof vi.fn>).mockClear();
    fireEvent.click(screen.getByText("go"));
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("не трогает скролл при переходе на путь с #hash", () => {
    renderApp("/pricing#faq");
    (window.scrollTo as unknown as ReturnType<typeof vi.fn>).mockClear();
    fireEvent.click(screen.getByText("go"));
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
