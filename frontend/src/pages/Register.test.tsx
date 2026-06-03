import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { describe, it, expect } from "vitest";
import Register from "./Register";

function renderRegister() {
  return render(
    <HelmetProvider>
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    </HelmetProvider>
  );
}

describe("Register page", () => {
  it("renders registration form with labels", () => {
    renderRegister();
    expect(screen.getByLabelText("Имя")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText(/Пароль/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Создать аккаунт/ })).toBeInTheDocument();
  });

  it("renders login link", () => {
    renderRegister();
    // На странице несколько ссылок «Войти» (в общей шапке SiteHeader и в футере
    // формы) — обе ведут на /login. Достаточно, что хотя бы одна присутствует.
    const loginLinks = screen.getAllByRole("link", { name: "Войти" });
    expect(loginLinks.length).toBeGreaterThan(0);
    expect(loginLinks.every((a) => a.getAttribute("href") === "/login")).toBe(true);
  });
});
