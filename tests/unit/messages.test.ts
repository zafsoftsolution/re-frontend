import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

const keys = (o: object, p = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));

describe("messages", () => {
  it("en and bn define the same keys", () => {
    expect(keys(bn).sort()).toEqual(keys(en).sort());
  });
  it("has no empty strings", () => {
    const empty = (o: object): boolean => Object.values(o).some((v) => (typeof v === "string" ? !v.trim() : empty(v)));
    expect(empty(en)).toBe(false);
    expect(empty(bn)).toBe(false);
  });
});
