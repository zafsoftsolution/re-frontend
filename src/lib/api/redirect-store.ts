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

let current: { table: RedirectTable; at: number } | null = null;
let inflight: Promise<RedirectTable> | null = null;
let lastAttempt = 0;

function reload(): Promise<RedirectTable> {
  lastAttempt = Date.now();
  inflight ??= apiFetch<unknown>("/site/redirects/", { locale: "en", timeoutMs: TIMEOUT_MS })
    .then((data) => {
      const table = buildRedirectTable(parseRedirects(data));
      current = { table, at: Date.now() };
      return table;
    })
    .catch(() => current?.table ?? EMPTY)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Current redirect table; empty while the backend is unreachable. */
export async function redirectTable(): Promise<RedirectTable> {
  const now = Date.now();
  if (!current) {
    if (inflight) return inflight;
    if (now - lastAttempt < RETRY_MS) return EMPTY;
    return reload();
  }
  if (now - current.at > FRESH_MS && !inflight && now - lastAttempt > RETRY_MS) void reload();
  return current.table;
}
