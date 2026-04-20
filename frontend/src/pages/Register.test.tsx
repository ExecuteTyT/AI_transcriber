import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import Register from "./Register";

function renderRegister() {
  return render(
    <BrowserRouter>
      <Register />
    </BrowserRouter>
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
    expect(screen.getByRole("link", { name: "Войти" })).toBeInTheDocument();
  });
});
