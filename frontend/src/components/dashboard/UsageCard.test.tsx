import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { UsageCard } from "./UsageCard";

function renderCard(overrides: Partial<React.ComponentProps<typeof UsageCard>> = {}) {
  return render(
    <BrowserRouter>
      <UsageCard
        minutesUsed={0}
        minutesLimit={30}
        bonusMinutes={180}
        planName="Free"
        totalRecords={0}
        {...overrides}
      />
    </BrowserRouter>
  );
}

describe("UsageCard", () => {
  it("shows bonus chip when bonusMinutes > 0", () => {
    renderCard({ bonusMinutes: 180 });
    expect(screen.getByText(/Бонус/)).toBeInTheDocument();
    expect(screen.getByText(/тратится первым/)).toBeInTheDocument();
  });

  it("hides bonus chip when bonusMinutes = 0", () => {
    renderCard({ bonusMinutes: 0 });
    expect(screen.queryByText(/Бонус/)).not.toBeInTheDocument();
  });

  it("shows plan name", () => {
    renderCard({ planName: "Старт" });
    expect(screen.getAllByText("Старт").length).toBeGreaterThan(0);
  });

  it("shows pricing link", () => {
    renderCard();
    const link = screen.getByText(/Посмотреть тарифы|Апгрейдить план/);
    expect(link.closest("a")).toHaveAttribute("href", "/app/pricing");
  });

  it("shows upgrade CTA when usage >= 80% and no bonus", () => {
    renderCard({ bonusMinutes: 0, minutesUsed: 28, minutesLimit: 30 });
    expect(screen.getByText(/Минуты подходят к концу/)).toBeInTheDocument();
    expect(screen.getByText(/Апгрейдить план/)).toBeInTheDocument();
  });

  it("shows stable state when bonus is available (not warning even at high usage)", () => {
    renderCard({ bonusMinutes: 100, minutesUsed: 28, minutesLimit: 30 });
    expect(screen.getByText(/У вас всё под контролем/)).toBeInTheDocument();
  });
});
