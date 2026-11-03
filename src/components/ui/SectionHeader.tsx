import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Document-style section header: a hairline across the full width with a
 * short red bar on top-left (like a parts-book sheet header), a mono index,
 * the title, optional subtitle and a trailing action (e.g. "All brands →").
 */
export function SectionHeader({
  title,
  subtitle,
  index,
  action,
  as: Heading = "h2",
  className,
  id,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Sheet number, e.g. "01". Latin, mono. */
  index?: string;
  action?: ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
  id?: string;
}) {
  return (
    <header className={cn("relative border-t border-re-steel-200 pt-5", className)}>
      <span aria-hidden className="absolute -top-px left-0 h-[3px] w-12 bg-re-red" />
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          {index && <span className="re-label mb-1.5 block">§ {index}</span>}
          <Heading id={id} className="text-[1.625rem] text-re-ink sm:text-[2rem]">
            {title}
          </Heading>
          {subtitle && <p className="mt-1.5 max-w-2xl text-re-steel-600">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
