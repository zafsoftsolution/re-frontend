"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import EmptyState from "./EmptyState";

export interface Column<T> {
  key: string;
  header: string;
  accessor?: (row: T) => string | number;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
  width?: string;
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchAccessor?: (row: T) => string;
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  toolbar?: ReactNode;
  onRowClick?: (row: T) => void;
}

export default function DataTable<T>({
  rows,
  columns,
  rowKey,
  searchable = true,
  searchPlaceholder = "Search…",
  searchAccessor,
  pageSize = 10,
  emptyTitle = "Nothing here yet.",
  emptyDescription,
  toolbar,
  onRowClick,
}: Props<T>) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!query || !searchAccessor) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => searchAccessor(r).toLowerCase().includes(q));
  }, [rows, query, searchAccessor]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.accessor) return filtered;
    const cp = [...filtered];
    cp.sort((a, b) => {
      const av = col.accessor!(a);
      const bv = col.accessor!(b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return cp;
  }, [filtered, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div className="bg-white border border-[var(--jmn-line)] rounded-lg overflow-hidden">
      {(searchable || toolbar) && (
        <div className="px-4 py-3 border-b border-[var(--jmn-line)] flex flex-wrap items-center gap-3">
          {searchable && (
            <div className="flex-1 min-w-[220px] flex items-center gap-2 px-3 h-9 rounded-md bg-[#F4F5F7]">
              <Search size={14} className="text-ink/45" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink/40"
              />
            </div>
          )}
          {toolbar}
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAFA] text-[11px] tracking-[0.18em] uppercase text-ink/55">
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      style={c.width ? { width: c.width } : undefined}
                      className={cn(
                        "text-left font-medium px-4 py-3",
                        c.align === "right" && "text-right",
                        c.align === "center" && "text-center",
                        c.className
                      )}
                    >
                      {c.sortable ? (
                        <button
                          onClick={() => toggleSort(c.key)}
                          className="inline-flex items-center gap-1 hover:text-navy transition-colors"
                        >
                          {c.header}
                          {sortKey === c.key && (
                            sortDir === "asc" ? (
                              <ArrowUp size={11} />
                            ) : (
                              <ArrowDown size={11} />
                            )
                          )}
                        </button>
                      ) : (
                        c.header
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => (
                  <tr
                    key={rowKey(r)}
                    onClick={onRowClick ? () => onRowClick(r) : undefined}
                    className={cn(
                      "border-t border-[var(--jmn-line)] transition-colors",
                      onRowClick && "cursor-pointer hover:bg-[#FAFAFA]"
                    )}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          "px-4 py-3.5 align-middle",
                          c.align === "right" && "text-right",
                          c.align === "center" && "text-center",
                          c.className
                        )}
                      >
                        {c.render ? c.render(r) : c.accessor ? c.accessor(r) : ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-[var(--jmn-line)] flex items-center justify-between text-xs text-ink/55">
            <span className="tabular">
              Showing{" "}
              <span className="text-navy">
                {(safePage - 1) * pageSize + 1}–
                {Math.min(safePage * pageSize, sorted.length)}
              </span>{" "}
              of <span className="text-navy">{sorted.length}</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="h-8 w-8 grid place-items-center rounded-md hover:bg-[#F4F5F7] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-3 tabular text-navy">
                {safePage} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="h-8 w-8 grid place-items-center rounded-md hover:bg-[#F4F5F7] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                aria-label="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
