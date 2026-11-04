/**
 * schema.org JSON-LD builders for catalogue pages. Pure functions — pages
 * pass absolute URLs (see `absoluteUrl`) and render the result with
 * <JsonLd>. QUOTE-FIRST: a Product only gets `offers` when the part is
 * sold direct with a real price; quote parts never carry a price.
 */
import type { Availability, PartDetail } from "@/lib/api/types";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://rakibenterprise-bd.com").replace(/\/+$/, "");

/** Absolute URL for a locale-prefixed path ("/bn/parts/x" → https://…/bn/parts/x). */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

type Thing = Record<string, unknown>;

export function breadcrumbList(items: { name: string; url: string }[]): Thing {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function itemList(items: { name: string; url: string }[], name?: string): Thing {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    ...(name ? { name } : {}),
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: it.url,
    })),
  };
}

const SCHEMA_AVAILABILITY: Record<Availability, string> = {
  in_stock: "https://schema.org/InStock",
  low_stock: "https://schema.org/LimitedAvailability",
  out_of_stock: "https://schema.org/OutOfStock",
  on_request: "https://schema.org/BackOrder",
  discontinued: "https://schema.org/Discontinued",
};

export function productJsonLd(
  part: Pick<
    PartDetail,
    | "name"
    | "sku"
    | "partNumber"
    | "altPartNumbers"
    | "images"
    | "image"
    | "description"
    | "shortDescription"
    | "brandName"
    | "categoryName"
    | "salesMode"
    | "price"
    | "currency"
    | "availability"
  > & { brand?: { name: string } | null; category?: { name: string } | null },
  opts: { url: string; compatibleWith?: string[] },
): Thing {
  const images = (part.images.length ? part.images : part.image ? [part.image] : []).map(absoluteUrl);
  const brandName = part.brand?.name || part.brandName;
  const description = part.shortDescription || part.description;
  const product: Thing = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: part.name,
    url: opts.url,
    ...(part.partNumber ? { mpn: part.partNumber } : {}),
    ...(part.sku ? { sku: part.sku } : {}),
    ...(brandName ? { brand: { "@type": "Brand", name: brandName } } : {}),
    ...(images.length ? { image: images } : {}),
    ...(description ? { description: description.slice(0, 5000) } : {}),
    ...(part.category?.name || part.categoryName ? { category: part.category?.name || part.categoryName } : {}),
    ...(part.altPartNumbers.length
      ? {
          additionalProperty: part.altPartNumbers.map((v) => ({
            "@type": "PropertyValue",
            name: "Alternative part number",
            value: v,
          })),
        }
      : {}),
    ...(opts.compatibleWith?.length ? { isAccessoryOrSparePartFor: opts.compatibleWith.map((name) => ({ "@type": "Product", name })) } : {}),
  };
  if (part.salesMode === "direct" && part.price !== null && Number.isFinite(part.price)) {
    product.offers = {
      "@type": "Offer",
      url: opts.url,
      price: part.price.toFixed(2),
      priceCurrency: part.currency || "BDT",
      availability: SCHEMA_AVAILABILITY[part.availability],
      itemCondition: "https://schema.org/NewCondition",
    };
  }
  return product;
}

/** JSON for a <script type="application/ld+json">: `<` escaped so content
 *  can never close the script element. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

// ─── Site-wide entities ──────────────────────────────────────────────────────

/** Stable node ids so pages can reference the organisation. */
export const ORG_ID = `${SITE_URL}/#organization`;
export const STORE_ID = `${SITE_URL}/#store`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

const httpUrl = (v: string) => (/^https?:\/\/\S+$/i.test(v.trim()) ? v.trim() : "");

export interface OrgInput {
  name: string;
  description?: string;
  logoUrl?: string;
  telephone?: string;
  email?: string;
  address?: string;
  social?: Record<string, string>;
}

/** Organization + Store (LocalBusiness) as one @graph, from bootstrap
 *  settings. Empty fields are omitted, never invented. */
export function organizationJsonLd(org: OrgInput): Thing {
  const logo = httpUrl(org.logoUrl ?? "") || absoluteUrl("/logo/rakib-enterprise.png");
  const sameAs = Object.values(org.social ?? {}).map(httpUrl).filter(Boolean);
  const telephone = org.telephone?.trim();
  const email = org.email?.trim();
  const address = org.address?.replace(/\s+/g, " ").trim();
  const contact = {
    ...(telephone ? { telephone } : {}),
    ...(email ? { email } : {}),
  };
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: org.name,
        url: absoluteUrl("/"),
        logo: { "@type": "ImageObject", url: logo },
        ...(org.description ? { description: org.description } : {}),
        ...contact,
        ...(sameAs.length ? { sameAs } : {}),
        ...(telephone || email
          ? {
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "sales",
                areaServed: "BD",
                availableLanguage: ["en", "bn"],
                ...contact,
              },
            }
          : {}),
      },
      {
        "@type": "Store",
        "@id": STORE_ID,
        name: org.name,
        url: absoluteUrl("/"),
        image: absoluteUrl("/opengraph-image.png"),
        logo,
        ...(org.description ? { description: org.description } : {}),
        parentOrganization: { "@id": ORG_ID },
        ...contact,
        ...(address ? { address: { "@type": "PostalAddress", streetAddress: address, addressCountry: "BD" } } : {}),
        ...(sameAs.length ? { sameAs } : {}),
      },
    ],
  };
}

/** WebSite with a sitelinks SearchAction (Home only). `searchUrl` is the
 *  absolute, locale-prefixed /search URL. */
export function websiteJsonLd(opts: { name: string; url: string; searchUrl: string; locale: string }): Thing {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: opts.name,
    url: opts.url,
    inLanguage: opts.locale,
    publisher: { "@id": ORG_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${opts.searchUrl}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Article for a knowledge-hub guide. */
export function articleJsonLd(a: {
  headline: string;
  description: string;
  url: string;
  locale: string;
  published: string;
  modified: string;
  publisher: string;
}): Thing {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.headline.slice(0, 110),
    description: a.description,
    inLanguage: a.locale,
    datePublished: a.published,
    dateModified: a.modified,
    mainEntityOfPage: { "@type": "WebPage", "@id": a.url },
    url: a.url,
    image: [absoluteUrl("/opengraph-image.png")],
    author: { "@type": "Organization", "@id": ORG_ID, name: a.publisher, url: absoluteUrl("/") },
    publisher: {
      "@type": "Organization",
      "@id": ORG_ID,
      name: a.publisher,
      logo: { "@type": "ImageObject", url: absoluteUrl("/icon.png") },
    },
  };
}
