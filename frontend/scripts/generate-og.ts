/**
 * Регенерирует public/og-image.png из public/og-image.svg.
 *
 * Зачем: Telegram, Facebook, LinkedIn, WhatsApp, iMessage НЕ поддерживают
 * SVG для OG-превью — молча отбрасывают. Нужен PNG 1200×630.
 *
 * Запуск: npx tsx scripts/generate-og.ts
 * Или при правке SVG: npm run build:og
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const svgPath = path.join(publicDir, "og-image.svg");
const pngPath = path.join(publicDir, "og-image.png");

async function main() {
  const svg = fs.readFileSync(svgPath);
  await sharp(svg, { density: 300 })
    .resize(1200, 630, { fit: "cover" })
    .png({ compressionLevel: 9, quality: 92 })
    .toFile(pngPath);

  const { size } = fs.statSync(pngPath);
  console.log(`✓ ${path.relative(process.cwd(), pngPath)} (${(size / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error("generate-og failed:", err);
  process.exit(1);
});
