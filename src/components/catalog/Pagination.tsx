import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { pageWindow } from "@/lib/catalog/listing";
import { cn } from "@/lib/utils";

type Href = { pathname: string; query: Record<string, string> };

/**
 * Numbered page links from md up (plain anchors — no JS). Phones get one
 * full-width "Load more" link instead: the next page URL renders every row
 * loaded so far (see PartsTable `mobileParts`) and jumps to the first new
 * row (#more) — server-rendered, so it works without JS too.
 */
export function Pagination({
  page,
  pageCount,
  href,
  shown,
  total,
}: {
  page: number;
  pageCount: number;
  /** Locale-less href for a page number. */
  href: (page: number) => Href;
  /** Phones: rows shown so far (pages 1…page) and the filtered total. */
  shown?: number;
  total?: number;
}) {
  const t = useTranslations("catalog.listing");
  if (pageCount <= 1) return null;
  const cell =
    "inline-grid h-11 min-w-11 place-items-center rounded-re border px-2 text-[0.9375rem] transition-colors duration-150";
  const loadMore = shown !== undefined && total !== undefined;
  return (
    <>
      {loadMore && (
        <div className="mt-6 md:hidden">
          <p className="text-center text-[0.8125rem] text-re-steel-600">{t("shown", { shown, total })}</p>
          {page < pageCount && (
            <Link
              href={{ ...href(page + 1), hash: "more" }}
              rel="next"
              className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-re border border-re-ink bg-re-paper font-semibold text-re-ink active:bg-re-ink active:text-white"
            >
              {t("loadMore")}
              <ChevronDown aria-hidden className="size-4" />
            </Link>
          )}
        </div>
      )}
      <nav aria-label={t("pagination")} className={cn("mt-8 flex-wrap items-center gap-2", loadMore ? "hidden md:flex" : "flex")}>
        {page > 1 ? (
          <Link href={href(page - 1)} rel="prev" className={cn(cell, "gap-1 border-re-steel-500 px-3 hover:border-re-ink")}>
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
          <Link href={href(page + 1)} rel="next" className={cn(cell, "gap-1 border-re-steel-500 px-3 hover:border-re-ink")}>
            {t("next")}
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        ) : null}
      </nav>
    </>
  );
}
