/**
 * /llms.txt (https://llmstxt.org) — a short markdown brief of the site for
 * LLM agents. Pure; src/app/llms.txt/route.ts passes bootstrap data in.
 */
import type { SiteBootstrap } from "@/lib/api/types";
import { splitPartsAndDevices } from "@/lib/catalog/devices";
import { BUSINESS } from "@/config/business";

export interface LlmsInput {
  siteUrl: string;
  boot: Pick<SiteBootstrap, "settings" | "categories" | "machineBrands" | "partsBrands">;
  guides: { slug: string; title: string; description: string }[];
}

const oneLine = (v: string) => v.replace(/\s+/g, " ").trim();
const link = (title: string, url: string, note?: string) => `- [${title}](${url})${note ? `: ${note}` : ""}`;

export function llmsTxt({ siteUrl, boot, guides }: LlmsInput): string {
  const s = boot.settings;
  const name = s.siteName || "Rakib Enterprise";
  const u = (path: string) => encodeURI(`${siteUrl}${path}`);
  const out: string[] = [];

  out.push(`# ${name}`, "");
  out.push(
    `> ${name} supplies genuine (OEM) and compatible spare parts and devices for industrial garment sewing machines in Bangladesh. Parts: needles, rotary hooks, loopers, bobbin cases, feed dogs, presser feet, knives, belts and gears. Devices: servo motors, control boxes, thread-trimmer units, LED machine lights, attachments and pullers. For machine brands such as ${
      boot.machineBrands.length ? boot.machineBrands.slice(0, 8).map((b) => b.name).join(", ") : "Juki, Brother, Pegasus, Jack, Siruba, Yamato and Kansai Special"
    }. It sells to garment factories, workshops and resellers. It sells spare parts and devices only — not sewing machines, and not clothing.`,
    "",
  );
  out.push(
    "Prices are not published: the site is a quote-request catalogue. Find a part by its part number, by machine (brand → model) or by part type, add it to the quote list and send a request for quotation (RFQ). No account is needed; the team replies with prices and availability by WhatsApp, phone or email.",
    "",
  );

  out.push("## Catalogue", "");
  const { parts, devices } = splitPartsAndDevices(boot.categories);
  out.push(link("Find parts by machine", u("/machines"), "browse by sewing-machine brand and model; each model page lists the parts and devices that fit it (machines themselves are not sold)"));
  for (const b of boot.machineBrands.slice(0, 12)) out.push(link(`${b.name} parts`, u(`/machines/${b.slug}`)));
  out.push(link("Spare parts and devices by type", u("/categories"), "browse by category"));
  for (const c of parts.slice(0, 16)) out.push(link(c.name, u(`/categories/${c.slug}`)));
  for (const c of devices.slice(0, 10)) out.push(link(c.name, u(`/categories/${c.slug}`), "device"));
  out.push(link("Parts brands", u("/brands"), "genuine/OEM and compatible manufacturers"));
  out.push(link("Search", `${u("/search")}?q={part-number}`, "exact part-number matches are listed first"));
  out.push("");

  out.push("## Request a quote", "");
  out.push(link("Request for quotation", u("/rfq"), "list part numbers (or upload a spreadsheet/photo), quantities and machine models, plus a phone number; company name and BIN are optional for a VAT invoice"));
  out.push(link("Delivery and payment", u("/delivery"), "delivery areas, payment options and VAT invoices"));
  out.push("");

  if (guides.length) {
    out.push("## Guides", "");
    for (const g of guides) out.push(link(g.title, u(`/guides/${g.slug}`), oneLine(g.description)));
    out.push("");
  }

  out.push("## Contact", "");
  const contact: string[] = [];
  if (s.contactPhone) contact.push(`- Phone (mobile): ${s.contactPhone}`);
  if (s.contactPhoneSecondary) contact.push(`- Phone (landline): ${s.contactPhoneSecondary}`);
  if (s.whatsappNumber) contact.push(`- WhatsApp: ${s.whatsappNumber}`);
  if (s.contactEmail) contact.push(`- Email: ${s.contactEmail}`);
  if (s.businessAddress) contact.push(`- Sales centre (walk-in): ${oneLine(s.businessAddress)}`);
  contact.push(
    `- Corporate office: ${BUSINESS.corporateOffice.address.en}`,
    `- Opening hours: Saturday–Thursday ${BUSINESS.hours.open}–${BUSINESS.hours.close}; Friday closed`,
    `- VAT registration: BIN ${BUSINESS.vatBin}`,
    `- Trade licence: ${BUSINESS.tradeLicence.number} (${BUSINESS.tradeLicence.authority.en})`,
    `- Experience: 35+ years in the garment-machine parts trade, Mirpur-1, Dhaka`,
  );
  for (const [k, v] of Object.entries(s.social)) if (/^https?:\/\//i.test(v)) contact.push(`- ${k[0].toUpperCase()}${k.slice(1)}: ${v}`);
  out.push(...contact, link("Contact page", u("/contact")), link("About", u("/about")), "");

  out.push("## Languages", "");
  out.push(`- English: ${u("/")}`, `- Bangla (বাংলা): ${u("/bn")} — every page has a Bangla version under /bn/…`, "");

  out.push("## Optional", "");
  out.push(link("Policies", u("/policies"), "shipping, returns, payment, privacy, terms"));
  out.push(link("Sitemap", u("/sitemap.xml")));
  out.push("");
  return out.join("\n");
}
