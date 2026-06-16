import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }));

vi.mock("@/api/client", () => ({ default: { get: apiGet, patch: vi.fn(), delete: vi.fn() } }));
vi.mock("@/store/authStore", () => ({
  useAuthStore: () => ({ user: { is_admin: true } }),
}));

import Admin from "./Admin";

const STATS = {
  total_users: 10, total_transcriptions: 20, total_analyses: 5, total_minutes_used: 600,
  users_by_plan: { free: 8, pro: 2 }, transcriptions_by_status: { completed: 20 },
  users_today: 1, transcriptions_today: 2, periods: {}, repeat_users: 0,
};

const FINANCE_OVERVIEW = {
  mrr_rub: 990, paying_users: 1, arpu_rub: 990, churn_pct: 12.5,
  revenue: {
    today: { subscriptions: 0, wallet: 0, total: 0 },
    last_7d: { subscriptions: 990, wallet: 299, total: 1289 },
    last_30d: { subscriptions: 990, wallet: 299, total: 1289 },
    all: { subscriptions: 990, wallet: 299, total: 1289 },
  },
};

const PAYMENTS = {
  items: [
    { date: "2026-06-16T10:00:00Z", email: "payer@test.com", type: "subscription", item: "pro", amount_rub: 990, status: "active", yookassa_id: "yk-1" },
    { date: "2026-06-16T11:00:00Z", email: "payer@test.com", type: "wallet", item: "w150 (150 мин)", amount_rub: 299, status: "succeeded", yookassa_id: "yk-2" },
  ],
  total: 2, page: 1, per_page: 50,
};

const WALLETS = [
  { email: "payer@test.com", wallet_minutes: 150, topup_count: 1, total_topped_up_min: 150, total_paid_rub: 299, last_topup: "2026-06-16T11:00:00Z" },
];

beforeEach(() => {
  apiGet.mockReset();
  apiGet.mockImplementation((url: string) => {
    if (url === "/admin/stats") return Promise.resolve({ data: STATS });
    if (url === "/admin/stats/timeseries") return Promise.resolve({ data: [] });
    if (url === "/admin/finance/overview") return Promise.resolve({ data: FINANCE_OVERVIEW });
    if (url === "/admin/finance/timeseries") return Promise.resolve({ data: [] });
    if (url === "/admin/finance/payments") return Promise.resolve({ data: PAYMENTS });
    if (url === "/admin/finance/wallets") return Promise.resolve({ data: WALLETS });
    return Promise.resolve({ data: {} });
  });
});

function renderAdmin() {
  return render(
    <HelmetProvider>
      <BrowserRouter>
        <Admin />
      </BrowserRouter>
    </HelmetProvider>,
  );
}

describe("Admin — вкладка Финансы", () => {
  it("рендерит KPI, ленту платежей и балансы кошельков", async () => {
    renderAdmin();
    fireEvent.click(await screen.findByRole("button", { name: "Финансы" }));

    // KPI
    await waitFor(() => expect(screen.getByText("MRR")).toBeInTheDocument());
    expect(screen.getByText("12.5%")).toBeInTheDocument();

    // Лента платежей: оба типа
    expect(screen.getByText("Подписка")).toBeInTheDocument();
    expect(screen.getByText("w150 (150 мин)")).toBeInTheDocument();
    expect(screen.getAllByText("payer@test.com").length).toBeGreaterThan(0);
  });
});
