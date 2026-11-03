import { describe, expect, it } from "vitest";
import { looksLikePartNumber, normalizePartNumber, toLatinDigits } from "@/lib/part-number";

describe("normalizePartNumber", () => {
  it("folds case, spaces, dashes, dots and slashes", () => {
    const key = "B1101012000";
    expect(normalizePartNumber("B1101-012-000")).toBe(key);
    expect(normalizePartNumber("b1101 012 000")).toBe(key);
    expect(normalizePartNumber(" B1101.012.000 ")).toBe(key);
    expect(normalizePartNumber("B1101/012_000")).toBe(key);
  });

  it("converts Bangla digits and full-width characters", () => {
    expect(toLatinDigits("১১০-৪৫০০০")).toBe("110-45000");
    expect(normalizePartNumber("১১০-৪৫০০০")).toBe("11045000");
    expect(normalizePartNumber("ＤＢｘ１ #１４")).toBe("DBX114");
  });

  it("returns empty for separator-only input", () => {
    expect(normalizePartNumber(" - / . ")).toBe("");
  });
});

describe("looksLikePartNumber", () => {
  it.each(["B1101-012-000", "110-45000", "DB x1 14", "২২৯-১২০১০", "40052399"])("accepts %s", (q) => {
    expect(looksLikePartNumber(q)).toBe(true);
  });
  it.each(["juki needle", "needle 14", "presser foot for ddl-8700", "ab", ""])("rejects %s", (q) => {
    expect(looksLikePartNumber(q)).toBe(false);
  });
});
