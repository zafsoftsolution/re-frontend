import { cacheLife, cacheTag } from "next/cache";
import { apiFetch, unwrapList } from "@/lib/api/client";
import { mapList, mapPart } from "@/lib/api/mappers";
import { TAGS } from "@/lib/api/tags";
import type { PartSummary } from "@/lib/api/types";

async function list(locale: string, query: Record<string, string | number>): Promise<PartSummary[] | null> {
  try {
    return mapList(unwrapList(await apiFetch<never>("/site/products/", { locale, query })), mapPart);
  } catch {
    return null;
  }
}

/**
 * Home "featured parts": the parts the admin flagged as featured, topped up
 * with the newest listings so the table is never thin. Never throws — an
 * empty list hides the section.
 */
export async function getHomeParts(locale: string, size = 8): Promise<PartSummary[]> {
  "use cache";
  cacheTag(TAGS.products);
  const [featured, newest] = await Promise.all([
    list(locale, { is_featured: "true", page_size: size }),
    list(locale, { ordering: "-created_at", page_size: size * 2 }),
  ]);
  if (featured === null && newest === null) {
    cacheLife("minutes");
    return [];
  }
  cacheLife("hours");
  const out = [...(featured ?? [])];
  for (const p of newest ?? []) {
    if (out.length >= size) break;
    if (!out.some((x) => x.slug === p.slug)) out.push(p);
  }
  return out.slice(0, size);
}

/** Up to `n` real part numbers for the search chips — in-stock parts first. */
export function exampleNumbers(parts: PartSummary[], n = 3): string[] {
  const ranked = [...parts].sort(
    (a, b) => Number(b.availability === "in_stock") - Number(a.availability === "in_stock"),
  );
  const seen = new Set<string>();
  for (const p of ranked) {
    if (p.partNumber && /\d/.test(p.partNumber) && p.partNumber.length <= 16) seen.add(p.partNumber);
    if (seen.size >= n) break;
  }
  return [...seen];
}
