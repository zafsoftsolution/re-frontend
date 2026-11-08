import { describe, expect, it } from "vitest";
import {
  applyFieldChange,
  deriveSlug,
  fillBlankAuto,
  filterSuggestions,
  matchSuggestion,
  type ComboSuggestion,
  type DerivableField,
} from "@/lib/admin/form-derive";

const brandFields: DerivableField[] = [
  { name: "name" },
  { name: "slug", autoFrom: "name" },
  { name: "country" },
];

const brandSlugs: Record<string, string> = { b1: "juki" };
const modelFields: DerivableField[] = [
  { name: "machine_brand" },
  { name: "name" },
  { name: "machine_type" },
  {
    name: "slug",
    autoFrom: ["machine_brand", "name"],
    autoValue: (v) => (v.name ? `${brandSlugs[String(v.machine_brand)] ?? ""} ${String(v.name)}` : ""),
  },
];

function change(
  fields: DerivableField[],
  state: { values: Record<string, unknown>; touched: Record<string, boolean> },
  name: string,
  value: unknown,
  fill?: Record<string, unknown>,
  mode: "create" | "edit" = "create",
) {
  return applyFieldChange({ fields, ...state, mode, name, value, fill });
}

describe("deriveSlug", () => {
  it("kebab-cases ASCII and drops accents", () => {
    expect(deriveSlug("Kansai Special")).toBe("kansai-special");
    expect(deriveSlug("Groz-Beckert ")).toBe("groz-beckert");
    expect(deriveSlug("Dürkopp Adler")).toBe("durkopp-adler");
    expect(deriveSlug("DDL-8700")).toBe("ddl-8700");
  });
});

describe("applyFieldChange", () => {
  it("follows the name until the slug is edited, and clearing hands it back", () => {
    let s = { values: { name: "", slug: "", country: "" }, touched: {} };
    s = change(brandFields, s, "name", "Juki");
    expect(s.values.slug).toBe("juki");
    s = change(brandFields, s, "slug", "juki-jp");
    s = change(brandFields, s, "name", "JUKI Corp");
    expect(s.values.slug).toBe("juki-jp");
    s = change(brandFields, s, "slug", "");
    expect(s.touched.slug).toBe(false);
    s = change(brandFields, s, "name", "Juki");
    expect(s.values.slug).toBe("juki");
  });

  it("fills from a picked suggestion on create, unless the user typed there", () => {
    let s = { values: { name: "", slug: "", country: "" }, touched: {} };
    s = change(brandFields, s, "name", "Siruba", { country: "Taiwan" });
    expect(s.values.country).toBe("Taiwan");
    s = change(brandFields, s, "name", "Jack", { country: "China" });
    expect(s.values.country).toBe("China"); // still untouched → follows
    s = change(brandFields, s, "country", "PRC");
    s = change(brandFields, s, "name", "Zoje", { country: "China" });
    expect(s.values.country).toBe("PRC");
  });

  it("on edit only fills blank fields", () => {
    let s = { values: { name: "Juki", slug: "juki", country: "Nippon" }, touched: { slug: true } };
    s = change(brandFields, s, "name", "Brother", { country: "Japan" }, "edit");
    expect(s.values.country).toBe("Nippon");
    expect(s.values.slug).toBe("juki");
  });

  it("builds brand-model slugs from two sources and fills machine type", () => {
    let s = { values: { machine_brand: "", name: "", machine_type: "lockstitch", slug: "" }, touched: {} };
    s = change(modelFields, s, "machine_brand", "b1");
    expect(s.values.slug).toBe("");
    s = change(modelFields, s, "name", "MO-6814S", { machine_type: "overlock" });
    expect(s.values.slug).toBe("juki-mo-6814s");
    expect(s.values.machine_type).toBe("overlock");
  });
});

describe("fillBlankAuto", () => {
  it("derives a blank slug at submit and keeps a typed one", () => {
    expect(fillBlankAuto(brandFields, { name: "Pegasus", slug: "" }).slug).toBe("pegasus");
    expect(fillBlankAuto(brandFields, { name: "Pegasus", slug: "peg" }).slug).toBe("peg");
    expect(fillBlankAuto(brandFields, { name: "", slug: "" }).slug).toBe("");
  });
});

describe("suggestions", () => {
  const list: ComboSuggestion[] = [
    { value: "Juki", hint: "Japan", disabledReason: "Already added" },
    { value: "Brother", hint: "Japan" },
    { value: "Kansai Special", hint: "Japan" },
    { value: "Jack", hint: "China" },
  ];

  it("filters by text, ignoring punctuation, pickable first", () => {
    expect(filterSuggestions(list, "").map((s) => s.value)).toEqual([
      "Brother", "Kansai Special", "Jack", "Juki",
    ]);
    expect(filterSuggestions(list, "kansaisp").map((s) => s.value)).toEqual(["Kansai Special"]);
    expect(filterSuggestions(list, "china").map((s) => s.value)).toEqual(["Jack"]);
    // an exact pick still shows the whole list (to change it)
    expect(filterSuggestions(list, "Brother")).toHaveLength(4);
  });

  it("matches typed names exactly, never a disabled one", () => {
    expect(matchSuggestion(list, " brother ")?.value).toBe("Brother");
    expect(matchSuggestion(list, "Juki")).toBeUndefined();
    expect(matchSuggestion(list, "Bro")).toBeUndefined();
  });
});
