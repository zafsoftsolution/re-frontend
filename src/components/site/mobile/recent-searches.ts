/**
 * Recent searches for the mobile search sheet — kept in localStorage on the
 * device only. Pure list helpers are unit-tested; storage access never throws
 * (private mode, blocked storage).
 */

export const RECENT_KEY = "re:recent-searches:v1";
export const RECENT_MAX = 6;
const MAX_LEN = 80;

const norm = (q: string) => q.replace(/\s+/g, " ").trim();
const same = (a: string, b: string) => a.toLocaleLowerCase("en") === b.toLocaleLowerCase("en");

/** Most recent first, case-insensitive de-duplication, capped. */
export function pushRecent(list: readonly string[], query: string, max = RECENT_MAX): string[] {
  const q = norm(query).slice(0, MAX_LEN);
  if (!q) return list.slice(0, max);
  return [q, ...list.filter((x) => !same(x, q))].slice(0, max);
}

export function removeRecent(list: readonly string[], query: string): string[] {
  return list.filter((x) => !same(x, query));
}

/** Tolerant parse of the stored value: anything malformed becomes []. */
export function parseRecent(raw: string | null | undefined, max = RECENT_MAX): string[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    const out: string[] = [];
    for (const item of v) {
      if (typeof item !== "string") continue;
      const q = norm(item).slice(0, MAX_LEN);
      if (q && !out.some((x) => same(x, q))) out.push(q);
      if (out.length >= max) break;
    }
    return out;
  } catch {
    return [];
  }
}

export function loadRecent(): string[] {
  try {
    return parseRecent(window.localStorage.getItem(RECENT_KEY));
  } catch {
    return [];
  }
}

export function saveRecent(list: readonly string[]): void {
  try {
    if (list.length) window.localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    else window.localStorage.removeItem(RECENT_KEY);
  } catch {
    /* storage unavailable — recent searches are a convenience only */
  }
}
