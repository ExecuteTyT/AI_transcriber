import { describe, it, expect, beforeEach } from "vitest";
import { usePaywallStore, type PaywallDetail } from "./paywallStore";

const detail: PaywallDetail = {
  reason: "file_exceeds_balance",
  message: "Файл длиннее остатка",
  paths: ["wallet", "pro"],
  file_minutes: 60,
  available_minutes: 30,
  topup: { shortfall_minutes: 30, pack: "w150", pack_minutes: 150, price_rub: 299 },
};

describe("paywallStore", () => {
  beforeEach(() => usePaywallStore.getState().closePaywall());

  it("стартует закрытым без detail", () => {
    expect(usePaywallStore.getState().open).toBe(false);
    expect(usePaywallStore.getState().detail).toBeNull();
  });

  it("openPaywall открывает и кладёт detail", () => {
    usePaywallStore.getState().openPaywall(detail);
    const s = usePaywallStore.getState();
    expect(s.open).toBe(true);
    expect(s.detail).toEqual(detail);
  });

  it("closePaywall закрывает и сбрасывает detail", () => {
    usePaywallStore.getState().openPaywall(detail);
    usePaywallStore.getState().closePaywall();
    const s = usePaywallStore.getState();
    expect(s.open).toBe(false);
    expect(s.detail).toBeNull();
  });
});
