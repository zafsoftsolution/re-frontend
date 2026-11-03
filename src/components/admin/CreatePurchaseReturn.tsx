"use client";

/**
 * Purchase-return creation drawer.
 *
 * Pops up from the PO detail page. Operator picks which received PO lines
 * to return, sets quantity + reason, optionally supplier reference and an
 * expected credit. Backend creates a PurchaseReturn in DRAFT state — posting
 * (which pulls stock) happens later from /admin/returns.
 */

import { useEffect, useMemo, useState } from "react";
import { Loader2, Maximize2, Minimize2, Minus, Plus, RefreshCw, X } from "lucide-react";
import {
  djangoAdmin,
  type PurchaseReturnReason,
} from "@/lib/django-admin";
import { useToast } from "@/context/FeedbackContext";
import { cn, formatPrice } from "@/lib/utils";

interface PoiLite {
  id: string;
  product_name: string;
  sku: string;
  color: string;
  size: string;
  ordered_quantity: number;
  received_quantity: number;
  unit_cost: string;
}

interface PoLite {
  id: string;
  number: string;
  supplier_name: string;
  warehouse: string;
  warehouse_name: string;
  currency: string;
  items: PoiLite[];
}

const REASONS: Array<{ value: PurchaseReturnReason; label: string }> = [
  { value: "defective", label: "Defective" },
  { value: "wrong_item", label: "Wrong item received" },
  { value: "over_received", label: "Over-received" },
  { value: "expired", label: "Expired / aged" },
  { value: "other", label: "Other" },
];

interface LineDraft {
  selected: boolean;
  quantity: number;
}

export default function CreatePurchaseReturn({
  po,
  onClose,
  onCreated,
}: {
  po: PoLite;
  onClose: () => void;
  onCreated: (returnId: string) => void;
}) {
  const toast = useToast();

  const [reason, setReason] = useState<PurchaseReturnReason>("defective");
  const [reasonNote, setReasonNote] = useState("");
  const [supplierRef, setSupplierRef] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Fullscreen toggle — when on, the drawer takes the full viewport (minus a
  // 5% left rail) so the operator can see the line table breathing room and
  // the form side-by-side. Default is the standard right-side drawer.
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!fullscreen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFullscreen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  // Only lines with received_quantity > 0 are eligible to return.
  const eligible = po.items.filter((it) => (it.received_quantity || 0) > 0);

  const [lines, setLines] = useState<Record<string, LineDraft>>(() => {
    const initial: Record<string, LineDraft> = {};
    for (const it of eligible) {
      initial[it.id] = { selected: false, quantity: it.received_quantity };
    }
    return initial;
  });

  const itemsTotal = useMemo(() => {
    let total = 0;
    for (const it of eligible) {
      const d = lines[it.id];
      if (!d || !d.selected) continue;
      total += Number(it.unit_cost) * d.quantity;
    }
    return total;
  }, [lines, eligible]);

  function update(id: string, patch: Partial<LineDraft>) {
    setLines((p) => ({ ...p, [id]: { ...p[id], ...patch } }));
  }

  async function submit() {
    const items = eligible
      .filter((it) => lines[it.id]?.selected && lines[it.id]?.quantity > 0)
      .map((it) => ({
        purchase_order_item: it.id,
        quantity: lines[it.id].quantity,
      }));
    if (items.length === 0) {
      toast.error("Pick at least one line to return");
      return;
    }
    setSubmitting(true);
    try {
      const ret = await djangoAdmin.purchaseReturns.create({
        purchase_order: po.id,
        warehouse: po.warehouse,
        reason,
        reason_note: reasonNote,
        supplier_reference: supplierRef,
        refund_amount: refundAmount.trim() === "" ? null : Number(refundAmount),
        notes,
        items,
      });
      toast.success("Return created", ret.number);
      onCreated(ret.id);
    } catch (e) {
      const err = e as Error & { fields?: Record<string, string[]> };
      const msg =
        err.fields && Object.keys(err.fields).length
          ? Object.values(err.fields)[0]?.[0] ?? err.message
          : err.message;
      toast.error("Couldn't create return", msg);
    } finally {
      setSubmitting(false);
    }
  }

  const selectedCount = eligible.filter((it) => lines[it.id]?.selected).length;

  if (eligible.length === 0) {
    return (
      <div
        className="fixed inset-0 z-[90] bg-navy/40 backdrop-blur-sm flex justify-end"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="bg-white w-full max-w-md h-full p-6 jmn-drawer-in shadow-2xl shadow-navy/20">
          <header className="flex items-start justify-between">
            <h2 className="font-display text-2xl text-navy">Nothing to return</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="h-9 w-9 grid place-items-center rounded-md hover:bg-[#F4F5F7]"
            >
              <X size={18} />
            </button>
          </header>
          <p className="mt-3 text-sm text-ink/65">
            No goods have been received against this PO yet. Receive a delivery first,
            then you can return defective units back to the supplier.
          </p>
        </div>
      </div>
    );
  }

  return (
    // stopPropagation on the backdrop because this drawer can be rendered
    // inside another drawer (the PO detail page). Without it, any click on
    // our backdrop would bubble to the parent's onClick handler.
    <div
      className="fixed inset-0 z-[90] bg-navy/40 backdrop-blur-sm flex justify-end"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        className={cn(
          "bg-white h-full overflow-hidden flex flex-col shadow-2xl shadow-navy/20 jmn-drawer-in",
          fullscreen
            ? "w-full md:w-[95vw]"
            : "w-full max-w-2xl",
        )}
      >
        <header className="px-6 py-5 border-b border-[var(--jmn-line)] flex items-start justify-between shrink-0 gap-3">
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.3em] uppercase text-gold mb-1">
              Return to supplier
            </p>
            <h2 className="font-display text-2xl text-navy truncate">{po.number}</h2>
            <p className="text-xs text-ink/55 mt-1 truncate">
              {po.supplier_name} · pulling from {po.warehouse_name}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setFullscreen((s) => !s)}
              aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
              title={fullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
              className="h-9 w-9 grid place-items-center rounded-md hover:bg-[#F4F5F7] transition-colors text-navy"
            >
              {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="h-9 w-9 grid place-items-center rounded-md hover:bg-[#F4F5F7] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/*
         * Body layout:
         *   - default drawer (narrow): stacked, items table on top, form below
         *   - fullscreen: items on the left taking 2/3, form on the right
         * The same content renders in both — only the grid template changes.
         */}
        <div
          className={cn(
            "flex-1 overflow-y-auto",
            fullscreen
              ? "grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-0 lg:gap-6 px-6 py-5"
              : "px-6 py-5 space-y-5",
          )}
        >
          {/* ── Items ─────────────────────────────────────────────────── */}
          <section className={cn(!fullscreen && "")}>
            <header className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] tracking-[0.3em] uppercase text-gold">
                Items
              </h3>
              {selectedCount > 0 && (
                <span className="text-[11px] text-ink/55 tabular">
                  {selectedCount} of {eligible.length} selected · Items total{" "}
                  <span className="text-navy font-medium">
                    {formatPrice(itemsTotal, po.currency)}
                  </span>
                </span>
              )}
            </header>

            {/* Proper table layout — fixed columns so the qty stepper can't
                bully the product cell. The product cell gets all remaining
                space and truncates instead of wrapping mid-word. */}
            <div className="border border-[var(--jmn-line)] rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#FAFAFA] text-[10px] tracking-[0.18em] uppercase text-ink/55">
                  <tr>
                    <th className="text-left font-medium pl-3 pr-2 py-2 w-[36px]"></th>
                    <th className="text-left font-medium px-2 py-2">Product</th>
                    <th className="text-right font-medium px-2 py-2 w-[100px]">
                      Received
                    </th>
                    <th className="text-right font-medium px-2 py-2 w-[140px]">
                      Return qty
                    </th>
                    <th className="text-right font-medium pl-2 pr-3 py-2 w-[100px]">
                      Unit cost
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {eligible.map((it) => {
                    const draft = lines[it.id];
                    const variant = [it.color, it.size].filter(Boolean).join(" · ");
                    const selected = !!draft?.selected;
                    return (
                      <tr
                        key={it.id}
                        onClick={(e) => {
                          // Toggling via the row is faster — but skip if the
                          // user clicked an interactive element inside.
                          const target = e.target as HTMLElement;
                          if (target.closest("input,button,label")) return;
                          update(it.id, { selected: !selected });
                        }}
                        className={cn(
                          "border-t border-[var(--jmn-line)] cursor-pointer transition-colors",
                          selected
                            ? "bg-amber-50/60 hover:bg-amber-50"
                            : "hover:bg-[#FAFAFA]",
                        )}
                      >
                        <td className="pl-3 pr-2 py-2.5">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) =>
                              update(it.id, { selected: e.target.checked })
                            }
                            className="h-4 w-4 accent-navy"
                          />
                        </td>
                        <td className="px-2 py-2.5 min-w-0">
                          <p className="text-sm text-navy truncate font-medium">
                            {it.product_name}
                          </p>
                          <p className="text-[11px] text-ink/55 tabular truncate">
                            {it.sku}
                            {variant && (
                              <span className="text-ink/40"> · {variant}</span>
                            )}
                          </p>
                        </td>
                        <td className="px-2 py-2.5 text-right tabular text-ink/65">
                          {it.received_quantity}
                        </td>
                        <td className="px-2 py-2.5">
                          {selected ? (
                            <QtyStepper
                              value={draft.quantity}
                              min={1}
                              max={it.received_quantity}
                              onChange={(v) => update(it.id, { quantity: v })}
                            />
                          ) : (
                            <p className="text-[11px] text-ink/35 text-right tabular pr-2">
                              —
                            </p>
                          )}
                        </td>
                        <td className="pl-2 pr-3 py-2.5 text-right tabular text-ink/80">
                          {formatPrice(Number(it.unit_cost), po.currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Form ──────────────────────────────────────────────────── */}
          <section className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Reason">
                <select
                  value={reason}
                  onChange={(e) =>
                    setReason(e.target.value as PurchaseReturnReason)
                  }
                  className="cpr-input"
                >
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Supplier ref">
                <input
                  value={supplierRef}
                  onChange={(e) => setSupplierRef(e.target.value)}
                  placeholder="RMA / RTV #"
                  className="cpr-input"
                />
              </Field>
            </div>
            <Field label="Reason note (optional)">
              <input
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
                placeholder="Cracked seams on 8 units, photos sent…"
                className="cpr-input"
              />
            </Field>
            <Field
              label={`Expected credit (${po.currency})`}
              hint="Leave blank to default to items total."
            >
              <input
                type="number"
                min={0}
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder={itemsTotal ? itemsTotal.toFixed(2) : "0.00"}
                className="cpr-input tabular"
              />
            </Field>
            <Field label="Internal notes (optional)">
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="cpr-input"
              />
            </Field>
          </section>
        </div>

        <footer className="px-6 py-4 border-t border-[var(--jmn-line)] flex justify-end gap-2 shrink-0 bg-[#FAFAFA]">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-md border border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-ink/65 hover:text-navy hover:border-navy/30 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || selectedCount === 0}
            className="h-9 px-4 rounded-md bg-navy text-cream text-[11px] tracking-[0.18em] uppercase hover:opacity-90 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
          >
            {submitting ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
            Create return
          </button>
        </footer>

        <style jsx global>{`
          .cpr-input {
            width: 100%;
            min-height: 36px;
            padding: 6px 10px;
            border: 1px solid var(--jmn-line);
            border-radius: 6px;
            background: white;
            font-size: 13px;
            color: var(--jmn-ink, #0a0a0a);
          }
          .cpr-input:focus {
            outline: none;
            border-color: var(--jmn-navy, #0e1a3a);
            box-shadow: 0 0 0 3px rgba(14, 26, 58, 0.08);
          }
          /* −/+ stepper used in the line table. Compact and won't crush the
             product cell — fixed 120px total width vs the old 256px input. */
          .cpr-stepper {
            display: inline-flex;
            width: 110px;
            height: 30px;
            margin-left: auto;
            border: 1px solid var(--jmn-line);
            border-radius: 4px;
            overflow: hidden;
            background: white;
          }
          .cpr-stepper:focus-within {
            border-color: var(--jmn-navy);
            box-shadow: 0 0 0 3px rgba(14, 26, 58, 0.08);
          }
          .cpr-stepper button {
            width: 30px;
            display: grid;
            place-items: center;
            color: var(--jmn-navy);
            transition: background 120ms;
          }
          .cpr-stepper button:hover:not(:disabled) {
            background: color-mix(in srgb, var(--jmn-navy) 6%, transparent);
          }
          .cpr-stepper button:disabled {
            opacity: 0.3;
            cursor: not-allowed;
          }
          .cpr-stepper-input {
            flex: 1;
            width: 0;
            min-width: 0;
            border: none;
            outline: none;
            background: transparent;
            padding: 0;
            text-align: center;
            font-size: 13px;
            font-variant-numeric: tabular-nums;
            color: var(--jmn-ink, #0a0a0a);
          }
          .cpr-stepper-input::-webkit-outer-spin-button,
          .cpr-stepper-input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          .cpr-stepper-input {
            -moz-appearance: textfield;
            appearance: textfield;
          }
        `}</style>
      </div>
    </div>
  );
}

function QtyStepper({
  value,
  onChange,
  min = 1,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const clamp = (n: number) =>
    Math.max(min, max != null ? Math.min(max, n) : n);
  return (
    <div className="cpr-stepper">
      <button
        type="button"
        onClick={() => onChange(clamp((Number(value) || min) - 1))}
        disabled={(Number(value) || min) <= min}
        aria-label="Decrease"
        tabIndex={-1}
      >
        <Minus size={12} strokeWidth={2.25} />
      </button>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isNaN(n)) return;
          onChange(clamp(n));
        }}
        onFocus={(e) => e.currentTarget.select()}
        className="cpr-stepper-input"
      />
      <button
        type="button"
        onClick={() => onChange(clamp((Number(value) || 0) + 1))}
        disabled={max != null && (Number(value) || 0) >= max}
        aria-label="Increase"
        tabIndex={-1}
      >
        <Plus size={12} strokeWidth={2.25} />
      </button>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] tracking-[0.18em] uppercase text-ink/55 mb-1">
        {label}
      </span>
      {children}
      {hint && <p className="text-[11px] text-ink/45 mt-1">{hint}</p>}
    </label>
  );
}
