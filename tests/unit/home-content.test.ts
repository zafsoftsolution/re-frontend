import { describe, expect, it } from "vitest";
import { safeHref } from "@/components/home/content";
import { exampleNumbers } from "@/components/home/data";
import type { PartSummary } from "@/lib/api/types";

describe("home content", () => {
  it("keeps only CTA hrefs that point at real public sections", () => {
    expect(safeHref("/rfq")).toBe("/rfq");
    expect(safeHref("/machines/juki")).toBe("/machines/juki");
    expect(safeHref("/products")).toBeNull(); // fashion-era route
    expect(safeHref("//evil.example")).toBeNull();
    expect(safeHref("https://x.y/")).toBeNull();
    expect(safeHref(undefined)).toBeNull();
  });

  it("picks real, in-stock part numbers for the hero chips", () => {
    const p = (partNumber: string, availability: PartSummary["availability"]) => ({ partNumber, availability }) as PartSummary;
    expect(
      exampleNumbers([p("B9117-012-000", "low_stock"), p("SILICONE-OIL", "in_stock"), p("B1830-227-000", "in_stock"), p("B1830-227-000", "in_stock")]),
    ).toEqual(["B1830-227-000", "B9117-012-000"]);
  });
});
