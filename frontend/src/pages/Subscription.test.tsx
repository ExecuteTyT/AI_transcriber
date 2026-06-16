import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { getSubscription, topupWallet } = vi.hoisted(() => ({
  getSubscription: vi.fn(),
  topupWallet: vi.fn(),
}));

vi.mock("@/api/payments", () => ({
  paymentsApi: { getSubscription, topupWallet, topupWalletCustom: vi.fn(), cancel: vi.fn() },
  WALLET_PACKS: [
    { code: "w60", minutes: 60, price: 119 },
    { code: "w150", minutes: 150, price: 269 },
    { code: "w300", minutes: 300, price: 499 },
  ],
  WALLET_CUSTOM: { ratePerMin: 2.0, min: 30, max: 480, step: 30 },
  customTopupPrice: (m: number) => Math.round(m * 2.0),
}));
vi.mock("@/store/authStore", () => ({
  useAuthStore: () => ({ user: { plan: "free", bonus_minutes: 30 } }),
}));
vi.mock("@/lib/sound", () => ({ useSound: () => ({ play: vi.fn() }) }));
vi.mock("@/lib/metrika", () => ({ reachGoal: vi.fn() }));

import Subscription from "./Subscription";

function renderSub() {
  return render(
    <HelmetProvider>
      <BrowserRouter>
        <Subscription />
      </BrowserRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  topupWallet.mockReset().mockResolvedValue({ confirmation_url: "https://yk/wallet" });
  getSubscription.mockReset().mockResolvedValue({
    id: null, plan: "free", status: "none",
    minutes_used: 0, minutes_limit: 0, wallet_minutes: 250,
    current_period_start: null, current_period_end: null,
  });
  Object.defineProperty(window, "location", {
    value: { href: "", search: "", pathname: "/subscription" }, writable: true,
  });
});

describe("Subscription — кошелёк", () => {
  it("показывает баланс кошелька и 3 пакета", async () => {
    renderSub();
    expect(await screen.findByRole("heading", { name: "Кошелёк" })).toBeInTheDocument();
    expect(screen.getByText("250 мин")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /60 мин/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^150 мин/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /300 мин/ })).toBeInTheDocument();
  });

  it("показывает единый баланс ресурсов (бонус + тариф + кошелёк)", async () => {
    renderSub();
    // bonus 30 + тариф 0 + кошелёк 250 = 280 осталось
    expect(await screen.findByRole("heading", { name: "Ваши минуты" })).toBeInTheDocument();
    expect(screen.getByText("280")).toBeInTheDocument();
    expect(screen.getByText("Бонус")).toBeInTheDocument();
    expect(screen.getByText("По тарифу")).toBeInTheDocument();
  });

  it("клик по пакету вызывает topupWallet", async () => {
    renderSub();
    const btn = await screen.findByRole("button", { name: /300 мин/ });
    fireEvent.click(btn);
    await waitFor(() => expect(topupWallet).toHaveBeenCalledWith("w300"));
  });
});
