import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { pageWindow } from "@/lib/catalog/listing";
import { cn } from "@/lib/utils";

/** Numbered page links (plain anchors — no JS). */
export function Pagination({
  page,
  pageCount,
  href,
}: {
  page: number;
  pageCount: number;
  /** Locale-less href for a page number. */
  href: (page: number) => { pathname: string; query: Record<string, string> };
}) {
  const t = useTranslations("catalog.listing");
  if (pageCount <= 1) return null;
  const cell =
    "inline-grid h-11 min-w-11 place-items-center rounded-re border px-2 text-[0.9375rem] transition-colors duration-150";
  return (
    <nav aria-label={t("pagination")} className="mt-8 flex flex-wrap items-center gap-2">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={cn(cell, "gap-1 border-re-steel-400 px-3 hover:border-re-ink")}>
          <ChevronLeft aria-hidden className="size-4" />
          {t("prev")}
        </Link>
      ) : null}
      <ol className="flex flex-wrap items-center gap-1">
        {pageWindow(page, pageCount).map((n, i) =>
          n === "gap" ? (
            <li key={`gap-${i}`} aria-hidden className="re-mono px-1 text-re-steel-400">
              …
            </li>
          ) : (
            <li key={n}>
              {n === page ? (
                <span aria-current="page" className={cn(cell, "re-mono border-re-ink bg-re-ink font-semibold text-white")}>
                  {n}
                </span>
              ) : (
                <Link
                  href={href(n)}
                  aria-label={t("pageN", { page: n })}
                  className={cn(cell, "re-mono border-re-steel-200 hover:border-re-ink")}
                >
                  {n}
                </Link>
              )}
            </li>
          ),
        )}
      </ol>
      {page < pageCount ? (
        <Link href={href(page + 1)} rel="next" className={cn(cell, "gap-1 border-re-steel-400 px-3 hover:border-re-ink")}>
          {t("next")}
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      ) : null}
    </nav>
  );
}
