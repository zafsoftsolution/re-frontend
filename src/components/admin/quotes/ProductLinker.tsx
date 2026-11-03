"use client";

import { useEffect, useState } from "react";
import { Link2, Loader2, Search, X } from "lucide-react";
import { djangoAdmin } from "@/lib/django-admin";
import { field } from "@/components/admin/ui/AdminDialog";

interface Hit {
  slug: string;
  name: string;
  part_number: string;
  sku: string;
  price: string | null;
}

/**
 * Inline catalogue search used to link a free-text quote line to a product
 * (needed before that line can be converted into an order).
 */
export default function ProductLinker({
  initialQuery,
  onPick,
  onCancel,
}: {
  initialQuery: string;
  onPick: (hit: Hit) => void;
  onCancel: () => void;
}) {
  const [q, setQ] = useState(initialQuery);
  const [res, setRes] = useState<{ q: string; hits: Hit[] } | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      djangoAdmin.products
        .list({ search: term })
        .then((r) => {
          if (!cancelled) setRes({ q: term, hits: (r.results as Hit[]).slice(0, 8) });
        })
        .catch(() => !cancelled && setRes({ q: term, hits: [] }));
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [q]);

  const term = q.trim();
  const loading = term.length >= 2 && res?.q !== term;
  const hits = term.length >= 2 && res?.q === term ? res.hits : [];

  return (
    <div className="mt-2 border border-re-blue bg-white p-2 w-full min-w-[260px]">
      <div className="flex items-center gap-2">
        <Search size={14} className="text-ink/55 shrink-0" aria-hidden />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search catalogue by part number, SKU or name"
          placeholder="Part no., SKU or name"
          className={field.input + " h-9"}
        />
        <button type="button" onClick={onCancel} aria-label="Cancel linking" className="h-9 w-9 grid place-items-center text-ink/60 hover:text-navy">
          <X size={14} />
        </button>
      </div>
      <ul className="mt-1 max-h-56 overflow-y-auto">
        {loading && (
          <li className="px-2 py-2 text-[12px] text-ink/60 flex items-center gap-2">
            <Loader2 size={12} className="animate-spin" aria-hidden /> Searching…
          </li>
        )}
        {!loading && term.length >= 2 && hits.length === 0 && (
          <li className="px-2 py-2 text-[12px] text-ink/60">No matching parts.</li>
        )}
        {hits.map((h) => (
          <li key={h.slug}>
            <button
              type="button"
              onClick={() => onPick(h)}
              className="w-full text-left px-2 py-2 hover:bg-re-steel-50 flex items-center gap-2"
            >
              <Link2 size={12} className="text-re-blue shrink-0" aria-hidden />
              <span className="min-w-0">
                <span className="block text-[13px] text-navy truncate">{h.name}</span>
                <span className="block part-no text-[11px] text-ink/60">
                  {h.part_number || "—"} · {h.sku}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
