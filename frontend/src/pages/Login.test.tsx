import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import Login from "./Login";

function renderLogin() {
  return render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  );
}

describe("Login page", () => {
  it("renders login form with labels", () => {
    renderLogin();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Пароль")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Войти" })).toBeInTheDocument();
  });

  it("renders registration link", () => {
    renderLogin();
    expect(screen.getByText("Зарегистрироваться")).toBeInTheDocument();
  });

  it("has correct title", () => {
    renderLogin();
    expect(screen.getByText("С возвращением")).toBeInTheDocument();
  });
});
