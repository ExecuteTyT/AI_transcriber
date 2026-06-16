import api from "./client";

export interface SubscriptionInfo {
  id: string | null;
  plan: string;
  status: string;
  minutes_used: number;
  minutes_limit: number;
  wallet_minutes: number;
  current_period_start: string | null;
  current_period_end: string | null;
}

export interface SubscribeResponse {
  payment_id: string;
  confirmation_url: string;
  status: string;
}

/** Пресет-пакеты пополнения кошелька (минуты вне тарифа, не сгорают). */
export const WALLET_PACKS = [
  { code: "w60", minutes: 60, price: 119 },
  { code: "w150", minutes: 150, price: 269 },
  { code: "w300", minutes: 300, price: 499 },
];

/** Кастомная докупка (слайдер). Должно совпадать с backend app/services/plans.py. */
export const WALLET_CUSTOM = {
  ratePerMin: 2.0,
  min: 30,
  max: 480,
  step: 30,
};

/** Цена кастомной докупки N минут в целых ₽ (синхронно с бэком). */
export function customTopupPrice(minutes: number): number {
  return Math.round(minutes * WALLET_CUSTOM.ratePerMin);
}

export const paymentsApi = {
  async getSubscription(): Promise<SubscriptionInfo> {
    const { data } = await api.get<SubscriptionInfo>("/payments/subscription");
    return data;
  },

  async subscribe(plan: string): Promise<SubscribeResponse> {
    const { data } = await api.post<SubscribeResponse>("/payments/subscribe", {
      plan,
    });
    return data;
  },

  async cancel(): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>("/payments/cancel");
    return data;
  },

  async topupWallet(pack: string): Promise<SubscribeResponse> {
    const { data } = await api.post<SubscribeResponse>("/payments/wallet", {
      pack,
    });
    return data;
  },

  async topupWalletCustom(minutes: number): Promise<SubscribeResponse> {
    const { data } = await api.post<SubscribeResponse>("/payments/wallet", {
      minutes,
    });
    return data;
  },
};
