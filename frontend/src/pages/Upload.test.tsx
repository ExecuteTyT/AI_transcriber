import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/api/transcriptions", () => ({
  transcriptionApi: {
    upload: vi.fn().mockResolvedValue({ data: { id: "1", status: "queued", message: "ok" } }),
    uploadUrl: vi.fn().mockResolvedValue({ data: { id: "1", status: "queued", message: "ok" } }),
  },
}));

vi.mock("@/store/authStore", () => ({
  useAuthStore: () => ({
    user: {
      plan: "free",
      is_admin: false,
      default_language: "auto",
      minutes_used: 0,
      minutes_limit: 30,
    },
  }),
}));

import Upload from "./Upload";

function renderUpload() {
  return render(
    <BrowserRouter>
      <Upload />
    </BrowserRouter>
  );
}

describe("Upload — source tabs (Free user)", () => {
  it("renders both File and URL tabs", () => {
    renderUpload();
    expect(screen.getByRole("button", { name: /Файл/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ссылка/ })).toBeInTheDocument();
  });

  it("shows dropzone by default (File tab)", () => {
    renderUpload();
    expect(screen.getByText(/Перетащите файл сюда/)).toBeInTheDocument();
  });

  it("shows locked state on URL tab for Free users", async () => {
    renderUpload();
    fireEvent.click(screen.getByRole("button", { name: /Ссылка/ }));
    const locked = await screen.findByText(/от тарифа Старт/);
    expect(locked).toBeInTheDocument();
  });

  it("locked CTA links to pricing", async () => {
    renderUpload();
    fireEvent.click(screen.getByRole("button", { name: /Ссылка/ }));
    const cta = await screen.findByText(/Перейти на Старт/);
    expect(cta.closest("a")).toHaveAttribute("href", "/app/pricing");
  });

  it("has language selector", () => {
    renderUpload();
    // Лейбл переделан на mono uppercase «Язык» — не «Язык записи:»
    expect(screen.getByLabelText(/Язык/)).toBeInTheDocument();
  });
});
