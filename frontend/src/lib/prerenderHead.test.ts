import { describe, it, expect } from "vitest";
import { mergeHead } from "./prerenderHead";

// Шаблон с дефолтными SEO-тегами (как в index.html).
const TEMPLATE = `<!doctype html><html><head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width" />
<title>Дефолтный заголовок</title>
<meta name="description" content="ДЕФОЛТНОЕ описание для всех страниц" />
<meta name="keywords" content="дефолт, ключи" />
<meta property="og:title" content="Дефолтный og:title" />
<meta property="og:description" content="Дефолтный og:description" />
<meta property="og:image" content="https://dicto.pro/og-image.png" />
</head><body><div id="root"></div></body></html>`;

// Вывод react-helmet для конкретной страницы.
const HELMET = {
  title: "<title>Уникальный заголовок страницы</title>",
  meta:
    '<meta data-rh="true" name="description" content="Уникальное описание страницы"/>' +
    '<meta data-rh="true" property="og:title" content="Уникальный og:title"/>' +
    '<meta data-rh="true" property="og:description" content="Уникальный og:description"/>',
  link: "",
};

function count(html: string, re: RegExp): number {
  return (html.match(re) || []).length;
}

describe("mergeHead", () => {
  it("оставляет ровно ОДИН <meta name=description> — уникальный (корень бага дублей)", () => {
    const out = mergeHead(TEMPLATE, HELMET);
    expect(count(out, /<meta[^>]+name="description"/gi)).toBe(1);
    expect(out).toContain("Уникальное описание страницы");
    expect(out).not.toContain("ДЕФОЛТНОЕ описание для всех страниц");
  });

  it("дедуплицирует og:title и og:description, оставляя версии Helmet", () => {
    const out = mergeHead(TEMPLATE, HELMET);
    expect(count(out, /property="og:title"/gi)).toBe(1);
    expect(count(out, /property="og:description"/gi)).toBe(1);
    expect(out).toContain("Уникальный og:description");
    expect(out).not.toContain("Дефолтный og:description");
  });

  it("заменяет <title> на уникальный (без дублей)", () => {
    const out = mergeHead(TEMPLATE, HELMET);
    expect(count(out, /<title>/gi)).toBe(1);
    expect(out).toContain("Уникальный заголовок страницы");
    expect(out).not.toContain("Дефолтный заголовок");
  });

  it("не трогает теги, которых нет в Helmet (og:image, viewport остаются)", () => {
    const out = mergeHead(TEMPLATE, HELMET);
    expect(count(out, /property="og:image"/gi)).toBe(1);
    expect(out).toContain('name="viewport"');
    expect(out).toContain('charset="UTF-8"');
  });

  it("без Helmet-меты возвращает шаблон как есть", () => {
    const out = mergeHead(TEMPLATE, { title: "", meta: "", link: "" });
    expect(out).toBe(TEMPLATE);
  });
});
