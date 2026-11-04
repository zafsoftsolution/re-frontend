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

export interface PostalAddressInput {
  streetAddress: string;
  addressLocality?: string;
  postalCode?: string;
  addressRegion?: string;
  addressCountry?: string;
}

export interface OrgInput {
  name: string;
  legalName?: string;
  description?: string;
  logoUrl?: string;
  /** One number or several (first = primary, used for the ContactPoint). */
  telephone?: string | string[];
  email?: string;
  /** Free text (admin-edited) or structured parts. */
  address?: string | PostalAddressInput;
  /** Further premises (e.g. a corporate office), emitted as Organization.location. */
  locations?: { name: string; address: PostalAddressInput }[];
  openingHours?: { days: readonly string[]; opens: string; closes: string };
  /** VAT registration number (Bangladesh BIN). */
  vatID?: string;
  social?: Record<string, string>;
}

function postalAddress(a: string | PostalAddressInput | undefined): Thing | null {
  if (!a) return null;
  if (typeof a === "string") {
    const street = a.replace(/\s+/g, " ").trim();
    return street ? { "@type": "PostalAddress", streetAddress: street, addressCountry: "BD" } : null;
  }
  const clean = Object.fromEntries(Object.entries(a).map(([k, v]) => [k, (v ?? "").replace(/\s+/g, " ").trim()]).filter(([, v]) => v));
  if (!clean.streetAddress) return null;
  return { "@type": "PostalAddress", addressCountry: "BD", ...clean };
}

/** Organization + Store (LocalBusiness) as one @graph, from bootstrap
 *  settings and the verified business facts. Empty fields are omitted,
 *  never invented (and there is deliberately no founding date). */
export function organizationJsonLd(org: OrgInput): Thing {
  const logo = httpUrl(org.logoUrl ?? "") || absoluteUrl("/logo/rakib-enterprise.png");
  const sameAs = Object.values(org.social ?? {}).map(httpUrl).filter(Boolean);
  const phones = (Array.isArray(org.telephone) ? org.telephone : [org.telephone ?? ""]).map((p) => p.trim()).filter(Boolean);
  const telephone = phones.length > 1 ? phones : phones[0];
  const email = org.email?.trim();
  const address = postalAddress(org.address);
  const vatID = org.vatID?.trim();
  const legalName = org.legalName?.trim();
  const locations = (org.locations ?? [])
    .map((l) => ({ name: l.name, address: postalAddress(l.address) }))
    .filter((l) => l.address)
    .map((l) => ({ "@type": "Place", name: l.name, address: l.address }));
  const contact = {
    ...(telephone ? { telephone } : {}),
    ...(email ? { email } : {}),
  };
  const hours = org.openingHours?.days.length
    ? [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: [...org.openingHours.days],
          opens: org.openingHours.opens,
          closes: org.openingHours.closes,
        },
      ]
    : null;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: org.name,
        ...(legalName ? { legalName } : {}),
        url: absoluteUrl("/"),
        logo: { "@type": "ImageObject", url: logo },
        ...(org.description ? { description: org.description } : {}),
        ...contact,
        ...(address ? { address } : {}),
        ...(vatID ? { vatID } : {}),
        ...(locations.length ? { location: locations } : {}),
        ...(sameAs.length ? { sameAs } : {}),
        ...(phones.length || email
          ? {
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "sales",
                areaServed: "BD",
                availableLanguage: ["en", "bn"],
                ...(phones[0] ? { telephone: phones[0] } : {}),
                ...(email ? { email } : {}),
              },
            }
          : {}),
      },
      {
        "@type": "Store",
        "@id": STORE_ID,
        name: org.name,
        ...(legalName ? { legalName } : {}),
        url: absoluteUrl("/"),
        image: absoluteUrl("/opengraph-image.png"),
        logo,
        ...(org.description ? { description: org.description } : {}),
        parentOrganization: { "@id": ORG_ID },
        ...contact,
        ...(address ? { address } : {}),
        ...(vatID ? { vatID } : {}),
        ...(hours ? { openingHoursSpecification: hours } : {}),
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
