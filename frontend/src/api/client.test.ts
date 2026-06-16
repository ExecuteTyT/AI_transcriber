import { describe, it, expect, beforeEach } from "vitest";
import type { AxiosError } from "axios";
import { maybeOpenPaywall } from "./client";
import { usePaywallStore } from "../store/paywallStore";

function err(status: number, data: unknown): AxiosError {
  return { response: { status, data } } as AxiosError;
}

describe("maybeOpenPaywall (402 интерсептор)", () => {
  beforeEach(() => usePaywallStore.getState().closePaywall());

  it("402 с detail.paths → открывает пейволл, возвращает true", () => {
    const detail = { reason: "no_minutes", message: "Минуты закончились", paths: ["wallet", "pro"] };
    const opened = maybeOpenPaywall(err(402, { detail }));
    expect(opened).toBe(true);
    expect(usePaywallStore.getState().open).toBe(true);
    expect(usePaywallStore.getState().detail).toEqual(detail);
  });

  it("402 без paths → не открывает (false)", () => {
    expect(maybeOpenPaywall(err(402, { detail: "просто строка" }))).toBe(false);
    expect(usePaywallStore.getState().open).toBe(false);
  });

  it("401 → не открывает (false)", () => {
    expect(maybeOpenPaywall(err(401, { detail: { paths: ["wallet"] } }))).toBe(false);
    expect(usePaywallStore.getState().open).toBe(false);
  });
});
