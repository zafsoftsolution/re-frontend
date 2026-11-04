/**
 * /llms.txt (https://llmstxt.org) — a short markdown brief of the site for
 * LLM agents. Pure; src/app/llms.txt/route.ts passes bootstrap data in.
 */
import type { SiteBootstrap } from "@/lib/api/types";

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
    `> ${name} supplies genuine (OEM) and compatible spare parts for industrial garment sewing machines in Bangladesh — needles, rotary hooks, bobbin cases, loopers, feed dogs, presser feet, belts, motors and control boxes for brands such as ${
      boot.machineBrands.length ? boot.machineBrands.slice(0, 8).map((b) => b.name).join(", ") : "Juki, Brother, Pegasus, Jack, Siruba, Yamato and Kansai Special"
    }. It sells to garment factories, workshops and resellers. It sells parts, not clothing or whole machines.`,
    "",
  );
  out.push(
    "Prices are not published: the site is a quote-request catalogue. Find a part by its part number, by machine (brand → model) or by part type, add it to the quote list and send a request for quotation (RFQ). No account is needed; the team replies with prices and availability by WhatsApp, phone or email.",
    "",
  );

  out.push("## Catalogue", "");
  out.push(link("Machines", u("/machines"), "browse by sewing-machine brand and model; each model page lists its compatible parts"));
  for (const b of boot.machineBrands.slice(0, 12)) out.push(link(`${b.name} parts`, u(`/machines/${b.slug}`)));
  out.push(link("Part types", u("/categories"), "browse by category"));
  for (const c of boot.categories.slice(0, 16)) out.push(link(c.name, u(`/categories/${c.slug}`)));
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
  if (s.contactPhone) contact.push(`- Phone: ${s.contactPhone}`);
  if (s.whatsappNumber) contact.push(`- WhatsApp: ${s.whatsappNumber}`);
  if (s.contactEmail) contact.push(`- Email: ${s.contactEmail}`);
  if (s.businessAddress) contact.push(`- Address: ${oneLine(s.businessAddress)}`);
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
