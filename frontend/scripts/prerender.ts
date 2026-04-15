/**
 * Скрипт пре-рендеринга публичных страниц.
 * Генерирует статический HTML для SEO — поисковые роботы видят контент без JS.
 *
 * Запуск: npx tsx scripts/prerender.ts (после vite build)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Полифиллы для браузерных API, используемых в компонентах (Zustand localStorage и т.д.)
const storage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
  get length() { return storage.size; },
  key: (i: number) => [...storage.keys()][i] ?? null,
};
(globalThis as any).window = globalThis;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");
const serverDistDir = path.resolve(__dirname, "../dist-server");

async function prerender() {
  // Импортируем SSR-модуль, собранный Vite
  const { render } = await import(path.join(serverDistDir, "entry-server.js"));

  // Читаем шаблон HTML из client build
  const template = fs.readFileSync(path.join(distDir, "index.html"), "utf-8");

  // Список статических роутов, которые необходимо пре-рендерить (все публичные страницы)
  const staticRoutes = [
    "/",
    "/pricing",
    "/audio-v-tekst",
    "/video-v-tekst",
    "/nejroset-transkribaciya",
    "/rasshifrovka-golosovyh",
    "/blog",
  ];

  // Динамические роуты блога — собираем из articles.ts
  const { articles } = await import(path.join(serverDistDir, "entry-server.js").replace("entry-server.js", "..") + "/dist-server/entry-server.js");
  // Импорт articles из того же бандла не прямой — лучше собрать slugs вручную
  // Получим slugs из rendered HTML вместо этого
  const blogSlugs = getBlogSlugs();

  const allRoutes = [
    ...staticRoutes,
    ...blogSlugs.map((slug: string) => `/blog/${slug}`),
  ];

  console.log(`Pre-rendering ${allRoutes.length} pages...`);

  for (const route of allRoutes) {
    const { html: appHtml, helmet } = render(route);

    let page = template;

    // Вставляем отрендеренный HTML в div#root
    page = page.replace(
      '<div id="root"></div>',
      `<div id="root">${appHtml}</div>`
    );

    // Обновляем мета-теги из Helmet
    if (helmet) {
      const titleStr = helmet.title?.toString() || "";
      const metaStr = helmet.meta?.toString() || "";
      const linkStr = helmet.link?.toString() || "";

      if (titleStr) {
        page = page.replace(/<title>.*?<\/title>/, titleStr);
      }
      if (metaStr) {
        // Вставляем дополнительные meta-теги перед </head>
        page = page.replace("</head>", `${metaStr}\n</head>`);
      }
      if (linkStr) {
        // Обновляем canonical и добавляем link-теги
        page = page.replace(
          /<link rel="canonical"[^>]*>/,
          linkStr.includes('rel="canonical"') ? linkStr.match(/<link[^>]*rel="canonical"[^>]*>/)?.[0] || "" : '<link rel="canonical" href="https://dicto.pro/" />'
        );
      }
    }

    // Определяем путь для записи файла
    const filePath =
      route === "/"
        ? path.join(distDir, "index.html")
        : path.join(distDir, route, "index.html");

    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, page);
    console.log(`  ✓ ${route}`);
  }

  // Генерируем sitemap.xml
  generateSitemap(allRoutes);

  console.log(`\nDone! ${allRoutes.length} pages pre-rendered + sitemap.xml generated.`);
}

function getBlogSlugs(): string[] {
  // Читаем slugs из исходного articles.ts (парсим регуляркой — быстро и надёжно)
  const articlesFile = fs.readFileSync(
    path.resolve(__dirname, "../src/pages/blog/articles.ts"),
    "utf-8"
  );
  const slugs: string[] = [];
  const regex = /slug:\s*"([^"]+)"/g;
  let match;
  while ((match = regex.exec(articlesFile)) !== null) {
    slugs.push(match[1]);
  }
  return slugs;
}

function generateSitemap(routes: string[]) {
  const baseUrl = "https://dicto.pro";
  const today = new Date().toISOString().split("T")[0];

  const urls = routes
    .map((route) => {
      const loc = route === "/" ? baseUrl + "/" : baseUrl + route;
      const priority = route === "/" ? "1.0" : route.startsWith("/blog/") ? "0.7" : "0.8";
      const changefreq = route.startsWith("/blog") ? "weekly" : "monthly";
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
    .join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  fs.writeFileSync(path.join(distDir, "sitemap.xml"), sitemap);
  console.log("  ✓ sitemap.xml");
}

prerender().catch((err) => {
  console.error("Pre-render failed:", err);
  process.exit(1);
});
