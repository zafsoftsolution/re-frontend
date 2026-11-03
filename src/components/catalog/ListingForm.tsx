"use client";

import { useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Filter form island. Without JS it is a plain GET form (works everywhere).
 * With JS it navigates client-side with a clean query string (empty fields
 * and the default sort dropped) and, when `auto`, applies on every change.
 */
export function ListingForm({
  action,
  auto = false,
  defaultSort,
  children,
  className,
}: {
  /** Locale-prefixed listing path. */
  action: string;
  auto?: boolean;
  defaultSort: string;
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function go(form: HTMLFormElement) {
    const q = new URLSearchParams();
    for (const [k, v] of new FormData(form)) {
      if (typeof v !== "string" || !v || (k === "sort" && v === defaultSort)) continue;
      q.append(k, v);
    }
    const qs = q.toString();
    startTransition(() => router.push(qs ? `${action}?${qs}` : action, { scroll: false }));
  }

  return (
    <form
      action={action}
      method="get"
      aria-busy={pending || undefined}
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        go(e.currentTarget);
      }}
      onChange={auto ? (e) => go(e.currentTarget) : undefined}
      className={cn("transition-opacity duration-150 aria-busy:opacity-60", className)}
    >
      {children}
    </form>
  );
}
