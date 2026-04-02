import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";

// Mock non-admin user
vi.mock("@/store/authStore", () => ({
  useAuthStore: () => ({
    user: { name: "User", email: "user@test.com", plan: "free", is_admin: false, minutes_used: 0, minutes_limit: 15 },
  }),
}));

vi.mock("@/api/client", () => ({
  default: { get: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import Admin from "./Admin";

describe("Admin page", () => {
  it("shows access denied for non-admin users", () => {
    render(
      <BrowserRouter>
        <Admin />
      </BrowserRouter>
    );
    expect(screen.getByText("Доступ запрещён")).toBeInTheDocument();
    expect(screen.getByText(/У вас нет прав администратора/)).toBeInTheDocument();
  });

  it("shows back to dashboard link for non-admin", () => {
    render(
      <BrowserRouter>
        <Admin />
      </BrowserRouter>
    );
    expect(screen.getByText("К транскрипциям")).toBeInTheDocument();
  });
});
