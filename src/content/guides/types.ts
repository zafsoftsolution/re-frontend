/**
 * Knowledge-hub guide format. Plain TS data (no MDX toolchain): each guide
 * is one file with an English and a Bangla body made of simple blocks.
 * Inline text supports **bold**, `code` (rendered mono — part numbers,
 * needle systems) and [links](/path).
 */
export type GuideBlock =
  | { t: "p"; text: string }
  | { t: "h2"; text: string; id: string }
  | { t: "ul" | "ol"; items: string[] }
  | { t: "table"; head: string[]; rows: string[][]; caption?: string }
  | { t: "note"; text: string };

export interface GuideBody {
  title: string;
  /** Meta description + index card summary (≤ 160 chars). */
  description: string;
  blocks: GuideBlock[];
}

export interface Guide {
  slug: string;
  /** ISO dates. */
  published: string;
  updated: string;
  /** Short mono tag on the index card ("PART NO.", "NEEDLES"). */
  tag: string;
  en: GuideBody;
  bn: GuideBody;
}
