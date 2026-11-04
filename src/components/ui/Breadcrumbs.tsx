import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  /** Locale-less path ("/machines/juki"); omit for the current page. */
  href?: string;
}

/** The nearest linked ancestor — the phone "back" target. Home-only trails get none. */
export function parentCrumb(items: Crumb[]): Crumb | null {
  const linked = items.slice(0, -1).filter((c) => c.href);
  return linked.length > 1 ? linked[linked.length - 1] : null;
}

/**
 * Visible trail. Pages emit the matching BreadcrumbList JSON-LD themselves
 * (absolute URLs need the locale-aware origin).
 *
 * Phones (< md) get one 44px "‹ Parent" link instead of a wrapping trail of
 * 28px links; the full trail shows from md up. A trail that is only
 * "Home › Page" shows nothing on phones (the logo already goes home).
 */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  const t = useTranslations("a11y");
  const parent = parentCrumb(items);
  return (
    <nav aria-label={t("breadcrumb")} className={cn("text-[0.8125rem] text-re-steel-600", !parent && "max-md:hidden", className)}>
      {parent?.href && (
        <Link
          href={parent.href}
          className="-ml-1 inline-flex min-h-11 max-w-full items-center gap-1 pr-2 text-[0.875rem] font-semibold text-re-ink active:text-re-blue md:hidden"
        >
          <ChevronLeft aria-hidden className="size-4 shrink-0 text-re-steel-600" />
          <span className="truncate">{parent.label}</span>
        </Link>
      )}
      <ol className="hidden flex-wrap items-center gap-x-1 gap-y-0.5 md:flex">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="inline-flex items-center gap-1">
              {c.href && !last ? (
                <Link href={c.href} className="py-1 hover:text-re-blue hover:underline underline-offset-2">
                  {c.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={cn(last && "text-re-ink")}>
                  {c.label}
                </span>
              )}
              {!last && <ChevronRight aria-hidden className="size-3.5 text-re-steel-400" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
