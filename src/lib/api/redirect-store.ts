/**
 * Process-local copy of the admin-managed redirects for src/proxy.ts (which
 * cannot use `'use cache'`), same policy as catalog-index-store.ts:
 *  - fresh for 5 minutes, then served stale while one background reload runs;
 *  - a failed load is retried at most every 30 s, and the proxy meanwhile
 *    applies no backend redirects (the site keeps working without them).
 */
import { apiFetch } from "./client";
import { buildRedirectTable, parseRedirects, type RedirectTable } from "@/lib/redirects";

const FRESH_MS = 5 * 60_000;
const RETRY_MS = 30_000;
const TIMEOUT_MS = 2500;
const EMPTY: RedirectTable = new Map();

/** Shared via globalThis (proxy and route handlers are separate bundles in
 *  one process) so POST /api/revalidate can mark it stale. */
interface State {
  current: { table: RedirectTable; at: number } | null;
  inflight: Promise<RedirectTable> | null;
  lastAttempt: number;
  stale: boolean;
}
const KEY = Symbol.for("rakib-enterprise.redirect-store");
const g = globalThis as typeof globalThis & { [KEY]?: State };
const state: State = (g[KEY] ??= { current: null, inflight: null, lastAttempt: 0, stale: false });

/** Called by POST /api/revalidate for the `redirects` tag. */
export function markRedirectsStale(): void {
  state.stale = true;
  state.lastAttempt = 0;
}

/** Test hook. */
export function resetRedirectStore(): void {
  state.current = null;
  state.inflight = null;
  state.lastAttempt = 0;
  state.stale = false;
}

function reload(): Promise<RedirectTable> {
  if (state.inflight) return state.inflight;
  state.lastAttempt = Date.now();
  state.stale = false;
  state.inflight = apiFetch<unknown>("/site/redirects/", { locale: "en", timeoutMs: TIMEOUT_MS })
    .then((data) => {
      const table = buildRedirectTable(parseRedirects(data));
      state.current = { table, at: Date.now() };
      return table;
    })
    .catch(() => state.current?.table ?? EMPTY)
    .finally(() => {
      state.inflight = null;
    });
  return state.inflight;
}

/** Current redirect table; empty while the backend is unreachable. */
export async function redirectTable(): Promise<RedirectTable> {
  const now = Date.now();
  const { current, inflight } = state;
  if (!current) {
    if (inflight) return inflight;
    if (now - state.lastAttempt < RETRY_MS) return EMPTY;
    return reload();
  }
  // Revalidated: wait for the new table so a just-saved redirect applies.
  if (state.stale) return reload();
  if (now - current.at > FRESH_MS && !inflight && now - state.lastAttempt > RETRY_MS) void reload();
  return current.table;
}
