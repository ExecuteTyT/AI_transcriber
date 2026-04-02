import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import MarkdownContent from "./MarkdownContent";

describe("MarkdownContent", () => {
  it("renders h2 headings", () => {
    render(<MarkdownContent content="## Заголовок" />);
    expect(screen.getByText("Заголовок")).toBeInTheDocument();
    expect(screen.getByText("Заголовок").tagName).toBe("H2");
  });

  it("renders h3 headings", () => {
    render(<MarkdownContent content="### Подзаголовок" />);
    expect(screen.getByText("Подзаголовок")).toBeInTheDocument();
    expect(screen.getByText("Подзаголовок").tagName).toBe("H3");
  });

  it("renders bold text", () => {
    render(<MarkdownContent content="Обычный **жирный** текст" />);
    expect(screen.getByText("жирный").tagName).toBe("STRONG");
  });

  it("renders italic text", () => {
    render(<MarkdownContent content="Обычный *курсив* текст" />);
    expect(screen.getByText("курсив").tagName).toBe("EM");
  });

  it("renders bullet lists", () => {
    render(<MarkdownContent content={"- Первый пункт\n- Второй пункт"} />);
    expect(screen.getByText("Первый пункт")).toBeInTheDocument();
    expect(screen.getByText("Второй пункт")).toBeInTheDocument();
  });

  it("renders checkboxes unchecked", () => {
    render(<MarkdownContent content="- [ ] Задача" />);
    expect(screen.getByText("Задача")).toBeInTheDocument();
  });

  it("renders checkboxes checked", () => {
    render(<MarkdownContent content="- [x] Готово" />);
    expect(screen.getByText("Готово")).toBeInTheDocument();
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("renders paragraphs", () => {
    render(<MarkdownContent content="Просто текст" />);
    expect(screen.getByText("Просто текст").tagName).toBe("P");
  });

  it("handles empty content", () => {
    const { container } = render(<MarkdownContent content="" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders complex markdown", () => {
    const md = `## Саммари

**Ключевой момент**: описание.

### Тема 1
- Пункт один
- Пункт два

### Задачи
- [ ] Сделать A
- [x] Сделать B`;

    render(<MarkdownContent content={md} />);
    expect(screen.getByText("Саммари")).toBeInTheDocument();
    expect(screen.getByText("Тема 1")).toBeInTheDocument();
    expect(screen.getByText("Пункт один")).toBeInTheDocument();
    expect(screen.getByText("Сделать A")).toBeInTheDocument();
  });
});
