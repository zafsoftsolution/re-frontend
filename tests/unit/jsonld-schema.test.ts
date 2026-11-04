/**
 * Every JSON-LD builder the pages use, rendered with fixtures, serialised the
 * way <JsonLd> does it, parsed back and checked against the schema.org types
 * and the fields Google's rich-result docs require.
 */
import { describe, expect, it } from "vitest";
import {
  articleJsonLd,
  breadcrumbList,
  itemList,
  ORG_ID,
  organizationJsonLd,
  productJsonLd,
  serializeJsonLd,
  SITE_URL,
  websiteJsonLd,
} from "@/lib/seo/jsonld";
import { mapPartDetail } from "@/lib/api/mappers";
import { GUIDES } from "@/content/guides";
import { FALLBACK_SETTINGS } from "@/lib/api/mappers";
import { BUSINESS, organizationFacts, withBusinessDefaults } from "@/config/business";

type Node = Record<string, unknown>;

const KNOWN_TYPES = new Set([
  "Organization",
  "Store",
  "WebSite",
  "SearchAction",
  "EntryPoint",
  "Product",
  "Brand",
  "Offer",
  "PropertyValue",
  "BreadcrumbList",
  "ListItem",
  "ItemList",
  "Article",
  "WebPage",
  "ImageObject",
  "PostalAddress",
  "ContactPoint",
  "ContactPage",
  "Place",
  "OpeningHoursSpecification",
]);

const isUrl = (v: unknown) => typeof v === "string" && /^https:\/\/[^\s]+$/.test(v);
const isIsoDate = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) && !Number.isNaN(Date.parse(v));

/** Round-trip through the <script> serialiser (must stay valid JSON). */
const roundTrip = (data: unknown): Node => JSON.parse(serializeJsonLd(data)) as Node;

/** Problems with one node (recurses into nested typed nodes). */
function validate(node: Node, path = "$"): string[] {
  const out: string[] = [];
  const req = (cond: boolean, msg: string) => cond || out.push(`${path}: ${msg}`);
  const type = node["@type"];
  if (node["@graph"]) {
    (node["@graph"] as Node[]).forEach((n, i) => out.push(...validate(n, `${path}.@graph[${i}]`)));
    return out;
  }
  if (type === undefined) return out; // a bare reference like {"@id": …}
  req(typeof type === "string" && KNOWN_TYPES.has(type), `unknown @type ${String(type)}`);
  switch (type) {
    case "Organization":
      req(typeof node.name === "string" && node.name !== "", "name");
      if (node["@id"] === ORG_ID && path.includes("@graph")) {
        req(isUrl(node.url), "url");
        req(isUrl((node.logo as Node)?.url), "logo.url");
      }
      break;
    case "Store":
      req(typeof node.name === "string", "name");
      req(isUrl(node.url), "url");
      req(isUrl(node.image), "image");
      break;
    case "WebSite": {
      req(isUrl(node.url), "url");
      const action = node.potentialAction as Node;
      req(action?.["@type"] === "SearchAction", "SearchAction");
      req(String((action?.target as Node)?.urlTemplate).includes("{search_term_string}"), "urlTemplate placeholder");
      req(action?.["query-input"] === "required name=search_term_string", "query-input");
      break;
    }
    case "Product":
      req(typeof node.name === "string" && node.name !== "", "name");
      if (path === "$") req(isUrl(node.url), "url"); // nested = a compatible machine
      if (node.offers) {
        const o = node.offers as Node;
        req(/^\d+\.\d{2}$/.test(String(o.price)), "offers.price");
        req(o.priceCurrency === "BDT", "offers.priceCurrency");
        req(String(o.availability).startsWith("https://schema.org/"), "offers.availability");
      }
      break;
    case "BreadcrumbList":
    case "ItemList": {
      const items = node.itemListElement as Node[];
      req(Array.isArray(items) && items.length > 0, "itemListElement");
      items?.forEach((it, i) => {
        req(it["@type"] === "ListItem", `item ${i} type`);
        req(it.position === i + 1, `item ${i} position`);
        req(typeof it.name === "string" && it.name !== "", `item ${i} name`);
        req(isUrl(type === "BreadcrumbList" ? it.item : it.url), `item ${i} url`);
      });
      break;
    }
    case "Article":
      req(typeof node.headline === "string" && (node.headline as string).length <= 110, "headline <= 110");
      req(isIsoDate(node.datePublished), "datePublished");
      req(isIsoDate(node.dateModified), "dateModified");
      req(Array.isArray(node.image) && (node.image as unknown[]).every(isUrl), "image");
      req(Boolean((node.author as Node)?.name), "author.name");
      req(isUrl(((node.publisher as Node)?.logo as Node)?.url), "publisher.logo");
      break;
  }
  for (const [k, v] of Object.entries(node)) {
    if (v && typeof v === "object" && !Array.isArray(v) && (v as Node)["@type"]) out.push(...validate(v as Node, `${path}.${k}`));
    if (Array.isArray(v)) v.forEach((x, i) => x && typeof x === "object" && (x as Node)["@type"] && out.push(...validate(x as Node, `${path}.${k}[${i}]`)));
  }
  return out;
}

const RAW_PART = {
  slug: "organ-db1-14",
  name: "Organ DBx1 #14 needle",
  sku: "RE-DBX1-14",
  part_number: "DBX1-14-ORG",
  alt_part_numbers: ["DB1-14"],
  category: { slug: "needles", name: "Needles", parent: null },
  brand: { slug: "organ", name: "Organ", is_oem: false },
  images: ["https://api.rakibenterprise-bd.com/media/p/needle.jpg"],
  short_description: "100 pcs </script><script>alert(1)</script>",
  availability: "in_stock",
  currency: "BDT",
  machine_models: [{ slug: "juki-ddl-8700", name: "DDL-8700", machine_brand_slug: "juki", machine_brand_name: "Juki" }],
};

describe("site-wide: Organization + Store", () => {
  it("full settings", () => {
    const ld = roundTrip(
      organizationJsonLd({
        name: "Rakib Enterprise",
        description: "Spare parts",
        logoUrl: "https://api.rakibenterprise-bd.com/media/logo.png",
        telephone: "01711-000000",
        email: "sales@rakibenterprise-bd.com",
        address: "Shop 12,\n  Nawabpur Road, Dhaka",
        social: { facebook: "https://facebook.com/rakib", instagram: "", youtube: "not a url" },
      }),
    );
    expect(validate(ld)).toEqual([]);
    const [org, store] = ld["@graph"] as Node[];
    expect(org).toMatchObject({ "@type": "Organization", "@id": ORG_ID, telephone: "01711-000000", sameAs: ["https://facebook.com/rakib"] });
    expect(store).toMatchObject({
      "@type": "Store",
      parentOrganization: { "@id": ORG_ID },
      address: { "@type": "PostalAddress", streetAddress: "Shop 12, Nawabpur Road, Dhaka", addressCountry: "BD" },
    });
  });

  it("verified business facts (empty admin settings → defaults)", () => {
    const s = withBusinessDefaults(FALLBACK_SETTINGS, "en");
    const ld = roundTrip(organizationJsonLd({ name: s.siteName, logoUrl: s.logoUrl, social: s.social, ...organizationFacts(s) }));
    expect(validate(ld)).toEqual([]);
    const [org, store] = ld["@graph"] as Node[];
    const address = {
      "@type": "PostalAddress",
      streetAddress: "4 No. S.N Mansion (Ground Floor), 1 No. Super Market, Kalwalapara",
      addressLocality: "Mirpur-1, Dhaka",
      postalCode: "1216",
      addressRegion: "Dhaka",
      addressCountry: "BD",
    };
    expect(org).toMatchObject({
      name: "Rakib Enterprise",
      legalName: "Rakib Enterprise",
      telephone: ["+8801711279319", "+880248036796"],
      email: "rakibenterprise2020@gmail.com",
      vatID: "002328131-0401",
      address,
      contactPoint: { telephone: "+8801711279319" },
    });
    expect((org.location as Node[]).map((l) => (l.address as Node).streetAddress)).toEqual([
      address.streetAddress,
      "23 Chowdhury Mansion (1st Floor)",
    ]);
    expect(store).toMatchObject({
      "@type": "Store",
      telephone: ["+8801711279319", "+880248036796"],
      vatID: "002328131-0401",
      address,
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
          opens: "10:00",
          closes: "20:00",
        },
      ],
    });
    const json = JSON.stringify(ld);
    expect(json).not.toMatch(/foundingDate|founder|employee|2019|002659038/);
  });

  it("admin-edited address stays free text", () => {
    const s = withBusinessDefaults({ ...FALLBACK_SETTINGS, business_address: "", businessAddress: "Shop 9, New Market, Dhaka" } as never, "en");
    const [, store] = roundTrip(organizationJsonLd({ name: "Rakib Enterprise", ...organizationFacts(s) }))["@graph"] as Node[];
    expect(store.address).toEqual({ "@type": "PostalAddress", streetAddress: "Shop 9, New Market, Dhaka", addressCountry: "BD" });
    expect(BUSINESS.salesCentre.postal.postalCode).toBe("1216");
  });

  it("empty settings: nothing invented", () => {
    const ld = roundTrip(organizationJsonLd({ name: "Rakib Enterprise", telephone: "", email: "", address: "", social: { facebook: "" } }));
    expect(validate(ld)).toEqual([]);
    const json = JSON.stringify(ld);
    expect(json).not.toMatch(/telephone|email|address|sameAs|contactPoint/);
    expect((ld["@graph"] as Node[])[0].logo).toEqual({ "@type": "ImageObject", url: `${SITE_URL}/logo/rakib-enterprise.png` });
  });
});

describe("Home: WebSite + SearchAction", () => {
  it.each(["en", "bn"])("%s", (locale) => {
    const base = locale === "en" ? SITE_URL : `${SITE_URL}/bn`;
    const ld = roundTrip(websiteJsonLd({ name: "Rakib Enterprise", url: locale === "en" ? `${SITE_URL}/` : base, searchUrl: `${base}/search`, locale }));
    expect(validate(ld)).toEqual([]);
    expect((ld.potentialAction as Node).target).toEqual({ "@type": "EntryPoint", urlTemplate: `${base}/search?q={search_term_string}` });
  });
});

describe("Part: Product (+ BreadcrumbList)", () => {
  const url = `${SITE_URL}/parts/organ-db1-14`;
  it("quote part: valid, no offers, script-safe", () => {
    const part = mapPartDetail({ ...RAW_PART, price: null, sales_mode: "quote" })!;
    const raw = serializeJsonLd(productJsonLd(part, { url, compatibleWith: ["Juki DDL-8700"] }));
    expect(raw).not.toContain("</script>");
    const ld = JSON.parse(raw) as Node;
    expect(validate(ld)).toEqual([]);
    expect(ld).not.toHaveProperty("offers");
    expect(ld.isAccessoryOrSparePartFor).toEqual([{ "@type": "Product", name: "Juki DDL-8700" }]);
  });
  it("direct part: Offer in BDT", () => {
    const part = mapPartDetail({ ...RAW_PART, price: "520.00", sales_mode: "direct" })!;
    const ld = roundTrip(productJsonLd(part, { url }));
    expect(validate(ld)).toEqual([]);
    expect(ld.offers).toMatchObject({ "@type": "Offer", price: "520.00", priceCurrency: "BDT" });
  });
  it("breadcrumbs", () => {
    const ld = roundTrip(
      breadcrumbList([
        { name: "Home", url: `${SITE_URL}/` },
        { name: "Part types", url: `${SITE_URL}/categories` },
        { name: "Needles", url: `${SITE_URL}/categories/needles` },
        { name: "DBX1-14-ORG", url },
      ]),
    );
    expect(validate(ld)).toEqual([]);
  });
});

describe("Model / listings: ItemList", () => {
  it("parts of a machine model", () => {
    const ld = roundTrip(
      itemList(
        [
          { name: "Needle", url: `${SITE_URL}/parts/a` },
          { name: "Hook", url: `${SITE_URL}/parts/b` },
        ],
        "Juki DDL-8700 parts",
      ),
    );
    expect(validate(ld)).toEqual([]);
    expect(ld.numberOfItems).toBe(2);
  });
});

describe("Guide: Article", () => {
  it.each(GUIDES.flatMap((g) => (["en", "bn"] as const).map((l) => [g.slug, l] as const)))("%s (%s)", (slug, locale) => {
    const g = GUIDES.find((x) => x.slug === slug)!;
    const ld = roundTrip(
      articleJsonLd({
        headline: g[locale].title,
        description: g[locale].description,
        url: `${SITE_URL}${locale === "bn" ? "/bn" : ""}/guides/${slug}`,
        locale,
        published: g.published,
        modified: g.updated,
        publisher: "Rakib Enterprise",
      }),
    );
    expect(validate(ld)).toEqual([]);
  });
});

describe("validator sanity", () => {
  it("catches bad nodes", () => {
    expect(validate({ "@type": "Prodcut", name: "x" })).toEqual(["$: unknown @type Prodcut"]);
    expect(validate(breadcrumbList([{ name: "", url: "/relative" }]))).toEqual(["$: item 0 name", "$: item 0 url"]);
  });
});
