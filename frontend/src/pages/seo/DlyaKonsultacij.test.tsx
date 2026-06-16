import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { describe, it, expect } from "vitest";
import DlyaKonsultacij from "./DlyaKonsultacij";

describe("DlyaKonsultacij landing", () => {
  it("рендерится без падения и содержит оффер клина 1:1", () => {
    render(
      <HelmetProvider>
        <BrowserRouter>
          <DlyaKonsultacij />
        </BrowserRouter>
      </HelmetProvider>,
    );
    expect(
      screen.getByText(/Расшифровка консультаций, звонков и переговоров/),
    ).toBeInTheDocument();
  });
});
