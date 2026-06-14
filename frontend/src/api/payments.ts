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

/** Пакеты пополнения кошелька (минуты вне тарифа, не сгорают). */
export const WALLET_PACKS = [
  { code: "w150", minutes: 150, price: 299 },
  { code: "w400", minutes: 400, price: 690 },
  { code: "w1000", minutes: 1000, price: 1490 },
];

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
};
