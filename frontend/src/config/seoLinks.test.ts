import { describe, it, expect } from "vitest";
import { SEO_CLUSTERS } from "./seoLinks";

describe("SEO_CLUSTERS", () => {
  const all = SEO_CLUSTERS.flatMap((c) => c.links);

  it("покрывает все 33 SEO-лендинга", () => {
    expect(all).toHaveLength(33);
  });

  it("все href уникальны", () => {
    const hrefs = all.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("все href — корневые пути", () => {
    for (const l of all) {
      expect(l.href.startsWith("/")).toBe(true);
      expect(l.label.length).toBeGreaterThan(0);
    }
  });

  it("у каждого кластера есть заголовок и ссылки", () => {
    for (const c of SEO_CLUSTERS) {
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.links.length).toBeGreaterThan(0);
    }
  });
});
