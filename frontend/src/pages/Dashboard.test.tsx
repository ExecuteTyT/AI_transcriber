import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";

// Mock API and store before importing Dashboard
vi.mock("@/api/transcriptions", () => ({
  transcriptionApi: {
    list: vi.fn().mockResolvedValue({ data: { items: [], total: 0 } }),
    delete: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/store/authStore", () => ({
  useAuthStore: () => ({
    user: { name: "Тест", email: "test@test.com", plan: "free", minutes_used: 5, minutes_limit: 15 },
  }),
}));

import Dashboard from "./Dashboard";

function renderDashboard() {
  return render(
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  );
}

describe("Dashboard", () => {
  it("renders greeting with user name", () => {
    renderDashboard();
    // Greeting uses <em> для italic акцента → ищем обе части
    expect(screen.getByText(/Привет,/)).toBeInTheDocument();
    expect(screen.getByText(/Тест/)).toBeInTheDocument();
  });

  it("renders upload button", () => {
    renderDashboard();
    expect(screen.getByText("Загрузить")).toBeInTheDocument();
  });

  it("renders empty state when no transcriptions", async () => {
    renderDashboard();
    // Wait for async loading
    const emptyText = await screen.findByText(/Начните с первой записи/);
    expect(emptyText).toBeInTheDocument();
  });

  it("renders upload file link in empty state", async () => {
    renderDashboard();
    const link = await screen.findByText("Загрузить файл");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/upload");
  });
});
