import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import type { ApiError, ApiSuccess, PageMeta } from "@/types";

export const REQ_ID_HEADER = "x-request-id";

export function okJson<T>(data: T, meta?: PageMeta, init?: ResponseInit) {
  const requestId = nanoid(12);
  const body: ApiSuccess<T> = { ok: true, data, meta, requestId };
  return NextResponse.json(body, {
    ...init,
    headers: { ...(init?.headers ?? {}), [REQ_ID_HEADER]: requestId },
  });
}

export function errJson(
  code: string,
  message: string,
  opts?: { status?: number; fields?: Record<string, string[]> }
) {
  const requestId = nanoid(12);
  const body: ApiError = {
    ok: false,
    error: { code, message, fields: opts?.fields },
    requestId,
  };
  return NextResponse.json(body, {
    status: opts?.status ?? 400,
    headers: { [REQ_ID_HEADER]: requestId },
  });
}

export const Errors = {
  VALIDATION: (fields: Record<string, string[]>) =>
    errJson("VALIDATION_ERROR", "Invalid input", { status: 422, fields }),
  NOT_FOUND: (what = "Resource") =>
    errJson("NOT_FOUND", `${what} not found`, { status: 404 }),
  UNAUTHORIZED: (msg = "Authentication required") =>
    errJson("UNAUTHORIZED", msg, { status: 401 }),
  FORBIDDEN: (msg = "Forbidden") => errJson("FORBIDDEN", msg, { status: 403 }),
  CONFLICT: (msg = "Conflict") => errJson("CONFLICT", msg, { status: 409 }),
  RATE_LIMITED: () =>
    errJson("RATE_LIMITED", "Too many requests", { status: 429 }),
  INTERNAL: (msg = "Server error") =>
    errJson("INTERNAL_ERROR", msg, { status: 500 }),
};

export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number
): { items: T[]; meta: PageMeta } {
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.max(1, Math.min(100, Math.floor(pageSize)));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / safeSize));
  const start = (safePage - 1) * safeSize;
  return {
    items: items.slice(start, start + safeSize),
    meta: { page: safePage, pageSize: safeSize, total, totalPages },
  };
}

export function parseSearchParams(url: URL) {
  const sp = url.searchParams;
  const page = Number(sp.get("page") ?? "1");
  const pageSize = Number(sp.get("pageSize") ?? "24");
  const sort = sp.get("sort") ?? "featured";
  const q = sp.get("q") ?? "";
  return { page, pageSize, sort, q, raw: sp };
}
