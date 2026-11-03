"use client";

/**
 * Sales return creation drawer.
 *
 * Pops up from the order detail page or order drawer. The operator picks
 * which OrderItem rows to return, sets quantity + condition, picks a reason,
 * and submits. Backend creates an OrderReturn in REQUESTED state — actually
 * moving stock and refunding happens later from /admin/returns.
 */

import { useEffect, useMemo, useState } from "react";
import { Loader2, Maximize2, Minimize2, Minus, Plus, RefreshCw, X } from "lucide-react";
import {
  djangoAdmin,
  type OrderReturnItemCondition,
  type OrderReturnReason,
  type PaginatedResponse,
} from "@/lib/django-admin";
import { useToast } from "@/context/FeedbackContext";
import { cn, formatPrice } from "@/lib/utils";

interface OrderItemLite {
  id: string;
  product_name: string;
  sku: string;
  color: string;
  size: string;
  quantity: number;
  unit_price: string;
  total: string;
}

interface OrderLite {
  id: string;
  order_number: string;
  customer_email: string;
  currency: string;
  items: OrderItemLite[];
}

interface WarehouseLite {
  id: string;
  name: string;
  code: string;
  is_default?: boolean;
}

const REASONS: Array<{ value: OrderReturnReason; label: string }> = [
  { value: "defective", label: "Defective / damaged" },
  { value: "wrong_item", label: "Wrong item shipped" },
  { value: "wrong_size", label: "Wrong size" },
  { value: "not_as_described", label: "Not as described" },
  { value: "changed_mind", label: "Customer changed mind" },
  { value: "late", label: "Arrived late" },
  { value: "other", label: "Other" },
];

const CONDITIONS: Array<{ value: OrderReturnItemCondition; label: string }> = [
  { value: "resalable", label: "Resalable (back to stock)" },
  { value: "damaged", label: "Damaged (write off)" },
  { value: "opened", label: "Opened (write off)" },
];

interface LineDraft {
  selected: boolean;
  quantity: number;
  condition: OrderReturnItemCondition;
}

export default function CreateOrderReturn({
  order,
  onClose,
  onCreated,
}: {
  order: OrderLite;
  onClose: () => void;
  onCreated: (returnId: string) => void;
}) {
  const toast = useToast();

  const [warehouses, setWarehouses] = useState<WarehouseLite[] | null>(null);
  const [warehouseId, setWarehouseId] = useState("");
  const [reason, setReason] = useState<OrderReturnReason>("changed_mind");
  const [reasonNote, setReasonNote] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Fullscreen toggle. Same pattern as CreatePurchaseReturn — the standard
  // drawer is too narrow when there are many items to pick.
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

  const [lines, setLines] = useState<Record<string, LineDraft>>(() => {
    const initial: Record<string, LineDraft> = {};
    for (const it of order.items) {
      initial[it.id] = { selected: false, quantity: it.quantity, condition: "resalable" };
    }
    return initial;
  });

  useEffect(() => {
    djangoAdmin.warehouses
      .list({ page_size: 100 })
      .then((data) => {
        const items =
          (data as PaginatedResponse<WarehouseLite>).results ??
          (data as unknown as WarehouseLite[]);
        setWarehouses(items);
        const def = items.find((w) => w.is_default) ?? items[0];
        if (def) setWarehouseId(def.id);
      })
      .catch(() => {});
  }, []);

  // Live items_total preview to make the refund-amount default obvious.
  const itemsTotal = useMemo(() => {
    let total = 0;
    for (const it of order.items) {
      const draft = lines[it.id];
      if (!draft || !draft.selected) continue;
      total += Number(it.unit_price) * draft.quantity;
    }
    return total;
  }, [lines, order.items]);

  function update(id: string, patch: Partial<LineDraft>) {
    setLines((p) => ({ ...p, [id]: { ...p[id], ...patch } }));
  }

  async function submit() {
    const items = order.items
      .filter((it) => lines[it.id]?.selected && lines[it.id]?.quantity > 0)
      .map((it) => ({
        order_item: it.id,
        quantity: lines[it.id].quantity,
        condition: lines[it.id].condition,
      }));
    if (items.length === 0) {
      toast.error("Pick at least one item to return");
      return;
    }
    if (!warehouseId) {
      toast.error("Pick a destination warehouse");
      return;
    }
    setSubmitting(true);
    try {
      const ret = await djangoAdmin.orderReturns.create({
        order: order.id,
        warehouse: warehouseId,
        reason,
        reason_note: reasonNote,
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

  const selectedCount = order.items.filter((it) => lines[it.id]?.selected).length;

  return (
    // stopPropagation on the backdrop because this drawer is sometimes
    // rendered inside another drawer (e.g. inside OrderDrawer). Without it,
    // a click on our backdrop would bubble to the parent and close it.
    <div
      className="fixed inset-0 z-[90] bg-navy/40 backdrop-blur-sm flex justify-end"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        className={cn(
          "bg-white h-full overflow-hidden flex flex-col shadow-2xl shadow-navy/20 jmn-drawer-in",
          fullscreen ? "w-full md:w-[95vw]" : "w-full max-w-2xl",
        )}
      >
        <header className="px-6 py-5 border-b border-[var(--jmn-line)] flex items-start justify-between shrink-0 gap-3">
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.3em] uppercase text-gold mb-1">
              New return
            </p>
            <h2 className="font-display text-2xl text-navy truncate">
              {order.order_number}
            </h2>
            <p className="text-xs text-ink/55 mt-1 truncate">{order.customer_email}</p>
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

        <div
          className={cn(
            "flex-1 overflow-y-auto",
            fullscreen
              ? "grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-0 lg:gap-6 px-6 py-5"
              : "px-6 py-5 space-y-5",
          )}
        >
          {/* ── Items table ──────────────────────────────────────────── */}
          <section>
            <header className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] tracking-[0.3em] uppercase text-gold">
                Items
              </h3>
              {selectedCount > 0 && (
                <span className="text-[11px] text-ink/55 tabular">
                  {selectedCount} of {order.items.length} selected · Items total{" "}
                  <span className="text-navy font-medium">
                    {formatPrice(itemsTotal, order.currency)}
                  </span>
                </span>
              )}
            </header>
            <div className="border border-[var(--jmn-line)] rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#FAFAFA] text-[10px] tracking-[0.18em] uppercase text-ink/55">
                  <tr>
                    <th className="text-left font-medium pl-3 pr-2 py-2 w-[36px]"></th>
                    <th className="text-left font-medium px-2 py-2">Product</th>
                    <th className="text-right font-medium px-2 py-2 w-[80px]">
                      Sold
                    </th>
                    <th className="text-right font-medium px-2 py-2 w-[140px]">
                      Return qty
                    </th>
                    <th className="text-left font-medium px-2 py-2 w-[180px]">
                      Condition
                    </th>
                    <th className="text-right font-medium pl-2 pr-3 py-2 w-[100px]">
                      Line
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((it) => {
                    const draft = lines[it.id];
                    const variant = [it.color, it.size].filter(Boolean).join(" · ");
                    return (
                      <tr
                        key={it.id}
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest("input,button,select,label")) return;
                          update(it.id, { selected: !draft.selected });
                        }}
                        className={cn(
                          "border-t border-[var(--jmn-line)] cursor-pointer transition-colors",
                          draft.selected
                            ? "bg-amber-50/60 hover:bg-amber-50"
                            : "hover:bg-[#FAFAFA]",
                        )}
                      >
                        <td className="pl-3 pr-2 py-2.5">
                          <input
                            type="checkbox"
                            checked={draft.selected}
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
                          {it.quantity}
                        </td>
                        <td className="px-2 py-2.5">
                          {draft.selected ? (
                            <QtyStepper
                              value={draft.quantity}
                              min={1}
                              max={it.quantity}
                              onChange={(v) => update(it.id, { quantity: v })}
                            />
                          ) : (
                            <p className="text-[11px] text-ink/35 text-right pr-2">—</p>
                          )}
                        </td>
                        <td className="px-2 py-2.5">
                          {draft.selected ? (
                            <select
                              value={draft.condition}
                              onChange={(e) =>
                                update(it.id, {
                                  condition: e.target.value as OrderReturnItemCondition,
                                })
                              }
                              className="cor-input !min-h-[30px] !py-1 !text-[12px]"
                            >
                              {CONDITIONS.map((c) => (
                                <option key={c.value} value={c.value}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <p className="text-[11px] text-ink/35">—</p>
                          )}
                        </td>
                        <td className="pl-2 pr-3 py-2.5 text-right tabular text-ink/80">
                          {draft.selected
                            ? formatPrice(
                                Number(it.unit_price) * draft.quantity,
                                order.currency,
                              )
                            : "—"}
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
          {/* Reason row */}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Reason">
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as OrderReturnReason)}
                className="cor-input"
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Restock warehouse">
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="cor-input"
              >
                <option value="">— choose —</option>
                {warehouses?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Reason note (optional)">
            <input
              value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value)}
              placeholder="Customer said the colour didn't match…"
              className="cor-input"
            />
          </Field>
          <Field
            label={`Refund amount (${order.currency})`}
            hint="Leave blank to default to items total. Use a smaller number for restocking fees."
          >
            <input
              type="number"
              min={0}
              step="0.01"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder={itemsTotal ? itemsTotal.toFixed(2) : "0.00"}
              className="cor-input tabular"
            />
          </Field>
          <Field label="Internal notes (optional)">
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="cor-input"
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
          .cor-input {
            width: 100%;
            min-height: 36px;
            padding: 6px 10px;
            border: 1px solid var(--jmn-line);
            border-radius: 6px;
            background: white;
            font-size: 13px;
            color: var(--jmn-ink, #0a0a0a);
          }
          .cor-input:focus {
            outline: none;
            border-color: var(--jmn-navy, #0e1a3a);
            box-shadow: 0 0 0 3px rgba(14, 26, 58, 0.08);
          }
          /* Compact qty stepper for the line table — same shape as the PO
             builder, just narrower so it doesn't push the condition select
             off the row in a constrained drawer. */
          .cor-stepper {
            display: inline-flex;
            width: 110px;
            height: 30px;
            margin-left: auto;
            border: 1px solid var(--jmn-line);
            border-radius: 4px;
            overflow: hidden;
            background: white;
          }
          .cor-stepper:focus-within {
            border-color: var(--jmn-navy);
            box-shadow: 0 0 0 3px rgba(14, 26, 58, 0.08);
          }
          .cor-stepper button {
            width: 30px;
            display: grid;
            place-items: center;
            color: var(--jmn-navy);
            transition: background 120ms;
          }
          .cor-stepper button:hover:not(:disabled) {
            background: color-mix(in srgb, var(--jmn-navy) 6%, transparent);
          }
          .cor-stepper button:disabled {
            opacity: 0.3;
            cursor: not-allowed;
          }
          .cor-stepper-input {
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
          .cor-stepper-input::-webkit-outer-spin-button,
          .cor-stepper-input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          .cor-stepper-input {
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
    <div className="cor-stepper">
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
        className="cor-stepper-input"
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
