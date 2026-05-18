/**
 * Генератор полного набора favicon'ов из public/favicon.svg.
 *
 * Зачем: одного SVG-favicon недостаточно. WhatsApp/Yandex Webmaster/iOS share
 * preview и старые crawler'ы НЕ поддерживают `rel="icon" type="image/svg+xml"`
 * и идут за стандартными путями /favicon.ico, /apple-touch-icon.png. Если они
 * не существуют — nginx SPA fallback отдаёт HTML вместо иконки, crawler
 * записывает «битый сайт» в свой кеш на 30+ дней. Это причина почему OG-preview
 * не подтягивается ни в Telegram, ни в WhatsApp, ни в Yandex.
 *
 * Запуск: npx tsx scripts/generate-favicons.ts
 * Или при правке favicon.svg: npm run build:favicons
 *
 * Генерируем (сохраняются в public/, попадают в build через Vite):
 *   - favicon.ico       — multi-size (16, 32, 48) ICO, legacy браузеры и default crawler path
 *   - favicon-16x16.png — для совместимости
 *   - favicon-32x32.png — для совместимости
 *   - apple-touch-icon.png (180×180) — iOS home screen + WhatsApp share
 *   - android-chrome-192x192.png — Android PWA
 *   - android-chrome-512x512.png — Android splash + PWA install
 *   - site.webmanifest  — PWA manifest для Android/Chrome
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const svgPath = path.join(publicDir, "favicon.svg");

// SVG в нашем favicon содержит <animate> — sharp при rasterize возьмёт
// начальное состояние (frame 0), что нас устраивает: волны не пустые,
// иконка узнаваема.
const svg = fs.readFileSync(svgPath);

async function png(size: number, outName: string) {
  // density важна для SVG — иначе rasterize при больших размерах теряет качество.
  // 300 dpi даёт чёткое изображение до 512px.
  const buf = await sharp(svg, { density: 300 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, outName), buf);
  console.log(`✓ ${outName} (${size}×${size}, ${(buf.length / 1024).toFixed(1)} KB)`);
  return buf;
}

async function main() {
  console.log(`Reading: ${svgPath}\n`);

  // PNG-варианты разных размеров
  const buf16 = await png(16, "favicon-16x16.png");
  const buf32 = await png(32, "favicon-32x32.png");
  const buf48 = await png(48, "favicon-48x48.png");
  await png(180, "apple-touch-icon.png");
  await png(192, "android-chrome-192x192.png");
  await png(512, "android-chrome-512x512.png");

  // favicon.ico — multi-size ICO (16/32/48). Этим путём идут default-crawler'ы
  // когда в HTML нет нужного <link rel> или они его не парсят.
  const icoBuf = await pngToIco([buf16, buf32, buf48]);
  fs.writeFileSync(path.join(publicDir, "favicon.ico"), icoBuf);
  console.log(`✓ favicon.ico (multi-size 16+32+48, ${(icoBuf.length / 1024).toFixed(1)} KB)`);

  // PWA manifest — Android Chrome + Edge подтягивают для "Add to Home Screen".
  const manifest = {
    name: "Dicto",
    short_name: "Dicto",
    icons: [
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    theme_color: "#c5f014",
    background_color: "#0b0805",
    display: "standalone",
    start_url: "/",
  };
  fs.writeFileSync(
    path.join(publicDir, "site.webmanifest"),
    JSON.stringify(manifest, null, 2),
  );
  console.log(`✓ site.webmanifest`);

  console.log("\n✅ Готово. Не забудь обновить <link> теги в index.html.");
}

main().catch((err) => {
  console.error("generate-favicons failed:", err);
  process.exit(1);
});
