import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import bn from "../../messages/bn.json";
import { GUIDES } from "@/content/guides";
import { GUIDE_SLUGS, POLICY_SLUGS, SUBPATHS } from "@/content/slugs";

describe("content pages", () => {
  it("guide files match the proxy's slug list", () => {
    expect(GUIDES.map((g) => g.slug)).toEqual([...GUIDE_SLUGS]);
    expect(SUBPATHS.guides).toEqual(GUIDE_SLUGS);
  });

  it("every guide has en + bn with the same block structure", () => {
    for (const g of GUIDES) {
      expect(g.en.title && g.bn.title).toBeTruthy();
      expect(g.en.description.length).toBeLessThanOrEqual(170);
      expect(g.bn.blocks.map((b) => b.t)).toEqual(g.en.blocks.map((b) => b.t));
      const ids = (body: typeof g.en) => body.blocks.flatMap((b) => (b.t === "h2" ? [b.id] : []));
      expect(ids(g.bn)).toEqual(ids(g.en));
      for (const [a, b] of g.en.blocks.map((blk, i) => [blk, g.bn.blocks[i]] as const)) {
        if (a.t === "table" && b.t === "table") expect(b.rows.length).toBe(a.rows.length);
      }
      expect(g.updated >= g.published).toBe(true);
    }
  });

  it("every policy slug has en + bn copy", () => {
    for (const slug of POLICY_SLUGS) {
      const e = (en.policies.items as Record<string, { title: string; sections: unknown[] }>)[slug];
      const b = (bn.policies.items as Record<string, { title: string; sections: unknown[] }>)[slug];
      expect(e?.title && b?.title).toBeTruthy();
      expect(b.sections.length).toBe(e.sections.length);
    }
    expect(Object.keys(en.policies.items).sort()).toEqual([...POLICY_SLUGS].sort());
  });

  it("internal links in content point at real sections", () => {
    const text = JSON.stringify([GUIDES, en.policies, bn.policies, en.delivery]);
    const links = [...text.matchAll(/\]\((\/[^)]*)\)/g)].map((m) => m[1].split("?")[0].split("/")[1]);
    const sections = new Set(["", "rfq", "search", "contact", "policies", "guides", "delivery", "machines", "parts", "categories", "brands"]);
    for (const s of links) expect(sections.has(s)).toBe(true);
  });
});
