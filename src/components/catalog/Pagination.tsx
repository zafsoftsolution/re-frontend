"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useQueryState } from "@/lib/queryState";
import { cn } from "@/lib/utils";

interface Props {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
}

export default function Pagination({ page, totalPages, total, pageSize }: Props) {
  const { set } = useQueryState();
  if (totalPages <= 1) return null;

  const go = (p: number) => {
    if (p < 1 || p > totalPages) return;
    set("page", p === 1 ? null : String(p));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => {
    if (totalPages <= 7) return true;
    if (p === 1 || p === totalPages) return true;
    return Math.abs(p - page) <= 1;
  });

  return (
    <div className="mt-20 md:mt-28 border-t border-navy/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
      <p className="text-[11px] tracking-[0.25em] uppercase text-ink/55 tabular">
        Showing {first}–{last} of {total}
      </p>

      <nav className="flex items-center gap-1.5">
        <button
          onClick={() => go(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
          className="h-10 w-10 grid place-items-center rounded-full border border-navy/20 hover:bg-navy hover:text-cream disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ArrowLeft size={14} />
        </button>

        {pages.map((p, i) => {
          const showDots = i > 0 && p - pages[i - 1] > 1;
          return (
            <span key={p} className="flex items-center gap-1.5">
              {showDots && <span className="text-ink/30 px-1">…</span>}
              <button
                onClick={() => go(p)}
                aria-current={p === page ? "page" : undefined}
                className={cn(
                  "min-w-10 h-10 px-3 text-sm rounded-full transition-colors tabular",
                  p === page
                    ? "bg-navy text-cream"
                    : "text-ink/70 hover:bg-navy/5 hover:text-navy"
                )}
              >
                {p}
              </button>
            </span>
          );
        })}

        <button
          onClick={() => go(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
          className="h-10 w-10 grid place-items-center rounded-full border border-navy/20 hover:bg-navy hover:text-cream disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ArrowRight size={14} />
        </button>
      </nav>
    </div>
  );
}
