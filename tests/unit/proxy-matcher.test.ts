import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// Read the matcher from src/proxy.ts as text (importing it would pull in the
// Next runtime). Next compiles it with path-to-regexp; for this pattern
// (one capture group + lookaheads) that is equivalent to a plain RegExp.
const src = readFileSync(new URL("../../src/proxy.ts", import.meta.url), "utf8");
const literal = /matcher:\s*\[\s*("[^"]+")/.exec(src)?.[1] ?? '""';
const re = new RegExp("^" + (JSON.parse(literal) as string) + "$");

describe("proxy matcher", () => {
  it.each(["/", "/bn", "/bn/machines/juki", "/search", "/administrator-guide", "/apiary"])("runs on %s", (p) => {
    expect(re.test(p)).toBe(true);
  });
  it.each([
    "/admin",
    "/admin/login",
    "/api/health",
    "/api/revalidate",
    "/_next/static/x.js",
    "/_vercel/insights",
    "/sitemap.xml",
    "/sitemap-parts-0.xml",
    "/sitemap/pages.xml",
    "/sitemap/parts-0.xml",
    "/manifest.webmanifest",
    "/robots.txt",
    "/llms.txt",
    "/favicon.ico",
    "/icon.png",
    "/apple-icon.png",
    "/opengraph-image.png",
    "/logo/rakib-enterprise.png",
  ])("skips %s", (p) => {
    expect(re.test(p)).toBe(false);
  });
});
