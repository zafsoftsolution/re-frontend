/**
 * Typed client-side wrapper around the internal Rakib Enterprise API.
 * Use from client components; for server components, import the repos/services directly.
 */

import type { ApiResponse } from "@/types";

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("jmn:auth:token");
}

function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("jmn:admin:token");
}

async function request<T>(path: string, init: RequestInit & { admin?: boolean } = {}): Promise<T> {
  const { admin, ...rest } = init;
  const token = admin ? getAdminToken() : getAuthToken();

  const res = await fetch(`/api${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(rest.headers ?? {}),
    },
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (!json.ok) {
    const err = new Error(json.error.message) as Error & { code?: string; fields?: unknown };
    err.code = json.error.code;
    err.fields = json.error.fields;
    throw err;
  }
  return json.data;
}

export const api = {
  get: <T,>(path: string, opts?: { admin?: boolean }) => request<T>(path, { method: "GET", ...opts }),
  post: <T,>(path: string, body: unknown, opts?: { admin?: boolean }) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body), ...opts }),
  patch: <T,>(path: string, body: unknown, opts?: { admin?: boolean }) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body), ...opts }),
  delete: <T,>(path: string, opts?: { admin?: boolean }) =>
    request<T>(path, { method: "DELETE", ...opts }),
};
