"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

/**
 * Small helper that reads and writes URL query state.
 * Returns a tuple-ish API: `get`, `set`, `toggle`, `remove`, `setMany`.
 * Uses `replace` so filter changes don't pollute history.
 */
export function useQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const get = useCallback((key: string) => params.get(key), [params]);
  const getAll = useCallback((key: string) => params.getAll(key), [params]);

  const push = useCallback(
    (next: URLSearchParams) => {
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname]
  );

  const set = useCallback(
    (key: string, value: string | null | undefined) => {
      const next = new URLSearchParams(params.toString());
      if (value === null || value === undefined || value === "") next.delete(key);
      else next.set(key, value);
      // reset page on filter change
      if (key !== "page") next.delete("page");
      push(next);
    },
    [params, push]
  );

  const remove = useCallback(
    (key: string, value?: string) => {
      const next = new URLSearchParams(params.toString());
      if (value === undefined) {
        next.delete(key);
      } else {
        const current = (next.get(key) ?? "").split(",").filter(Boolean);
        const filtered = current.filter((v) => v !== value);
        if (filtered.length === 0) next.delete(key);
        else next.set(key, filtered.join(","));
      }
      if (key !== "page") next.delete("page");
      push(next);
    },
    [params, push]
  );

  const toggleCsv = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      const current = (next.get(key) ?? "").split(",").filter(Boolean);
      const exists = current.includes(value);
      const nextValues = exists ? current.filter((v) => v !== value) : [...current, value];
      if (nextValues.length === 0) next.delete(key);
      else next.set(key, nextValues.join(","));
      next.delete("page");
      push(next);
    },
    [params, push]
  );

  const setMany = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === undefined || v === "") next.delete(k);
        else next.set(k, v);
      }
      next.delete("page");
      push(next);
    },
    [params, push]
  );

  const clearAll = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  return { get, getAll, set, remove, toggleCsv, setMany, clearAll, params };
}

export function hasCsv(value: string | null, needle: string) {
  if (!value) return false;
  return value.split(",").includes(needle);
}
