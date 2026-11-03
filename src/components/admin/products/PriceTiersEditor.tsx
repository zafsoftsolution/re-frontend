"use client";

import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TierRow {
  min_quantity: string;
  unit_price: string;
}

/**
 * Validate tier rows. Returns per-row error messages (index → message) plus
 * soft warnings. Rules: whole min qty ≥ 1, unit price ≥ 0, min quantities
 * unique and strictly ascending (the order shown is the order saved).
 */
export function validateTiers(rows: TierRow[], moq: number): {
  errors: Record<number, string>;
  warnings: string[];
} {
  const errors: Record<number, string> = {};
  const warnings: string[] = [];
  let prevQty = 0;
  let prevPrice = Infinity;
  const seen = new Set<number>();
  rows.forEach((r, i) => {
    const q = Number(r.min_quantity);
    const p = Number(r.unit_price);
    if (!r.min_quantity || !Number.isInteger(q) || q < 1) {
      errors[i] = "Min qty must be a whole number ≥ 1.";
      return;
    }
    if (r.unit_price === "" || !Number.isFinite(p) || p < 0) {
      errors[i] = "Unit price must be a number ≥ 0.";
      return;
    }
    if (seen.has(q)) {
      errors[i] = `Duplicate min qty ${q}.`;
      return;
    }
    if (q <= prevQty) {
      errors[i] = "Min qty must increase row by row.";
      return;
    }
    if (p >= prevPrice) warnings.push(`Row ${i + 1}: price doesn't drop at ${q}+ pcs.`);
    if (q < moq) warnings.push(`Row ${i + 1}: ${q} is below the minimum order quantity (${moq}).`);
    seen.add(q);
    prevQty = q;
    prevPrice = p;
  });
  return { errors, warnings };
}

export default function PriceTiersEditor({
  rows,
  onChange,
  moq,
  basePrice,
}: {
  rows: TierRow[];
  onChange: (rows: TierRow[]) => void;
  moq: number;
  basePrice: string;
}) {
  const { errors, warnings } = validateTiers(rows, moq);
  const set = (i: number, patch: Partial<TierRow>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div>
      <p className="text-[12px] text-ink/60 mb-2">
        Quantity breaks, e.g. 10+ pcs at a lower unit price. Base price{" "}
        <span className="tabular text-navy">৳ {basePrice || "—"}</span> applies below the first break.
        Shown publicly only for direct-sale parts.
      </p>
      {rows.length > 0 && (
        <table className="w-full text-sm mb-2" data-testid="price-tiers">
          <thead>
            <tr className="text-left text-[10px] tracking-[0.12em] uppercase text-ink/60">
              <th scope="col" className="pb-1 font-semibold">Min qty</th>
              <th scope="col" className="pb-1 font-semibold">Unit price (BDT)</th>
              <th scope="col" className="pb-1 w-10"><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="align-top">
                <td className="pr-2 pb-2">
                  <input
                    inputMode="numeric"
                    value={r.min_quantity}
                    onChange={(e) => set(i, { min_quantity: e.target.value.replace(/\D/g, "") })}
                    aria-label={`Tier ${i + 1} minimum quantity`}
                    aria-invalid={!!errors[i] || undefined}
                    className={cn(tierInput, errors[i] && "border-rose-600")}
                    placeholder="10"
                  />
                </td>
                <td className="pr-2 pb-2">
                  <input
                    inputMode="decimal"
                    value={r.unit_price}
                    onChange={(e) => set(i, { unit_price: e.target.value.replace(/[^\d.]/g, "") })}
                    aria-label={`Tier ${i + 1} unit price`}
                    className={cn(tierInput, errors[i] && "border-rose-600")}
                    placeholder="0.00"
                  />
                  {errors[i] && <span className="block mt-1 text-[12px] text-rose-700">{errors[i]}</span>}
                </td>
                <td className="pb-2">
                  <button
                    type="button"
                    onClick={() => onChange(rows.filter((_, j) => j !== i))}
                    aria-label={`Remove tier ${i + 1}`}
                    className="h-10 w-10 grid place-items-center text-ink/60 hover:text-rose-700"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {warnings.length > 0 && (
        <ul className="mb-2 text-[12px] text-[#8A5200] list-disc pl-4">
          {warnings.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}
      <button
        type="button"
        onClick={() => {
          const last = rows[rows.length - 1];
          const nextQty = last ? String((Number(last.min_quantity) || 0) * 2 || 10) : String(Math.max(10, moq));
          onChange([...rows, { min_quantity: nextQty, unit_price: "" }]);
        }}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-re-blue-text hover:underline"
      >
        <Plus size={14} aria-hidden /> Add quantity break
      </button>
    </div>
  );
}

const tierInput =
  "w-full h-10 px-3 bg-white border border-re-steel-300 tabular text-sm text-re-ink outline-none focus:border-re-blue";
