import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Right-align numeric columns (qty, price). */
  align?: "left" | "right";
  /** Mono cell (part numbers, model codes). */
  mono?: boolean;
  /** Tailwind width class for the desktop column, e.g. "w-40". */
  width?: string;
  /** On mobile, render this cell as the card title instead of a labelled row. */
  primary?: boolean;
  /** Hide this column on mobile cards. */
  hideOnMobile?: boolean;
  /** Mobile cards only (e.g. a thumbnail that sits in its own desktop column). */
  hideOnDesktop?: boolean;
  /** On mobile, render the value across the full card width without a label
   *  (action buttons). */
  mobileFull?: boolean;
}

/**
 * Tables are first-class. Desktop (≥ md): a real <table> with hairline rows.
 * Mobile: each row collapses to a stacked card of "label — value" pairs
 * (no horizontal scrolling on a 360px Android).
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  empty,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  caption?: ReactNode;
  empty?: ReactNode;
  className?: string;
}) {
  if (rows.length === 0 && empty) {
    return <div className="border border-dashed border-re-steel-200 p-6 text-re-steel-600">{empty}</div>;
  }
  const primary = columns.find((c) => c.primary);
  const rest = columns.filter((c) => !c.primary && !c.hideOnMobile);
  const desktop = columns.filter((c) => !c.hideOnDesktop);

  return (
    <div className={className}>
      {/* Desktop */}
      <table className="hidden w-full border-collapse text-left text-[0.9375rem] md:table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-re-ink">
            {desktop.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn("re-label px-3 py-2 font-medium", c.align === "right" && "text-right", c.width)}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-re-steel-200 transition-colors hover:bg-re-steel-50">
              {desktop.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    "px-3 py-2.5 align-middle",
                    c.align === "right" && "text-right",
                    c.mono && "re-mono",
                  )}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile */}
      <ul className="divide-y divide-re-steel-200 border-y border-re-steel-200 md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className="py-3">
            {primary && <div className="mb-2 font-semibold">{primary.cell(row)}</div>}
            <dl className="grid grid-cols-[minmax(6.5rem,auto)_1fr] gap-x-3 gap-y-1.5 text-[0.9375rem]">
              {rest.map((c) =>
                c.mobileFull ? (
                  // Every <dd> needs its <dt>; the label is visually hidden here.
                  <div key={c.key} className="contents">
                    <dt className="sr-only">{c.header}</dt>
                    <dd className="col-span-2 mt-1 min-w-0">{c.cell(row)}</dd>
                  </div>
                ) : (
                  <div key={c.key} className="contents">
                    <dt className="re-label self-center">{c.header}</dt>
                    <dd className={cn("min-w-0", c.mono && "re-mono")}>{c.cell(row)}</dd>
                  </div>
                ),
              )}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
