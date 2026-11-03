import { buildApiUrl, getApiRoot, type QueryValue } from "./config";

export class ApiError extends Error {
  readonly status: number;
  readonly fields: Record<string, string[]>;
  constructor(message: string, status: number, fields: Record<string, string[]> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

export interface ApiRequest {
  /** Route locale → `Accept-Language` (django-modeltranslation picks _en/_bn). */
  locale: string;
  query?: Record<string, QueryValue | QueryValue[]>;
  method?: "GET" | "POST";
  body?: unknown;
  /** Abort after this many ms so a slow backend can't stall a render/build. */
  timeoutMs?: number;
  /** Visitor IP for browser-originated calls proxied through a route handler. */
  forwardedFor?: string;
}

/**
 * Server-only headers. INTERNAL_API_SECRET lets Django tell SSR traffic apart
 * from anonymous visitors (otherwise the whole site shares one anon throttle).
 * It is not NEXT_PUBLIC_, so it is never inlined into client bundles.
 */
export function serverHeaders(env: Record<string, string | undefined> = process.env): Record<string, string> {
  if (typeof window !== "undefined") return {};
  const secret = env.INTERNAL_API_SECRET?.trim();
  return secret ? { "X-Internal-Secret": secret } : {};
}

/**
 * Bare typed fetch against the Django API. Not cached by itself — callers in
 * `site.ts` wrap it in `'use cache'` scopes with cacheLife/cacheTag.
 */
export async function apiFetch<T>(path: string, req: ApiRequest): Promise<T> {
  const url = buildApiUrl(getApiRoot(), path, req.query);
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Accept-Language": req.locale,
    ...serverHeaders(),
  };
  if (req.forwardedFor) headers["X-Forwarded-For"] = req.forwardedFor;
  let body: BodyInit | undefined;
  if (req.body !== undefined) {
    if (req.body instanceof FormData) {
      body = req.body;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(req.body);
    }
  }

  const res = await fetch(url, {
    method: req.method ?? "GET",
    headers,
    body,
    signal: AbortSignal.timeout(req.timeoutMs ?? 8000),
  });

  if (!res.ok) {
    let parsed: Record<string, unknown> = {};
    try {
      parsed = (await res.json()) as Record<string, unknown>;
    } catch {
      /* not JSON */
    }
    const fields: Record<string, string[]> = {};
    let detail: string | undefined;
    for (const [k, v] of Object.entries(parsed)) {
      if (k === "detail" && typeof v === "string") detail = v;
      else if (Array.isArray(v)) fields[k] = v.map(String);
      else if (typeof v === "string") fields[k] = [v];
    }
    throw new ApiError(detail ?? `Request failed (${res.status})`, res.status, fields);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface DRFPage<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Unwrap DRF's pagination envelope when present. */
export function unwrapList<T>(data: DRFPage<T> | T[] | null | undefined): T[] {
  if (!data) return [];
  return Array.isArray(data) ? data : (data.results ?? []);
}
