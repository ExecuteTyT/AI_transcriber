import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
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
    <HelmetProvider>
      <BrowserRouter>
        <Upload />
      </BrowserRouter>
    </HelmetProvider>
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

  it("shows URL input on URL tab for Free users (no longer plan-gated)", async () => {
    renderUpload();
    fireEvent.click(screen.getByRole("button", { name: /Ссылка/ }));
    expect(await screen.findByLabelText(/Ссылка на видео или аудио/)).toBeInTheDocument();
  });

  it("has language selector", () => {
    renderUpload();
    expect(screen.getByRole("button", { name: /Язык транскрипции/ })).toBeInTheDocument();
  });
});
