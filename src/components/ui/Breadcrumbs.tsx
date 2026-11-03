import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  /** Locale-less path ("/machines/juki"); omit for the current page. */
  href?: string;
}

/**
 * Visible trail. Pages emit the matching BreadcrumbList JSON-LD themselves
 * (absolute URLs need the locale-aware origin).
 */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  const t = useTranslations("a11y");
  return (
    <nav aria-label={t("breadcrumb")} className={cn("text-[0.8125rem] text-re-steel-600", className)}>
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
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
