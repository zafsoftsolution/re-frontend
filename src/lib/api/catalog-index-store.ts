/**
 * Process-local CatalogLookup for src/proxy.ts. The proxy cannot use
 * `'use cache'`, so the slug index lives in module memory:
 *  - fresh for 5 minutes, then served stale while one background refresh runs;
 *  - a miss may force a reload, at most once a minute (bounded backend load
 *    even when bots probe random slugs);
 *  - per-slug detail checks (only when the index can't enumerate a kind)
 *    are memoised: hits for 5 minutes, 404s for 1 minute.
 * Every failure degrades to "unknown", which the guard treats as "let the
 * page render" — a backend outage must never turn the catalogue into 404s.
 */
import { ApiError, apiFetch, unwrapList } from "./client";
import { indexFromLists, parseSitemapIndex, type CatalogLookup } from "./catalog-index";
import type { CatalogIndex } from "./types";

type Raw = Record<string, unknown>;

const FRESH_MS = 5 * 60_000;
const MIN_RELOAD_MS = 60_000;
const RETRY_MS = 30_000;
const MEMO_HIT_MS = 5 * 60_000;
const MEMO_MISS_MS = 60_000;
const MEMO_MAX = 5000;
const TIMEOUT_MS = 2500;

/**
 * State lives on a globalThis symbol, not in module scope: the proxy and the
 * route handlers are separate bundles (separate module instances) in one
 * Node process, and POST /api/revalidate must be able to mark the proxy's
 * copy stale (markCatalogIndexStale).
 */
interface State {
  current: { index: CatalogIndex; at: number } | null;
  inflight: Promise<CatalogIndex | null> | null;
  lastAttempt: number;
  /** Set by revalidation: the next lookup reloads regardless of age. */
  stale: boolean;
  memo: Map<string, { value: unknown; until: number }>;
}
const KEY = Symbol.for("rakib-enterprise.catalog-index-store");
const g = globalThis as typeof globalThis & { [KEY]?: State };
const state: State = (g[KEY] ??= { current: null, inflight: null, lastAttempt: 0, stale: false, memo: new Map() });

/** Called by POST /api/revalidate for catalogue tags: the next lookup
 *  reloads the index and per-slug memos are dropped. */
export function markCatalogIndexStale(): void {
  state.stale = true;
  state.lastAttempt = 0;
  state.memo.clear();
}

/** Test hook. */
export function resetCatalogIndexStore(): void {
  state.current = null;
  state.inflight = null;
  state.lastAttempt = 0;
  state.stale = false;
  state.memo.clear();
}

async function get(path: string, query?: Record<string, string | number>): Promise<unknown> {
  return apiFetch<unknown>(path, { locale: "en", query, timeoutMs: TIMEOUT_MS });
}

/** All pages of a DRF list (page numbers, not `next` URLs — those carry the
 *  backend's own host). */
async function getAll(path: string, query: Record<string, string | number> = {}, maxPages = 20): Promise<Raw[]> {
  const out: Raw[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const data = (await get(path, { ...query, page })) as { next?: unknown; results?: unknown } | unknown[];
    out.push(...(unwrapList(data as never) as Raw[]));
    if (Array.isArray(data) || !data || !(data as Raw).next) break;
  }
  return out;
}

async function load(): Promise<CatalogIndex | null> {
  state.lastAttempt = Date.now();
  try {
    const parsed = parseSitemapIndex(await get("/site/sitemap-entries/"));
    if (parsed) return parsed;
  } catch {
    /* fall through to the list endpoints */
  }
  try {
    const [machineBrands, machineModels, categories, brands] = await Promise.all([
      getAll("/site/machine-brands/"),
      getAll("/site/machine-models/", { page_size: 500 }),
      getAll("/site/categories/"),
      getAll("/site/brands/"),
    ]);
    return indexFromLists({ machineBrands, machineModels, categories, brands });
  } catch {
    return null;
  }
}

function reload(): Promise<CatalogIndex | null> {
  if (state.inflight) return state.inflight;
  state.stale = false;
  state.inflight = load()
    .then((ix) => {
      if (ix) state.current = { index: ix, at: Date.now() };
      return state.current?.index ?? null;
    })
    .finally(() => {
      state.inflight = null;
    });
  return state.inflight;
}

const memo = state.memo;

async function memoised<T>(key: string, fn: () => Promise<T | undefined>, ttl: (v: T) => number): Promise<T | undefined> {
  const hit = memo.get(key);
  if (hit && hit.until > Date.now()) return hit.value as T;
  const value = await fn();
  if (value !== undefined) {
    if (memo.size >= MEMO_MAX) memo.delete(memo.keys().next().value as string);
    memo.set(key, { value, until: Date.now() + ttl(value) });
  }
  return value;
}

export const catalogLookup: CatalogLookup = {
  async index(opts) {
    const now = Date.now();
    const { current, inflight } = state;
    if (!current) {
      if (inflight) return inflight;
      if (now - state.lastAttempt < RETRY_MS) return null;
      return reload();
    }
    // Revalidated since the last load: the cached copy may lack new slugs.
    if (state.stale) return reload();
    if (opts?.refresh) {
      // A reload is already running: its result is fresher than ours.
      if (inflight) return inflight;
      if (now - current.at > MIN_RELOAD_MS) return reload();
      // Reloaded within the last minute and nothing was published since
      // (publishing revalidates → `stale`): the miss is genuine.
      return current.index;
    }
    if (now - current.at > FRESH_MS) void reload(); // stale-while-revalidate
    return current.index;
  },

  partExists(slug) {
    return memoised(
      `part:${slug}`,
      async () => {
        try {
          await get(`/site/products/${encodeURIComponent(slug)}/`);
          return true;
        } catch (err) {
          return err instanceof ApiError && err.status === 404 ? false : undefined;
        }
      },
      (v) => (v ? MEMO_HIT_MS : MEMO_MISS_MS),
    );
  },

  model(slug) {
    return memoised(
      `model:${slug}`,
      async () => {
        try {
          const d = (await get(`/site/machine-models/${encodeURIComponent(slug)}/`)) as Raw;
          const brand = (d.brand as Raw | undefined)?.slug ?? d.machine_brand_slug;
          return {
            brandSlug: typeof brand === "string" ? brand : "",
            categories: (Array.isArray(d.categories) ? (d.categories as Raw[]) : []).map((c) => ({
              slug: String(c.slug ?? ""),
              count: Number(c.count) || 0,
            })),
          };
        } catch (err) {
          return err instanceof ApiError && err.status === 404 ? null : undefined;
        }
      },
      (v) => (v ? MEMO_HIT_MS : MEMO_MISS_MS),
    );
  },
};
