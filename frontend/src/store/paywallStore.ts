import { create } from "zustand";

/**
 * Payload поля `detail` в ответе 402 от бэкенда при упоре в лимит.
 * `reason` различает кейсы: no_minutes / file_exceeds_balance / analysis_locked / chat_locked.
 */
export interface PaywallDetail {
  reason: string;
  message: string;
  paths: string[];
  file_minutes?: number;
  available_minutes?: number;
  topup?: {
    shortfall_minutes: number;
    pack: string;
    pack_minutes: number;
    price_rub: number;
  };
}

interface PaywallState {
  open: boolean;
  detail: PaywallDetail | null;
  openPaywall: (detail: PaywallDetail) => void;
  closePaywall: () => void;
}

export const usePaywallStore = create<PaywallState>((set) => ({
  open: false,
  detail: null,
  openPaywall: (detail) => set({ open: true, detail }),
  closePaywall: () => set({ open: false, detail: null }),
}));
