import { describe, expect, it } from "vitest";
import { resolveRobots } from "next/dist/build/webpack/loaders/metadata/resolve-route-data";
import { robotsRules, siteNoindex } from "@/lib/seo/robots";
import { llmsTxt } from "@/lib/seo/llms";
import { FALLBACK_SETTINGS, mapSettings } from "@/lib/api/mappers";

const SITE = "https://rakibenterprise-bd.com";

/** Google's robots matching: longest matching rule wins, Allow wins ties. */
function allowed(txt: string, agent: string, path: string): boolean {
  const groups = txt.split(/\n\n+/).map((g) => g.split("\n").filter(Boolean));
  const named = groups.find((g) => g.some((l) => l.toLowerCase() === `user-agent: ${agent.toLowerCase()}`));
  const group = named ?? groups.find((g) => g.includes("User-Agent: *"))!;
  let best: { len: number; allow: boolean } | null = null;
  for (const line of group) {
    const m = /^(Allow|Disallow): (.*)$/.exec(line);
    if (!m) continue;
    const re = new RegExp("^" + m[2].replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*"));
    if (!re.test(path)) continue;
    const len = m[2].length;
    const allow = m[1] === "Allow";
    if (!best || len > best.len || (len === best.len && allow)) best = { len, allow };
  }
  return best ? best.allow : true;
}

describe("robots.txt", () => {
  const txt = resolveRobots(robotsRules(SITE, { noindex: false }));

  it("points at the sitemap index and host", () => {
    expect(txt).toContain(`Sitemap: ${SITE}/sitemap.xml`);
    expect(txt).toContain("Host: rakibenterprise-bd.com");
  });

  it.each(["*", "GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"])("%s may crawl canonical pages but not private/utility ones", (ua) => {
    if (ua !== "*") expect(txt).toContain(`User-Agent: ${ua}`);
    for (const p of [
      "/",
      "/bn",
      "/machines/juki/juki-ddl-8700",
      "/parts/organ-db1-14",
      "/categories/needles",
      "/categories/needles?page=2",
      "/rfq",
      "/guides/genuine-vs-compatible-parts",
      "/_next/image?url=%2Fx.png&w=640&q=75",
      "/_next/static/chunks/a.js",
      "/sitemap.xml",
      "/llms.txt",
    ]) {
      expect(allowed(txt, ua, p), `${ua} ${p}`).toBe(true);
    }
    for (const p of [
      "/admin",
      "/admin/login",
      "/api/rfq",
      "/search?q=x",
      "/bn/search",
      "/cart",
      "/checkout/success",
      "/rfq/sent",
      "/bn/rfq/sent",
      "/categories/needles?brand=organ",
      "/brands/organ?sort=newest",
      "/categories/needles?page=2&stock=1",
    ]) {
      expect(allowed(txt, ua, p), `${ua} ${p}`).toBe(false);
    }
  });

  it("noindex switch blocks everything", () => {
    const off = resolveRobots(robotsRules(SITE, { noindex: true }));
    expect(off).toContain("User-Agent: *\nDisallow: /\n");
    expect(off).not.toContain("Sitemap:");
    expect(siteNoindex("noindex,nofollow")).toBe(true);
    expect(siteNoindex("NOINDEX")).toBe(true);
    expect(siteNoindex("index,follow")).toBe(false);
    expect(siteNoindex("")).toBe(false);
  });
});

describe("settings: seo / verification / analytics", () => {
  it("maps the bootstrap blocks", () => {
    const s = mapSettings({
      site_name: "Rakib Enterprise",
      og_image_url: "https://x/og.png",
      seo: { title: "T", description: "D", default_robots: "noindex,nofollow", twitter_handle: "rakib" },
      verification: { google: "g-token", bing: "b-token" },
      analytics: { ga4_measurement_id: "G-ABC123", gtm_container_id: "GTM-XYZ12" },
    });
    expect(s.seo).toEqual({ title: "T", description: "D", defaultRobots: "noindex,nofollow", twitterHandle: "rakib", ogImageUrl: "https://x/og.png" });
    expect(s.verification).toEqual({ google: "g-token", bing: "b-token", pinterest: "", facebook: "" });
    expect(s.analytics).toEqual({ ga4: "G-ABC123", gtm: "GTM-XYZ12" });
  });

  it("drops analytics ids that are not the documented shape", () => {
    const s = mapSettings({ analytics: { ga4_measurement_id: "G-1');alert(1)//", gtm_container_id: "UA-123" } });
    expect(s.analytics).toEqual({ ga4: "", gtm: "" });
    expect(FALLBACK_SETTINGS.analytics).toEqual({ ga4: "", gtm: "" });
  });
});

describe("llms.txt", () => {
  const boot = {
    settings: { ...FALLBACK_SETTINGS, contactPhone: "01711-000000", whatsappNumber: "01711-000000", social: { facebook: "https://facebook.com/rakib", instagram: "", youtube: "" } },
    categories: [{ id: "1", name: "Needles", slug: "needles", image: "", description: "", productCount: 4, isFeatured: false, parentId: "", children: [] }],
    machineBrands: [{ id: "1", name: "Juki", slug: "juki", logo: "", country: "", isFeatured: false, modelCount: 6, description: "" }],
    partsBrands: [],
  };
  const txt = llmsTxt({ siteUrl: SITE, boot: boot as never, guides: [{ slug: "g", title: "Guide", description: "About\nparts" }] });

  it("is markdown with an H1, a summary and absolute links", () => {
    expect(txt.startsWith("# Rakib Enterprise\n\n> ")).toBe(true);
    expect(txt).toContain(`- [Juki parts](${SITE}/machines/juki)`);
    expect(txt).toContain(`- [Needles](${SITE}/categories/needles)`);
    expect(txt).toContain(`- [Request for quotation](${SITE}/rfq)`);
    expect(txt).toContain(`- [Guide](${SITE}/guides/g): About parts`);
    expect(txt).toContain(`Bangla`);
    for (const m of txt.matchAll(/\]\(([^)]+)\)/g)) expect(m[1]).toMatch(/^https:\/\/rakibenterprise-bd\.com\//);
  });

  it("lists only the contact fields that are set", () => {
    expect(txt).toContain("- Phone (mobile): 01711-000000");
    expect(txt).toContain("- VAT registration: BIN 002328131-0401");
    expect(txt).toContain("- Opening hours: Saturday–Thursday 10:00–20:00; Friday closed");
    expect(txt).not.toMatch(/landline|Sales centre/i);
    expect(txt).toContain("- Facebook: https://facebook.com/rakib");
    expect(txt).not.toMatch(/Email:|Address:|Instagram:|Youtube:/);
  });

  it("never mentions prices", () => {
    expect(txt).not.toMatch(/৳|BDT|\bTk\b/);
  });
});
