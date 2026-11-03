import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";
import { cn } from "@/lib/utils";

/**
 * Catalogue page header in the parts-book idiom: breadcrumb, a red-squared
 * eyebrow, the title, a lead, and a "title block" of mono spec cells
 * (country, model count, …) like the corner box of an engineering drawing.
 */
export function SheetHeader({
  crumbs,
  eyebrow,
  title,
  lead,
  meta = [],
  aside,
  children,
  titleClassName,
}: {
  crumbs: Crumb[];
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  meta?: { label: string; value: ReactNode }[];
  aside?: ReactNode;
  children?: ReactNode;
  titleClassName?: string;
}) {
  return (
    <header className="re-grid-paper border-b border-re-steel-200">
      <div className="re-shell py-5 md:py-8">
        <Breadcrumbs items={crumbs} />
        <div className={cn("mt-6 grid gap-6 md:mt-8", aside && "md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-10")}>
          <div className="min-w-0">
            {eyebrow && (
              <p className="re-label flex items-center gap-2">
                <span aria-hidden className="inline-block size-2.5 shrink-0 bg-re-red" />
                {eyebrow}
              </p>
            )}
            <h1
              className={cn(
                "mt-3 max-w-[24ch] text-[2.125rem] leading-[1.02] font-extrabold tracking-[-0.01em] text-re-ink [font-stretch:75%] sm:text-[2.75rem] lg:text-[3.25rem]",
                "bn:text-[1.875rem] bn:leading-[1.3] bn:font-bold bn:tracking-normal bn:[font-stretch:100%] bn:sm:text-[2.375rem]",
                titleClassName,
              )}
            >
              {title}
            </h1>
            {lead && <div className="mt-4 max-w-2xl text-[1.0625rem] text-re-steel-600">{lead}</div>}
          </div>
          {aside && <div className="min-w-0">{aside}</div>}
        </div>
        {meta.length > 0 && (
          <dl className="mt-6 inline-grid grid-flow-col auto-cols-max divide-x divide-re-steel-200 border border-re-steel-200 bg-re-paper max-sm:grid-flow-row max-sm:auto-cols-auto max-sm:grid-cols-2 max-sm:divide-x-0 max-sm:[&>div:nth-child(odd)]:border-r max-sm:[&>div]:border-re-steel-200 max-sm:[&>div:nth-child(n+3)]:border-t">
            {meta.map((m) => (
              <div key={m.label} className="px-3 py-2 sm:px-4">
                <dt className="re-label">{m.label}</dt>
                <dd className="re-mono mt-0.5 text-[0.9375rem] font-medium text-re-ink">{m.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {children}
      </div>
    </header>
  );
}
