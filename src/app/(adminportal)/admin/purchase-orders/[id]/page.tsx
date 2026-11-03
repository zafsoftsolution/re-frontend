"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Download,
  History,
  Info,
  Loader2,
  PackageCheck,
  RefreshCw,
  Send,
  ShieldCheck,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  djangoAdmin,
  type PurchaseOrderShape,
  type PurchaseOrderStatus,
  type PurchaseOrderItemShape,
} from "@/lib/django-admin";
import PageHeader from "@/components/admin/PageHeader";
import CreatePurchaseReturn from "@/components/admin/CreatePurchaseReturn";
import { useConfirm, useToast } from "@/context/FeedbackContext";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<PurchaseOrderStatus, string> = {
  draft: "bg-ink/5 text-ink/65 ring-ink/15",
  awaiting_approval: "bg-amber-50 text-amber-700 ring-amber-200",
  approved: "bg-blue-50 text-blue-700 ring-blue-200",
  ordered: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  partial_received: "bg-amber-50 text-amber-800 ring-amber-300",
  received: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  closed: "bg-ink/5 text-ink/55 ring-ink/15",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
};

function POStatusPill({ status }: { status: PurchaseOrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-[10px] tracking-[0.18em] uppercase px-2 py-0.5 rounded-full ring-1 whitespace-nowrap",
        STATUS_TONE[status],
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function fmtMoney(n: string | number, ccy: string): string {
  return `${ccy} ${Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleString();
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function PurchaseOrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();

  const [po, setPo] = useState<PurchaseOrderShape | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Receive-mode state. Keyed by PO line id.
  const [receiveMode, setReceiveMode] = useState(false);
  const [receiveQty, setReceiveQty] = useState<Record<string, number>>({});
  const [packingSlip, setPackingSlip] = useState("");
  const [receiveNotes, setReceiveNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [returnOpen, setReturnOpen] = useState(false);

  // State is only set in promise callbacks so the effect can call this
  // without a synchronous setState (react-hooks/set-state-in-effect).
  // `loading` starts true and only gates the first paint (`loading && !po`).
  function load() {
    return djangoAdmin.purchaseOrders
      .get(id)
      .then(
        (data) => {
          setError(null);
          setPo(data);
        },
        (e) => setError((e as Error).message),
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // When entering receive mode, prefill receivable lines with their remaining qty.
  function startReceive() {
    if (!po) return;
    const seed: Record<string, number> = {};
    for (const line of po.items) {
      seed[line.id] = line.remaining_quantity;
    }
    setReceiveQty(seed);
    setPackingSlip("");
    setReceiveNotes("");
    setReceiveMode(true);
  }

  function cancelReceive() {
    setReceiveMode(false);
    setReceiveQty({});
  }

  async function performStateAction(
    action: "submit" | "approve" | "place" | "cancel" | "close",
  ) {
    if (!po) return;
    setBusy(action);
    try {
      const fn =
        action === "submit"
          ? djangoAdmin.purchaseOrders.submit
          : action === "approve"
          ? djangoAdmin.purchaseOrders.approve
          : action === "place"
          ? djangoAdmin.purchaseOrders.placeOrder
          : action === "cancel"
          ? (id: string) => djangoAdmin.purchaseOrders.cancel(id)
          : djangoAdmin.purchaseOrders.close;
      const updated = await fn(po.id);
      setPo(updated);
      toast.success(
        `PO ${action === "place" ? "placed with supplier" : action + "ed"}`,
      );
    } catch (e) {
      toast.error("Action failed", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function postReceipt() {
    if (!po) return;
    const items = po.items
      .filter((line) => (receiveQty[line.id] ?? 0) > 0)
      .map((line) => ({
        purchase_order_item: line.id,
        quantity_received: receiveQty[line.id]!,
      }));
    if (items.length === 0) {
      toast.error("Set a non-zero quantity on at least one line");
      return;
    }
    setBusy("receive");
    try {
      const updated = await djangoAdmin.purchaseOrders.receive(po.id, {
        supplier_packing_slip: packingSlip,
        notes: receiveNotes,
        items,
      });
      setPo(updated);
      setReceiveMode(false);
      toast.success(
        updated.status === "received"
          ? "All goods received"
          : "Goods received",
        "Stock has been updated.",
      );
    } catch (e) {
      toast.error("Couldn't post receipt", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (loading && !po) {
    return (
      <div className="grid place-items-center py-24 text-ink/45">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (!po) {
    return (
      <>
        <PageHeader title="Not found" eyebrow="Purchasing" />
        <p className="text-ink/55">{error || "Purchase order not found."}</p>
        <Link
          href="/admin/purchase-orders"
          className="inline-flex items-center gap-2 mt-4 text-sm text-navy hover:underline"
        >
          <ArrowLeft size={14} /> Back to list
        </Link>
      </>
    );
  }

  const totalOrdered = po.items.reduce((s, l) => s + l.ordered_quantity, 0);
  const totalReceived = po.items.reduce((s, l) => s + l.received_quantity, 0);
  const progress = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;

  return (
    <>
      <PageHeader
        eyebrow={po.supplier_name}
        title={po.number}
        description={`Created ${fmtDate(po.created_at)}${po.created_by_email ? ` by ${po.created_by_email}` : ""}.`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm border border-[var(--jmn-line)] hover:bg-[#FAFAFA]"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            <Link
              href="/admin/purchase-orders"
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm border border-[var(--jmn-line)] hover:bg-[#FAFAFA]"
            >
              <ArrowLeft size={14} />
              Back
            </Link>
          </div>
        }
      />

      {/* Status-aware callout — tells the operator exactly what to do next. */}
      <StatusCallout
        po={po}
        onStartReceive={startReceive}
        receiveMode={receiveMode}
      />

      {/* Status + KPI strip */}
      <section className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI
          label="Status"
          value={<POStatusPill status={po.status} />}
        />
        <KPI
          label="Total"
          value={
            <span className="text-lg font-semibold text-navy tabular">
              {fmtMoney(po.total, po.currency)}
            </span>
          }
        />
        <KPI
          label="Lines"
          value={
            <span className="text-lg font-semibold text-navy tabular">
              {po.items.length}
            </span>
          }
        />
        <KPI
          label="Received"
          value={
            <div className="space-y-1.5 w-full">
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-semibold text-navy tabular">
                  {totalReceived} / {totalOrdered}
                </span>
                <span className="text-xs text-ink/55 tabular">{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#F4F5F7] overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          }
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Left: lines + receipts + timeline */}
        <div className="space-y-6">
          {/* LINES — switches between read and receive modes */}
          <section className="bg-white border border-[var(--jmn-line)] rounded-lg overflow-hidden">
            <header className="px-5 py-4 border-b border-[var(--jmn-line)] flex items-center justify-between">
              <h2 className="text-[10px] tracking-[0.3em] uppercase text-gold">
                {receiveMode ? "Receive goods" : "Lines"}
              </h2>
              {!receiveMode && po.is_receivable && (
                <button
                  onClick={startReceive}
                  className="inline-flex items-center gap-2 h-8 px-3 rounded-md bg-navy text-cream text-xs hover:opacity-90"
                >
                  <PackageCheck size={12} />
                  Receive goods
                </button>
              )}
              {receiveMode && (
                <button
                  onClick={cancelReceive}
                  className="text-xs text-ink/55 hover:text-navy"
                >
                  Cancel
                </button>
              )}
            </header>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#FAFAFA] text-[11px] tracking-[0.18em] uppercase text-ink/55">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Item</th>
                    <th className="text-left font-medium px-4 py-3">Variant</th>
                    <th className="text-right font-medium px-4 py-3">Ordered</th>
                    <th className="text-right font-medium px-4 py-3">Received</th>
                    {receiveMode && (
                      <th className="text-right font-medium px-4 py-3">
                        Receiving now
                      </th>
                    )}
                    {!receiveMode && (
                      <>
                        <th className="text-right font-medium px-4 py-3">Cost</th>
                        <th className="text-right font-medium px-4 py-3">Total</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {po.items.map((line) => (
                    <LineRow
                      key={line.id}
                      line={line}
                      currency={po.currency}
                      receiveMode={receiveMode}
                      qty={receiveQty[line.id] ?? 0}
                      onQtyChange={(v) =>
                        setReceiveQty((prev) => ({ ...prev, [line.id]: v }))
                      }
                      overReceiptAllowed={po.over_receipt_allowed}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {receiveMode && (
              <div className="px-5 py-4 border-t border-[var(--jmn-line)] space-y-3 bg-[#FAFAFA]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] tracking-[0.18em] uppercase text-ink/55 mb-1 block">
                      Supplier packing slip
                    </label>
                    <input
                      value={packingSlip}
                      onChange={(e) => setPackingSlip(e.target.value)}
                      placeholder="PS-2026-001234"
                      className="w-full h-9 px-3 rounded-md border border-[var(--jmn-line)] bg-white text-sm tabular outline-none focus:border-navy"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] tracking-[0.18em] uppercase text-ink/55 mb-1 block">
                      Notes
                    </label>
                    <input
                      value={receiveNotes}
                      onChange={(e) => setReceiveNotes(e.target.value)}
                      placeholder="Box 3 of 4 missing — pending follow-up"
                      className="w-full h-9 px-3 rounded-md border border-[var(--jmn-line)] bg-white text-sm outline-none focus:border-navy"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-ink/55">
                  Set the quantity for each line above, then post the receipt
                  using the action bar at the bottom of the page.
                </p>
              </div>
            )}
          </section>

          {/* RECEIPTS HISTORY */}
          {po.receipts.length > 0 && (
            <section className="bg-white border border-[var(--jmn-line)] rounded-lg overflow-hidden">
              <header className="px-5 py-4 border-b border-[var(--jmn-line)]">
                <h2 className="text-[10px] tracking-[0.3em] uppercase text-gold">
                  Goods receipts ({po.receipts.length})
                </h2>
              </header>
              <ul className="divide-y divide-[var(--jmn-line)]">
                {po.receipts.map((r) => {
                  const totalQty = r.items.reduce(
                    (s, i) => s + i.quantity_received,
                    0,
                  );
                  return (
                    <li key={r.id} className="px-5 py-4 flex items-start gap-4">
                      <div className="mt-0.5 h-8 w-8 grid place-items-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                        <PackageCheck size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-3">
                          <p className="font-medium text-navy tabular">{r.number}</p>
                          <span
                            className={cn(
                              "text-[10px] tracking-[0.18em] uppercase",
                              r.status === "posted"
                                ? "text-emerald-700"
                                : r.status === "reversed"
                                ? "text-rose-700"
                                : "text-ink/55",
                            )}
                          >
                            {r.status}
                          </span>
                          <span className="text-xs text-ink/55 tabular">
                            {fmtDate(r.received_at)}
                          </span>
                          {r.received_by_email && (
                            <span className="text-xs text-ink/45">
                              · {r.received_by_email}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ink/55 mt-0.5">
                          {totalQty} unit{totalQty === 1 ? "" : "s"} across{" "}
                          {r.items.length} line{r.items.length === 1 ? "" : "s"}
                          {r.supplier_packing_slip
                            ? ` · slip ${r.supplier_packing_slip}`
                            : ""}
                        </p>
                        {r.notes && (
                          <p className="text-xs text-ink/65 mt-1">{r.notes}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* TIMELINE */}
          <section className="bg-white border border-[var(--jmn-line)] rounded-lg overflow-hidden">
            <header className="px-5 py-4 border-b border-[var(--jmn-line)] flex items-center gap-2">
              <History size={14} className="text-ink/55" />
              <h2 className="text-[10px] tracking-[0.3em] uppercase text-gold">
                Activity
              </h2>
            </header>
            <ul className="divide-y divide-[var(--jmn-line)]">
              {po.timeline.map((t) => (
                <li
                  key={t.id}
                  className="px-5 py-3 flex items-start gap-3 text-sm"
                >
                  <span className="mt-0.5 inline-flex">
                    <POStatusPill status={t.status} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-ink/85">{t.note || "—"}</p>
                    <p className="text-[11px] text-ink/45 tabular mt-0.5">
                      {fmtDate(t.at)}
                      {t.actor_email ? ` · ${t.actor_email}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Right: actions + meta + totals */}
        <aside className="space-y-4 lg:sticky lg:top-4 self-start">
          {/* ACTIONS */}
          <section className="bg-white border border-[var(--jmn-line)] rounded-lg p-5 space-y-2">
            <h2 className="text-[10px] tracking-[0.3em] uppercase text-gold mb-2">
              Actions
            </h2>
            {/* Return to supplier — available once goods have been received. */}
            {(po.status === "partial_received" ||
              po.status === "received" ||
              po.status === "closed") && (
              <ActionBtn
                icon={<RefreshCw size={14} />}
                label="Return to supplier"
                hint="Send defective / wrong items back"
                onClick={() => setReturnOpen(true)}
              />
            )}
            {/* PDF download — available once the PO has been placed (the
                draft/awaiting-approval stages aren't really "invoices" yet). */}
            {po.status !== "draft" &&
              po.status !== "awaiting_approval" &&
              po.status !== "cancelled" && (
                <ActionBtn
                  icon={<Download size={14} />}
                  label="Download invoice (PDF)"
                  hint="Printable, supplier-ready"
                  busy={busy === "pdf"}
                  onClick={async () => {
                    setBusy("pdf");
                    try {
                      const filename =
                        await djangoAdmin.purchaseOrders.downloadInvoicePdf(
                          po.id,
                          po.number,
                        );
                      toast.success("Invoice downloaded", filename);
                    } catch (e) {
                      toast.error(
                        "Couldn't download invoice",
                        (e as Error).message,
                      );
                    } finally {
                      setBusy(null);
                    }
                  }}
                />
              )}
            {po.status === "draft" && (
              <>
                <ActionBtn
                  icon={<Send size={14} />}
                  label="Submit for approval"
                  busy={busy === "submit"}
                  onClick={() => performStateAction("submit")}
                />
                <ActionBtn
                  icon={<ShieldCheck size={14} />}
                  label="Approve directly"
                  hint="Skips approval queue"
                  busy={busy === "approve"}
                  onClick={() => performStateAction("approve")}
                />
              </>
            )}
            {po.status === "awaiting_approval" && (
              <ActionBtn
                icon={<ShieldCheck size={14} />}
                label="Approve"
                busy={busy === "approve"}
                onClick={() => performStateAction("approve")}
                primary
              />
            )}
            {po.status === "approved" && (
              <ActionBtn
                icon={<Send size={14} />}
                label="Place with supplier"
                hint="Marks the PO as ordered"
                busy={busy === "place"}
                onClick={() => performStateAction("place")}
                primary
              />
            )}
            {po.is_receivable && !receiveMode && (
              <ActionBtn
                icon={<PackageCheck size={14} />}
                label="Receive goods"
                hint="Opens the receive panel"
                onClick={startReceive}
                primary
              />
            )}
            {/*
             * Close button:
             *   - `received` → natural path; one click ends the lifecycle.
             *     (In practice post_goods_receipt now auto-closes on full
             *     receipt, but the button stays here as a fallback for
             *     historical POs that landed in RECEIVED before that change.)
             *   - `partial_received` → operator decides no more goods are
             *     coming; close with the remaining quantity written off.
             */}
            {(po.status === "received" ||
              po.status === "partial_received") && (
              <ActionBtn
                icon={<CheckCircle2 size={14} />}
                label="Close PO"
                hint={
                  po.status === "partial_received"
                    ? "Marks the remaining quantity as not coming"
                    : "Final state, no further changes"
                }
                busy={busy === "close"}
                onClick={async () => {
                  if (po.status === "partial_received") {
                    const ok = await confirm({
                      title: "Close with partial receipt?",
                      description:
                        "The remaining ordered quantity will be written off — you won't be able to receive any more goods against this PO.",
                      tone: "danger",
                      confirmLabel: "Close PO",
                      cancelLabel: "Keep open",
                    });
                    if (!ok) return;
                  }
                  performStateAction("close");
                }}
              />
            )}
            {(po.status === "draft" ||
              po.status === "awaiting_approval" ||
              po.status === "approved" ||
              po.status === "ordered") && (
              <ActionBtn
                icon={<XCircle size={14} />}
                label="Cancel PO"
                busy={busy === "cancel"}
                onClick={async () => {
                  const ok = await confirm({
                    title: "Cancel this purchase order?",
                    description: "Pending stock reservations will be released. The PO can no longer be received against once cancelled.",
                    tone: "danger",
                    confirmLabel: "Cancel PO",
                    cancelLabel: "Keep open",
                  });
                  if (ok) performStateAction("cancel");
                }}
                danger
              />
            )}
            {po.status === "draft" && (
              <button
                onClick={async () => {
                  const ok = await confirm({
                    title: "Delete this draft?",
                    description: "Permanent — the draft and its lines will be removed.",
                    tone: "danger",
                    confirmLabel: "Delete draft",
                  });
                  if (!ok) return;
                  setBusy("delete");
                  try {
                    await djangoAdmin.purchaseOrders.delete(po.id);
                    toast.success("Draft deleted");
                    router.push("/admin/purchase-orders");
                  } catch (e) {
                    toast.error("Couldn't delete", (e as Error).message);
                    setBusy(null);
                  }
                }}
                className="w-full h-9 rounded-md text-sm text-rose-700 hover:bg-rose-50 transition-colors"
              >
                Delete draft
              </button>
            )}
          </section>

          {/* META */}
          <section className="bg-white border border-[var(--jmn-line)] rounded-lg p-5 space-y-3 text-sm">
            <h2 className="text-[10px] tracking-[0.3em] uppercase text-gold">
              Details
            </h2>
            <Meta label="Supplier" value={`${po.supplier_name} (${po.supplier_code})`} />
            <Meta label="Receive at" value={po.warehouse_name} />
            <Meta
              label="Expected"
              value={
                po.expected_delivery_date
                  ? new Date(po.expected_delivery_date).toLocaleDateString()
                  : "—"
              }
            />
            <Meta
              label="Payment terms"
              value={
                po.payment_terms_days === 0
                  ? "Prepaid / COD"
                  : `Net ${po.payment_terms_days}`
              }
            />
            <Meta label="Currency" value={po.currency} />
            {po.supplier_reference && (
              <Meta label="Supplier ref" value={po.supplier_reference} />
            )}
            {po.over_receipt_allowed && (
              <p className="text-[11px] text-amber-700 mt-2">
                Over-receipt is allowed on this PO.
              </p>
            )}
          </section>

          {/* TOTALS */}
          <section className="bg-white border border-[var(--jmn-line)] rounded-lg p-5 space-y-2">
            <h2 className="text-[10px] tracking-[0.3em] uppercase text-gold mb-1">
              Totals
            </h2>
            <Row label="Subtotal" value={fmtMoney(po.subtotal, po.currency)} />
            <Row label="Discount" value={fmtMoney(po.discount, po.currency)} />
            <Row label="Tax" value={fmtMoney(po.tax, po.currency)} />
            <Row label="Shipping" value={fmtMoney(po.shipping, po.currency)} />
            <Row label="Other charges" value={fmtMoney(po.other_charges, po.currency)} />
            <div className="pt-2 border-t border-[var(--jmn-line)] flex items-center justify-between">
              <span className="text-sm font-medium text-navy">Total</span>
              <span className="text-lg font-semibold text-navy tabular">
                {fmtMoney(po.total, po.currency)}
              </span>
            </div>
          </section>

          {/* NOTES */}
          {(po.notes || po.internal_notes) && (
            <section className="bg-white border border-[var(--jmn-line)] rounded-lg p-5 space-y-3 text-sm">
              <h2 className="text-[10px] tracking-[0.3em] uppercase text-gold">
                Notes
              </h2>
              {po.notes && (
                <div>
                  <p className="text-[11px] text-ink/45 mb-1">For supplier</p>
                  <p className="text-ink/85 whitespace-pre-wrap">{po.notes}</p>
                </div>
              )}
              {po.internal_notes && (
                <div>
                  <p className="text-[11px] text-ink/45 mb-1">Internal</p>
                  <p className="text-ink/85 whitespace-pre-wrap">{po.internal_notes}</p>
                </div>
              )}
            </section>
          )}
        </aside>
      </div>

      {/* Sticky action bar — always visible while in receive mode so the
          Post-receipt button can never scroll out of view. The spacer keeps
          the bar from covering the last row of content. */}
      {receiveMode && (
        <>
          <div aria-hidden className="h-24" />
          <ReceiveActionBar
            po={po}
            receiveQty={receiveQty}
            busy={busy === "receive"}
            onCancel={cancelReceive}
            onPost={postReceipt}
          />
        </>
      )}

      {/* Return-to-supplier drawer. Posting is a separate step from /admin/returns. */}
      {returnOpen && (
        <CreatePurchaseReturn
          po={{
            id: po.id,
            number: po.number,
            supplier_name: po.supplier_name,
            warehouse: po.warehouse,
            warehouse_name: po.warehouse_name,
            currency: po.currency,
            items: po.items.map((it) => ({
              id: it.id,
              product_name: it.product_name,
              sku: it.sku,
              color: it.color,
              size: it.size,
              ordered_quantity: it.ordered_quantity,
              received_quantity: it.received_quantity,
              unit_cost: it.unit_cost,
            })),
          }}
          onClose={() => setReturnOpen(false)}
          onCreated={async () => {
            setReturnOpen(false);
            await load();
            toast.success(
              "Return created",
              "Post it from Returns to pull stock + record the credit.",
            );
          }}
        />
      )}
    </>
  );
}

// ─── Status-aware callout ───────────────────────────────────────────────────

function StatusCallout({
  po,
  onStartReceive,
  receiveMode,
}: {
  po: PurchaseOrderShape;
  onStartReceive: () => void;
  receiveMode: boolean;
}) {
  if (receiveMode) return null;

  const totalOrdered = po.items.reduce((s, l) => s + l.ordered_quantity, 0);
  const totalReceived = po.items.reduce((s, l) => s + l.received_quantity, 0);

  if (po.status === "draft" || po.status === "awaiting_approval") {
    return (
      <Callout tone="amber" icon={<Info size={16} />}>
        <p className="font-medium">Draft — not yet placed with the supplier.</p>
        <p className="text-[12px] opacity-80 mt-0.5">
          Submit and approve to lock the lines, then place the PO with the
          supplier so you can record deliveries against it.
        </p>
      </Callout>
    );
  }

  if (po.status === "approved") {
    return (
      <Callout tone="blue" icon={<Send size={16} />}>
        <p className="font-medium">Approved — ready to send.</p>
        <p className="text-[12px] opacity-80 mt-0.5">
          Click <span className="font-semibold">Place with supplier</span> in
          the actions panel once you&rsquo;ve sent the order.
        </p>
      </Callout>
    );
  }

  if (po.status === "ordered") {
    return (
      <Callout tone="indigo" icon={<PackageCheck size={16} />}>
        <div className="flex flex-wrap items-start justify-between gap-3 w-full">
          <div className="min-w-0">
            <p className="font-medium">
              Awaiting goods — {totalOrdered} unit
              {totalOrdered === 1 ? "" : "s"} expected from{" "}
              {po.supplier_name}.
            </p>
            <p className="text-[12px] opacity-80 mt-0.5">
              When the delivery arrives, click{" "}
              <span className="font-semibold">Receive goods</span> to log it
              and update stock at <span className="tabular">{po.warehouse_name}</span>.
            </p>
          </div>
          <button
            onClick={onStartReceive}
            className="shrink-0 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-navy text-cream text-xs font-medium hover:opacity-90"
          >
            <PackageCheck size={13} />
            Receive goods now
          </button>
        </div>
      </Callout>
    );
  }

  if (po.status === "partial_received") {
    const remaining = totalOrdered - totalReceived;
    return (
      <Callout tone="amber" icon={<PackageCheck size={16} />}>
        <div className="flex flex-wrap items-start justify-between gap-3 w-full">
          <div className="min-w-0">
            <p className="font-medium">
              Partially received — {totalReceived} of {totalOrdered} unit
              {totalOrdered === 1 ? "" : "s"} in. {remaining} still pending.
            </p>
            <p className="text-[12px] opacity-80 mt-0.5">
              Stock has been updated for what arrived. Receive the rest when
              the next delivery lands — or close the PO if no more goods are
              coming.
            </p>
          </div>
          <button
            onClick={onStartReceive}
            className="shrink-0 inline-flex items-center gap-2 h-9 px-4 rounded-md bg-navy text-cream text-xs font-medium hover:opacity-90"
          >
            <PackageCheck size={13} />
            Receive next delivery
          </button>
        </div>
      </Callout>
    );
  }

  if (po.status === "received") {
    return (
      <Callout tone="emerald" icon={<TrendingUp size={16} />}>
        <div className="flex flex-wrap items-start justify-between gap-3 w-full">
          <div className="min-w-0">
            <p className="font-medium">
              All goods received — stock at{" "}
              <span className="tabular">{po.warehouse_name}</span> increased
              by {totalReceived} unit{totalReceived === 1 ? "" : "s"}.
            </p>
            <p className="text-[12px] opacity-80 mt-0.5">
              Click <span className="font-semibold">Close PO</span> in the
              actions panel to mark this purchase order terminal.
            </p>
          </div>
          <Link
            href="/admin/stock"
            className="shrink-0 inline-flex items-center gap-2 h-9 px-4 rounded-md border border-emerald-300 bg-white text-emerald-700 text-xs font-medium hover:bg-emerald-50"
          >
            View stock dashboard
            <ArrowRight size={13} />
          </Link>
        </div>
      </Callout>
    );
  }

  if (po.status === "closed") {
    return (
      <Callout tone="emerald" icon={<CheckCircle2 size={16} />}>
        <div className="flex flex-wrap items-start justify-between gap-3 w-full">
          <div className="min-w-0">
            <p className="font-medium">
              Closed — {totalReceived} of {totalOrdered} unit
              {totalOrdered === 1 ? "" : "s"} received. No further changes.
            </p>
            <p className="text-[12px] opacity-80 mt-0.5">
              Stock at{" "}
              <span className="tabular">{po.warehouse_name}</span> reflects
              this delivery. Payments can still be recorded from the invoice
              page.
            </p>
          </div>
          <Link
            href="/admin/purchase-orders/invoices"
            className="shrink-0 inline-flex items-center gap-2 h-9 px-4 rounded-md border border-emerald-300 bg-white text-emerald-700 text-xs font-medium hover:bg-emerald-50"
          >
            View invoice
            <ArrowRight size={13} />
          </Link>
        </div>
      </Callout>
    );
  }

  return null;
}

// ─── Sticky bottom action bar (visible while receiving) ─────────────────────

function ReceiveActionBar({
  po,
  receiveQty,
  busy,
  onCancel,
  onPost,
}: {
  po: PurchaseOrderShape;
  receiveQty: Record<string, number>;
  busy: boolean;
  onCancel: () => void;
  onPost: () => void;
}) {
  const linesReceiving = po.items.filter(
    (l) => (receiveQty[l.id] ?? 0) > 0,
  ).length;
  const unitsReceiving = po.items.reduce(
    (s, l) => s + (receiveQty[l.id] ?? 0),
    0,
  );

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-white border-t border-[var(--jmn-line)] shadow-[0_-8px_24px_-12px_rgba(14,26,58,0.15)]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-3">
          <span className="h-9 w-9 rounded-full bg-emerald-50 ring-1 ring-emerald-200 grid place-items-center text-emerald-700">
            <PackageCheck size={15} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-navy">
              Receiving {unitsReceiving} unit{unitsReceiving === 1 ? "" : "s"}{" "}
              across {linesReceiving} line{linesReceiving === 1 ? "" : "s"}
            </p>
            <p className="text-[11px] text-ink/55 tabular truncate">
              Stock at {po.warehouse_name} will increase · PO {po.number}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="h-10 px-4 rounded-md text-sm border border-[var(--jmn-line)] hover:bg-[#FAFAFA] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onPost}
            disabled={busy || unitsReceiving === 0}
            className="h-10 px-6 rounded-md bg-emerald-700 text-white text-sm font-semibold hover:opacity-95 disabled:opacity-50 inline-flex items-center gap-2 shadow-sm"
          >
            {busy ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ClipboardCheck size={14} />
            )}
            Post receipt &amp; update stock
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reusable callout ───────────────────────────────────────────────────────

function Callout({
  tone,
  icon,
  children,
}: {
  tone: "amber" | "blue" | "indigo" | "emerald";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const TONES = {
    amber: "bg-amber-50 ring-amber-200 text-amber-900",
    blue: "bg-blue-50 ring-blue-200 text-blue-900",
    indigo: "bg-indigo-50 ring-indigo-200 text-indigo-900",
    emerald: "bg-emerald-50 ring-emerald-200 text-emerald-900",
  } as const;
  const ICON_TONES = {
    amber: "text-amber-700",
    blue: "text-blue-700",
    indigo: "text-indigo-700",
    emerald: "text-emerald-700",
  } as const;
  return (
    <div
      className={cn(
        "mb-6 px-4 py-3 rounded-md ring-1 text-sm flex items-start gap-3",
        TONES[tone],
      )}
    >
      <span className={cn("shrink-0 mt-0.5", ICON_TONES[tone])}>{icon}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// ─── Small presentational helpers ───────────────────────────────────────────

function KPI({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[var(--jmn-line)] rounded-lg p-4">
      <p className="text-[10px] tracking-[0.3em] uppercase text-ink/45 mb-2">
        {label}
      </p>
      <div className="min-h-[28px] flex items-center">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink/65">{label}</span>
      <span className="text-navy tabular">{value}</span>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px] tracking-[0.18em] uppercase text-ink/45 mt-0.5">
        {label}
      </span>
      <span className="text-ink/85 text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  hint,
  onClick,
  busy,
  primary,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  busy?: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={cn(
        "w-full px-3.5 py-2.5 rounded-md text-sm font-medium transition-colors flex items-center gap-3 text-left",
        primary
          ? "bg-navy text-cream hover:opacity-90"
          : danger
          ? "border border-rose-200 text-rose-700 hover:bg-rose-50"
          : "border border-[var(--jmn-line)] text-navy hover:bg-[#FAFAFA]",
        "disabled:opacity-50",
      )}
    >
      <span className="shrink-0 grid place-items-center">
        {busy ? <Loader2 size={14} className="animate-spin" /> : icon}
      </span>
      {/* Label + hint stack vertically so a narrow sidebar can't wrap the
          label mid-word. Hint truncates if the sidebar is still tiny. */}
      <span className="flex-1 min-w-0 flex flex-col leading-tight">
        <span className="truncate">{label}</span>
        {hint && (
          <span
            className={cn(
              "text-[10px] tracking-[0.14em] uppercase mt-0.5 truncate",
              primary ? "text-cream/70" : danger ? "text-rose-700/70" : "text-ink/45",
            )}
          >
            {hint}
          </span>
        )}
      </span>
    </button>
  );
}

// ─── Line row (renders differently in receive-mode) ─────────────────────────

function LineRow({
  line,
  currency,
  receiveMode,
  qty,
  onQtyChange,
  overReceiptAllowed,
}: {
  line: PurchaseOrderItemShape;
  currency: string;
  receiveMode: boolean;
  qty: number;
  onQtyChange: (v: number) => void;
  overReceiptAllowed: boolean;
}) {
  const fullyReceived = line.received_quantity >= line.ordered_quantity;
  const max = overReceiptAllowed ? Number.MAX_SAFE_INTEGER : line.remaining_quantity;
  return (
    <tr className="border-t border-[var(--jmn-line)]">
      <td className="px-4 py-3.5 align-middle">
        <div className="flex items-center gap-3">
          {line.product_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={line.product_image}
              alt=""
              className="w-9 h-9 rounded object-cover bg-[#F4F5F7]"
            />
          ) : (
            <div className="w-9 h-9 rounded bg-[#F4F5F7]" />
          )}
          <div className="min-w-0">
            <p className="font-medium text-navy truncate">{line.product_name}</p>
            <p className="text-[11px] text-ink/45 tabular">{line.sku}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5 align-middle">
        <span className="text-sm text-ink/65">
          {[line.color, line.size].filter(Boolean).join(" / ") || "—"}
        </span>
      </td>
      <td className="px-4 py-3.5 align-middle text-right tabular">
        {line.ordered_quantity}
      </td>
      <td className="px-4 py-3.5 align-middle text-right tabular">
        <span
          className={cn(
            fullyReceived ? "text-emerald-700 font-medium" : "text-ink/65",
          )}
        >
          {line.received_quantity}
        </span>
        {!fullyReceived && line.received_quantity > 0 && (
          <span className="text-[11px] text-ink/45 ml-1">
            (+{line.remaining_quantity} pending)
          </span>
        )}
      </td>
      {receiveMode && (
        <td className="px-4 py-3.5 align-middle text-right">
          {fullyReceived && !overReceiptAllowed ? (
            <span className="text-[11px] text-emerald-700 tracking-[0.18em] uppercase">
              Done
            </span>
          ) : (
            <input
              type="number"
              min={0}
              max={overReceiptAllowed ? undefined : max}
              value={qty}
              onChange={(e) => {
                const v = Math.max(0, Number(e.target.value) || 0);
                onQtyChange(overReceiptAllowed ? v : Math.min(v, max));
              }}
              className="w-20 h-8 px-2 rounded-md border border-[var(--jmn-line)] bg-white text-sm tabular text-right outline-none focus:border-navy"
            />
          )}
        </td>
      )}
      {!receiveMode && (
        <>
          <td className="px-4 py-3.5 align-middle text-right tabular">
            {currency} {Number(line.unit_cost).toFixed(2)}
          </td>
          <td className="px-4 py-3.5 align-middle text-right tabular font-medium text-navy">
            {currency} {Number(line.line_total).toFixed(2)}
          </td>
        </>
      )}
    </tr>
  );
}
