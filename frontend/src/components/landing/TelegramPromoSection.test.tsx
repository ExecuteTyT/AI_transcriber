import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const { reachGoal } = vi.hoisted(() => ({ reachGoal: vi.fn() }));
vi.mock("@/lib/metrika", () => ({ reachGoal }));

import TelegramPromoSection from "./TelegramPromoSection";

describe("TelegramPromoSection", () => {
  it("рендерит CTA на бота и шлёт цель telegram_bot_click", () => {
    render(<TelegramPromoSection />);
    const link = screen.getByRole("link", { name: /Открыть бота/ });
    expect(link).toHaveAttribute("href", expect.stringContaining("t.me/"));
    fireEvent.click(link);
    expect(reachGoal).toHaveBeenCalledWith("telegram_bot_click", { source: "landing" });
  });
});
