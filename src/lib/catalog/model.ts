import { notFound } from "next/navigation";
import type { Locale } from "@/i18n/routing";
import { getMachineModel } from "@/lib/api/site";
import type { MachineModelDetail, PartSummary } from "@/lib/api/types";

/** Model detail for /machines/[brand]/[model](/[category]). The proxy
 *  already 404s unknown slugs and redirects a model under the wrong brand;
 *  this is the in-render fallback. */
export async function loadModel(locale: Locale, brandSlug: string, modelSlug: string): Promise<MachineModelDetail> {
  const model = await getMachineModel(locale, modelSlug);
  if (!model || model.brandSlug !== brandSlug) notFound();
  return model;
}

export interface CategoryGroup {
  slug: string;
  name: string;
  parts: PartSummary[];
}

/** Parts grouped by category in the model's order (most parts first); parts
 *  in categories the breakdown doesn't list are appended. */
export function groupByCategory(categories: { slug: string; name: string }[], parts: PartSummary[]): CategoryGroup[] {
  const groups = new Map<string, CategoryGroup>();
  for (const c of categories) groups.set(c.slug, { slug: c.slug, name: c.name, parts: [] });
  for (const p of parts) {
    const key = p.categorySlug || "other";
    const g = groups.get(key) ?? { slug: key, name: p.categoryName || key, parts: [] };
    g.parts.push(p);
    groups.set(key, g);
  }
  return [...groups.values()].filter((g) => g.parts.length > 0);
}
