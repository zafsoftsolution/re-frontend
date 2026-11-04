/** Build-time prerender policy for catalogue routes (pure — no Next imports). */

/**
 * Catalogue detail routes prerender real slugs only when PRERENDER_CATALOG=1.
 * By default (CI / Docker image builds on GitHub's runners) they prerender
 * just the placeholder param, so `next build` makes no per-entity backend
 * calls (the API throttles anonymous clients at 100 req/h); real pages
 * render on first request in the running container and are then cached.
 */
export function prerenderCatalog(env: Record<string, string | undefined> = process.env): boolean {
  return env.PRERENDER_CATALOG === "1";
}

/** Top `n` by `score`, but never empty — Cache Components needs ≥ 1 param. */
export function topParams<T, P extends Record<string, string>>(
  items: T[],
  n: number,
  score: (x: T) => number,
  toParams: (x: T) => P,
  placeholder: P,
): P[] {
  const out = [...items].sort((a, b) => score(b) - score(a)).slice(0, n).map(toParams);
  return out.length ? out : [placeholder];
}
