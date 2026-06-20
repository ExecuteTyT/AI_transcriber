/**
 * Слияние <head> статического шаблона (index.html) с выводом react-helmet
 * при пре-рендеринге — БЕЗ дублирования тегов.
 *
 * Корень бага «дубли meta-описаний» (Яндекс.Вебмастер, 2026-06): prerender
 * дописывал helmet-мету перед </head>, но одноимённые дефолтные теги шаблона
 * (<meta name="description"> и пр.) оставались. На странице оказывалось два
 * <meta name="description">, и краулер брал ПЕРВЫЙ — дефолтный, одинаковый на
 * всех страницах. Решение: перед вставкой helmet-меты удалить из шаблона все
 * meta с теми же name/property, что выдаёт helmet.
 */
export interface HelmetParts {
  title?: string;
  meta?: string;
  link?: string;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function mergeHead(template: string, helmet: HelmetParts): string {
  let page = template;
  const titleStr = helmet.title || "";
  const metaStr = helmet.meta || "";

  // Заголовок: helmet даёт ровно один <title> — заменяем дефолтный.
  if (titleStr) {
    page = page.replace(/<title>[\s\S]*?<\/title>/, titleStr);
  }

  if (metaStr) {
    // Собираем name/property, которые helmet выдаёт сам.
    const provided = new Set<string>();
    for (const m of metaStr.matchAll(/(?:name|property)="([^"]+)"/g)) {
      provided.add(m[1]);
    }
    // Удаляем из шаблона дефолтные meta с теми же ключами (иначе будет дубль).
    for (const key of provided) {
      const re = new RegExp(
        `\\s*<meta\\b[^>]*\\b(?:name|property)="${escapeRegExp(key)}"[^>]*>`,
        "gi",
      );
      page = page.replace(re, "");
    }
    // Вставляем уникальные helmet-meta перед </head>.
    page = page.replace("</head>", `${metaStr}\n</head>`);
  }

  return page;
}
