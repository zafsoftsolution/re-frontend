/**
 * Verified business facts (docs/BUSINESS_FACTS.md) — the single typed source
 * for everything the public site states about Rakib Enterprise.
 *
 * Contact fields that exist in admin SiteSettings (phone, WhatsApp, email,
 * address) are only DEFAULTS here: `withBusinessDefaults` fills a settings
 * field only when the admin left it empty, so the business can still edit
 * them. Facts that are not SiteSettings fields (second location, hours,
 * trade licence, BIN, sister concern, experience) live only here.
 *
 * Never add private licence data (see docs/BUSINESS_FACTS.md "never publish"),
 * unconfirmed claims, or a founding year.
 */
import type { SiteSettings } from "@/lib/api/types";
import { toE164BD } from "@/lib/format";
import type { OrgInput } from "@/lib/seo/jsonld";

type L10n = { en: string; bn: string };
export type BusinessLocale = keyof L10n;

export interface BusinessPhone {
  /** E.164 — tel:, wa.me, JSON-LD. */
  e164: string;
  /** How it is printed on the site (Latin digits, mono). */
  display: string;
}

export interface BusinessLocation {
  name: L10n;
  /** One-line address as printed. */
  address: L10n;
  /** schema.org PostalAddress parts (English). */
  postal: { streetAddress: string; addressLocality: string; postalCode: string; addressRegion: string; addressCountry: "BD" };
}

const MOBILE: BusinessPhone = { e164: "+8801711279319", display: "+880 1711-279319" };
const LANDLINE: BusinessPhone = { e164: "+880248036796", display: "+880 2-48036796" };

export const BUSINESS = {
  name: "Rakib Enterprise",
  nameBn: "রাকিব এন্টারপ্রাইজ",
  legalName: "Rakib Enterprise",
  proprietor: { en: "Md. Abul Hossain", bn: "মোঃ আবুল হোসেন" } satisfies L10n,
  /** Public copy only ever says "35+" — never an exact founding year. */
  experienceYears: 35,
  phones: {
    /** Primary: mobile, also the WhatsApp number. */
    mobile: MOBILE,
    landline: LANDLINE,
  },
  whatsapp: MOBILE,
  email: "rakibenterprise2020@gmail.com",
  website: "https://rakibenterprise-bd.com",
  /** Walk-in shop — the main public address. */
  salesCentre: {
    name: { en: "Sales centre", bn: "বিক্রয়কেন্দ্র" },
    address: {
      en: "4 No. S.N Mansion (Ground Floor), 1 No. Super Market, Kalwalapara, Mirpur-1, Dhaka-1216",
      bn: "৪ নং এস.এন ম্যানশন (নিচতলা), ১ নং সুপার মার্কেট, কালওয়ালাপাড়া, মিরপুর-১, ঢাকা-১২১৬",
    },
    postal: {
      streetAddress: "4 No. S.N Mansion (Ground Floor), 1 No. Super Market, Kalwalapara",
      addressLocality: "Mirpur-1, Dhaka",
      postalCode: "1216",
      addressRegion: "Dhaka",
      addressCountry: "BD",
    },
  } satisfies BusinessLocation,
  corporateOffice: {
    name: { en: "Corporate office", bn: "কর্পোরেট অফিস" },
    address: {
      en: "23 Chowdhury Mansion (1st Floor), Mirpur-1, Dhaka-1216",
      bn: "২৩ চৌধুরী ম্যানশন (১ম তলা), মিরপুর-১, ঢাকা-১২১৬",
    },
    postal: {
      streetAddress: "23 Chowdhury Mansion (1st Floor)",
      addressLocality: "Mirpur-1, Dhaka",
      postalCode: "1216",
      addressRegion: "Dhaka",
      addressCountry: "BD",
    },
  } satisfies BusinessLocation,
  /** Short area label for trust rows. */
  area: { en: "Mirpur-1, Dhaka", bn: "মিরপুর-১, ঢাকা" } satisfies L10n,
  /** Saturday–Thursday 10:00–20:00; Friday closed. */
  hours: {
    open: "10:00",
    close: "20:00",
    /** schema.org day names for openingHoursSpecification. */
    days: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
    closed: ["Friday"],
  },
  /** VAT registration (NBR Mushak-2.3). */
  vatBin: "002328131-0401",
  tradeLicence: {
    number: "TRAD/DNCC/019449/2022",
    authority: { en: "Dhaka North City Corporation", bn: "ঢাকা উত্তর সিটি কর্পোরেশন" } satisfies L10n,
    authorityShort: "DNCC",
  },
  sisterConcern: {
    name: { en: "Zahid Enterprise", bn: "জাহিদ এন্টারপ্রাইজ" } satisfies L10n,
    address: {
      en: "Shop 2, Plot 1/3/5, Road 1, Block G, Kalwalapara, Mirpur-1, Dhaka",
      bn: "দোকান ২, প্লট ১/৩/৫, রোড ১, ব্লক জি, কালওয়ালাপাড়া, মিরপুর-১, ঢাকা",
    } satisfies L10n,
    phone: { e164: "+880248035060", display: "+880 2-48035060" } satisfies BusinessPhone,
  },
} as const;

export const businessLocale = (locale: string): BusinessLocale => (locale === "bn" ? "bn" : "en");

/** Google Maps search URL for an address (no API key, opens the app on phones). */
export function mapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.replace(/\s+/g, " ").trim())}`;
}

/**
 * Bangladesh numbers in one printed style: "+880 1711-279319" (mobile),
 * "+880 2-48036796" (Dhaka landline). Anything else is returned trimmed.
 */
export function formatPhoneDisplay(phone: string): string {
  const raw = phone.trim();
  let d = raw.replace(/\D/g, "");
  if (!d) return raw;
  if (d.startsWith("00880")) d = d.slice(2);
  if (d.startsWith("0")) d = `88${d}`;
  else if (!d.startsWith("880") && d.length === 10 && d.startsWith("1")) d = `880${d}`;
  const mobile = /^880(1\d{3})(\d{6})$/.exec(d);
  if (mobile) return `+880 ${mobile[1]}-${mobile[2]}`;
  const dhaka = /^8802(\d{7,8})$/.exec(d);
  if (dhaka) return `+880 2-${dhaka[1]}`;
  return raw;
}

const squash = (v: string) => v.replace(/[\s,]+/g, " ").trim().toLowerCase();

/** True when `address` is (a re-formatting of) the default sales-centre address. */
export function isDefaultSalesAddress(address: string): boolean {
  const a = squash(address);
  return a === squash(BUSINESS.salesCentre.address.en) || a === squash(BUSINESS.salesCentre.address.bn);
}

/**
 * Admin settings with the verified facts filled in wherever a contact field
 * is empty. Phone numbers are normalised to the printed style.
 */
export function withBusinessDefaults(settings: SiteSettings, locale: string): SiteSettings {
  const l = businessLocale(locale);
  const phone = settings.contactPhone || BUSINESS.phones.mobile.e164;
  // The landline is only defaulted while the main number is ours too — never
  // pair an admin-changed main number with a stale landline.
  const ownMain = formatPhoneDisplay(phone) === BUSINESS.phones.mobile.display;
  const secondary = settings.contactPhoneSecondary || (ownMain ? BUSINESS.phones.landline.e164 : "");
  return {
    ...settings,
    siteName: settings.siteName || BUSINESS.name,
    contactPhone: formatPhoneDisplay(phone),
    contactPhoneSecondary: secondary ? formatPhoneDisplay(secondary) : "",
    whatsappNumber: formatPhoneDisplay(settings.whatsappNumber || phone),
    contactEmail: settings.contactEmail || BUSINESS.email,
    businessAddress: settings.businessAddress || BUSINESS.salesCentre.address[l],
  };
}

/**
 * The verified facts as `organizationJsonLd` input, merged with (already
 * defaulted) settings: phones in E.164, the sales-centre address structured
 * while it is the default one (free text if the admin changed it), the
 * corporate office as a second location, hours, BIN as vatID. No founder,
 * no founding date.
 */
export function organizationFacts(settings: SiteSettings): Omit<OrgInput, "name" | "description" | "logoUrl" | "social"> {
  const e164 = (p: string) => {
    const d = toE164BD(p);
    return d ? `+${d}` : "";
  };
  const address = settings.businessAddress.trim();
  return {
    legalName: BUSINESS.legalName,
    telephone: [settings.contactPhone, settings.contactPhoneSecondary ?? ""].map(e164).filter(Boolean),
    email: settings.contactEmail,
    address: !address || isDefaultSalesAddress(address) ? { ...BUSINESS.salesCentre.postal } : address,
    locations: [
      { name: `${BUSINESS.name} — ${BUSINESS.salesCentre.name.en}`, address: { ...BUSINESS.salesCentre.postal } },
      { name: `${BUSINESS.name} — ${BUSINESS.corporateOffice.name.en}`, address: { ...BUSINESS.corporateOffice.postal } },
    ],
    openingHours: { days: BUSINESS.hours.days, opens: BUSINESS.hours.open, closes: BUSINESS.hours.close },
    vatID: BUSINESS.vatBin,
  };
}
