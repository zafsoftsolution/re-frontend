"use client";

import { useEffect, useState } from "react";
import { djangoAdmin } from "@/lib/django-admin";

const POLL_MS = 60_000;
/** Fired by the quotes pages after a status change so the badge updates now. */
export const QUOTES_CHANGED_EVENT = "re:quotes-changed";

export function notifyQuotesChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(QUOTES_CHANGED_EVENT));
  }
}

/**
 * Live count of quotes in status "new" for the sidebar badge. Polls every
 * minute while the tab is visible and refreshes on QUOTES_CHANGED_EVENT.
 * Errors (no permission, offline) just leave the badge hidden.
 */
export function useNewQuoteCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      djangoAdmin.rfq
        .list({ status: "new", page_size: 1 })
        .then((res) => {
          if (!cancelled) setCount(res.count ?? 0);
        })
        .catch(() => {
          /* hide badge on error */
        });
    };
    load();
    const timer = window.setInterval(load, POLL_MS);
    window.addEventListener(QUOTES_CHANGED_EVENT, load);
    document.addEventListener("visibilitychange", load);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener(QUOTES_CHANGED_EVENT, load);
      document.removeEventListener("visibilitychange", load);
    };
  }, []);

  return count;
}
