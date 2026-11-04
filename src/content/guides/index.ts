import type { Guide } from "./types";
import partNumbers from "./how-to-read-a-sewing-machine-part-number";
import genuine from "./genuine-vs-compatible-parts";
import needles from "./industrial-needle-systems-and-sizes";

export type { Guide, GuideBlock, GuideBody } from "./types";

/** Knowledge hub, in index order. Add a guide: new file here + its slug in ../slugs.ts. */
export const GUIDES: readonly Guide[] = [partNumbers, genuine, needles];

export function getGuide(slug: string): Guide | null {
  return GUIDES.find((g) => g.slug === slug) ?? null;
}
