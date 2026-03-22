import api from "./client";

export interface SubscriptionInfo {
  id: string | null;
  plan: string;
  status: string;
  minutes_used: number;
  minutes_limit: number;
  current_period_start: string | null;
  current_period_end: string | null;
}

export interface SubscribeResponse {
  payment_id: string;
  confirmation_url: string;
  status: string;
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
};
