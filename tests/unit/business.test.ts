import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { FALLBACK_SETTINGS, mapSettings } from "@/lib/api/mappers";
import { BUSINESS, formatPhoneDisplay, isDefaultSalesAddress, mapsSearchUrl, withBusinessDefaults } from "@/config/business";
import { llmsTxt } from "@/lib/seo/llms";

describe("business facts", () => {
  it("formats Bangladesh numbers in the printed style", () => {
    expect(formatPhoneDisplay("+8801711279319")).toBe("+880 1711-279319");
    expect(formatPhoneDisplay("01711279319")).toBe("+880 1711-279319");
    expect(formatPhoneDisplay("01711-279319")).toBe("+880 1711-279319");
    expect(formatPhoneDisplay("+880248036796")).toBe("+880 2-48036796");
    expect(formatPhoneDisplay("02-48036796")).toBe("+880 2-48036796");
    expect(formatPhoneDisplay("+44 20 7946 0000")).toBe("+44 20 7946 0000");
  });

  it("fills empty settings from the verified facts (en + bn)", () => {
    const en = withBusinessDefaults(FALLBACK_SETTINGS, "en");
    expect(en).toMatchObject({
      contactPhone: "+880 1711-279319",
      contactPhoneSecondary: "+880 2-48036796",
      whatsappNumber: "+880 1711-279319",
      contactEmail: "rakibenterprise2020@gmail.com",
      businessAddress: BUSINESS.salesCentre.address.en,
    });
    expect(withBusinessDefaults(FALLBACK_SETTINGS, "bn").businessAddress).toBe(
      "৪ নং এস.এন ম্যানশন (নিচতলা), ১ নং সুপার মার্কেট, কালওয়ালাপাড়া, মিরপুর-১, ঢাকা-১২১৬",
    );
  });

  it("admin values win; the secondary number maps and is optional", () => {
    const admin = mapSettings({
      contact_phone: "01711279319",
      contact_phone_secondary: "+880248036796",
      contact_email: "sales@example.com",
      business_address: "Somewhere else, Dhaka",
    });
    expect(withBusinessDefaults(admin, "en")).toMatchObject({
      contactPhone: "+880 1711-279319",
      contactPhoneSecondary: "+880 2-48036796",
      contactEmail: "sales@example.com",
      businessAddress: "Somewhere else, Dhaka",
    });
    // Older backend without contact_phone_secondary: landline defaulted while the main number is ours…
    expect(withBusinessDefaults(mapSettings({ contact_phone: "+8801711279319" }), "en").contactPhoneSecondary).toBe("+880 2-48036796");
    // …but never paired with a different main number.
    expect(withBusinessDefaults(mapSettings({ contact_phone: "01811000000" }), "en").contactPhoneSecondary).toBe("");
  });

  it("recognises the default address however it is wrapped", () => {
    expect(isDefaultSalesAddress("4 No. S.N Mansion (Ground Floor),\n1 No. Super Market, Kalwalapara, Mirpur-1, Dhaka-1216")).toBe(true);
    expect(isDefaultSalesAddress("Shop 9, New Market")).toBe(false);
    expect(mapsSearchUrl("A  B")).toBe("https://www.google.com/maps/search/?api=1&query=A%20B");
  });

  it("llms.txt carries both phones, WhatsApp, email, address, hours and BIN", () => {
    const txt = llmsTxt({
      siteUrl: "https://rakibenterprise-bd.com",
      boot: { settings: withBusinessDefaults(FALLBACK_SETTINGS, "en"), categories: [], machineBrands: [], partsBrands: [] },
      guides: [],
    });
    for (const s of [
      "- Phone (mobile): +880 1711-279319",
      "- Phone (landline): +880 2-48036796",
      "- WhatsApp: +880 1711-279319",
      "- Email: rakibenterprise2020@gmail.com",
      `- Sales centre (walk-in): ${BUSINESS.salesCentre.address.en}`,
      "- VAT registration: BIN 002328131-0401",
    ])
      expect(txt).toContain(s);
  });

  it("never publishes private or unconfirmed facts", () => {
    const sources = [
      JSON.stringify(BUSINESS),
      readFileSync("messages/en.json", "utf8"),
      readFileSync("messages/bn.json", "utf8"),
    ].join("\n");
    // Other company's BIN, sole-agency claim, founding year, e-TIN / NID mentions.
    expect(sources).not.toMatch(/002659038|sole agen|MEISD|since 2019|foundingDate|e-?TIN|\bNID\b/i);
  });
});
