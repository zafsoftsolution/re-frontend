/**
 * Base-URL resolution for the Django backend.
 *
 * Server-side (RSC / route handlers inside the Docker network) prefers
 * INTERNAL_DJANGO_BACKEND (e.g. http://backend:9086). The browser — and the
 * server when the internal URL is unset — uses NEXT_PUBLIC_DJANGO_BACKEND.
 * `||` (not `??`) so empty-string env vars (CI sets them to "") fall through.
 */
export const DEFAULT_API_ROOT = "https://api.rakibenterprise-bd.com";

export interface ApiEnv {
  INTERNAL_DJANGO_BACKEND?: string;
  NEXT_PUBLIC_DJANGO_BACKEND?: string;
}

export function resolveApiRoot(isServer: boolean, env: ApiEnv): string {
  const root =
    (isServer ? env.INTERNAL_DJANGO_BACKEND?.trim() : "") ||
    env.NEXT_PUBLIC_DJANGO_BACKEND?.trim() ||
    DEFAULT_API_ROOT;
  return root.replace(/\/+$/, "");
}

export function getApiRoot(): string {
  return resolveApiRoot(typeof window === "undefined", {
    INTERNAL_DJANGO_BACKEND: process.env.INTERNAL_DJANGO_BACKEND,
    // Must be referenced literally so Next inlines it into client bundles.
    NEXT_PUBLIC_DJANGO_BACKEND: process.env.NEXT_PUBLIC_DJANGO_BACKEND,
  });
}

export type QueryValue = string | number | boolean | null | undefined;

/** Build `${root}/api${path}?query` — empty / nullish query values are dropped. */
export function buildApiUrl(
  root: string,
  path: string,
  query?: Record<string, QueryValue | QueryValue[]>,
): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${root}/api${clean}`);
  if (query) {
    for (const [key, raw] of Object.entries(query)) {
      const values = Array.isArray(raw) ? raw : [raw];
      for (const v of values) {
        if (v === undefined || v === null || v === "") continue;
        url.searchParams.append(key, String(v));
      }
    }
  }
  return url.toString();
}
