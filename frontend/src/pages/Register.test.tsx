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
  it("renders registration form", () => {
    renderRegister();
    expect(screen.getByPlaceholderText("Имя")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Пароль")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Зарегистрироваться" })
    ).toBeInTheDocument();
  });

  it("renders login link", () => {
    renderRegister();
    expect(screen.getByText("Войти")).toBeInTheDocument();
  });
});
