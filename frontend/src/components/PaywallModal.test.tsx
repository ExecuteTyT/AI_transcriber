import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { topupWallet, subscribe, reachGoal } = vi.hoisted(() => ({
  topupWallet: vi.fn(),
  subscribe: vi.fn(),
  reachGoal: vi.fn(),
}));

vi.mock("@/api/payments", () => ({
  paymentsApi: { topupWallet, subscribe },
  WALLET_PACKS: [
    { code: "w60", minutes: 60, price: 119 },
    { code: "w150", minutes: 150, price: 269 },
    { code: "w300", minutes: 300, price: 499 },
  ],
}));
vi.mock("@/lib/metrika", () => ({ reachGoal }));

import PaywallModal from "./PaywallModal";
import { usePaywallStore, type PaywallDetail } from "@/store/paywallStore";

// jsdom падает на присвоении location.href ("Not implemented: navigation").
// Делаем href записываемым, чтобы редирект после оплаты не ронял тест.
beforeEach(() => {
  topupWallet.mockReset().mockResolvedValue({ confirmation_url: "https://yk/wallet" });
  subscribe.mockReset().mockResolvedValue({ confirmation_url: "https://yk/pro" });
  reachGoal.mockClear();
  usePaywallStore.getState().closePaywall();
  Object.defineProperty(window, "location", { value: { href: "" }, writable: true });
});

const open = (d: PaywallDetail) => act(() => usePaywallStore.getState().openPaywall(d));

describe("PaywallModal", () => {
  it("не рендерится, пока закрыт", () => {
    render(<PaywallModal />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("кейс file_exceeds_balance: показывает рекомендованный пакет и шлёт paywall_hit", () => {
    render(<PaywallModal />);
    open({
      reason: "file_exceeds_balance", message: "Файл длиннее остатка", paths: ["wallet", "pro"],
      file_minutes: 60, available_minutes: 30,
      topup: { shortfall_minutes: 30, pack: "w150", pack_minutes: 150, price_rub: 299 },
    });
    expect(screen.getByRole("button", { name: /Пополнить на 150 мин — 299 ₽/ })).toBeInTheDocument();
    expect(reachGoal).toHaveBeenCalledWith("paywall_hit", { reason: "file_exceeds_balance" });
  });

  it("клик по пополнению → topupWallet(pack) + checkout_started", async () => {
    render(<PaywallModal />);
    open({
      reason: "file_exceeds_balance", message: "x", paths: ["wallet", "pro"],
      file_minutes: 60, available_minutes: 30,
      topup: { shortfall_minutes: 30, pack: "w150", pack_minutes: 150, price_rub: 299 },
    });
    fireEvent.click(screen.getByRole("button", { name: /Пополнить на 150 мин/ }));
    await waitFor(() => expect(topupWallet).toHaveBeenCalledWith("w150"));
    expect(reachGoal).toHaveBeenCalledWith(
      "checkout_started",
      expect.objectContaining({ source: "paywall", kind: "topup", pack: "w150" }),
    );
  });

  it("без topup (no_minutes) показывает все 3 пакета кошелька + Pro", () => {
    render(<PaywallModal />);
    open({ reason: "no_minutes", message: "Минуты закончились", paths: ["wallet", "pro"] });
    expect(screen.getByRole("button", { name: /60 мин/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /150 мин/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /300 мин/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Оформить Pro/ })).toBeInTheDocument();
  });

  it("клик по Pro → subscribe('pro')", async () => {
    render(<PaywallModal />);
    open({ reason: "chat_locked", message: "Чат на Pro", paths: ["wallet", "pro"] });
    fireEvent.click(screen.getByRole("button", { name: /Оформить Pro/ }));
    await waitFor(() => expect(subscribe).toHaveBeenCalledWith("pro"));
  });
});
