"use client";

/**
 * Returns landing — sales returns (customer → us) and purchase returns
 * (us → supplier) in one tabbed view. Clicking a row opens a manage drawer
 * that runs the state machine (approve → receive → refund) and renders the
 * line items.
 *
 * Creation lives elsewhere:
 *   - sales returns are spawned from the order detail page ("Process return")
 *   - purchase returns are spawned from the PO detail page ("Return to supplier")
 * That way the operator picks lines while looking at the actual order/PO.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  RefreshCw,
  ShoppingBag,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import {
  djangoAdmin,
  type OrderReturnShape,
  type OrderReturnStatus,
  type PaginatedResponse,
  type PurchaseReturnShape,
  type PurchaseReturnStatus,
  type RefundMethod,
} from "@/lib/django-admin";
import { useConfirm, useToast } from "@/context/FeedbackContext";
import PageHeader from "@/components/admin/PageHeader";
import { cn, formatDate, formatPrice } from "@/lib/utils";

type Side = "sales" | "purchase";

const METHOD_LABEL: Record<RefundMethod, string> = {
  cash: "Cash",
  bank: "Bank",
  mobile: "Mobile",
  card_reversal: "Card reversal",
  store_credit: "Store credit",
  other: "Other",
};

const SALES_TONE: Record<OrderReturnStatus, string> = {
  requested: "bg-ink/10 text-ink/70",
  approved: "bg-blue-100 text-blue-800",
  received: "bg-amber-100 text-amber-800",
  refunded: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
};
const PURCHASE_TONE: Record<PurchaseReturnStatus, string> = {
  draft: "bg-ink/10 text-ink/70",
  posted: "bg-amber-100 text-amber-800",
  refunded: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-rose-100 text-rose-800",
};

export default function ReturnsPage() {
  const [side, setSide] = useState<Side>("sales");
  const [sales, setSales] = useState<OrderReturnShape[] | null>(null);
  const [purchase, setPurchase] = useState<PurchaseReturnShape[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const toast = useToast();

  const [salesActive, setSalesActive] = useState<OrderReturnShape | null>(null);
  const [purchaseActive, setPurchaseActive] = useState<PurchaseReturnShape | null>(null);

  // State is only set in promise callbacks so the effect can call this
  // without a synchronous setState (react-hooks/set-state-in-effect).
  const load = useCallback(() => {
    const onError = (e: unknown) => setError((e as Error).message);
    if (side === "sales") {
      return djangoAdmin.orderReturns.list({ page_size: 100 }).then((data) => {
        setError(null);
        setSales(
          (data as PaginatedResponse<OrderReturnShape>).results ??
            (data as unknown as OrderReturnShape[]),
        );
      }, onError);
    }
    return djangoAdmin.purchaseReturns.list({ page_size: 100 }).then((data) => {
      setError(null);
      setPurchase(
        (data as PaginatedResponse<PurchaseReturnShape>).results ??
          (data as unknown as PurchaseReturnShape[]),
      );
    }, onError);
  }, [side]);

  useEffect(() => {
    load();
  }, [load]);

  // Summary derived from the currently-visible list.
  const summary = useMemo(() => {
    if (side === "sales") {
      const list = sales ?? [];
      let refunded = 0;
      let outstanding = 0;
      let unitsBack = 0;
      for (const r of list) {
        if (r.status === "refunded") refunded += Number(r.refund_amount) || 0;
        else if (r.status !== "rejected")
          outstanding += Number(r.refund_amount) || 0;
        if (r.status === "received" || r.status === "refunded") {
          unitsBack += r.items
            .filter((i) => i.condition === "resalable")
            .reduce((s, i) => s + i.quantity, 0);
        }
      }
      return { refunded, outstanding, unitsBack, count: list.length };
    }
    const list = purchase ?? [];
    let credits = 0;
    let pending = 0;
    let unitsOut = 0;
    for (const r of list) {
      if (r.status === "refunded") credits += Number(r.refund_amount) || 0;
      else if (r.status === "posted")
        pending += Number(r.refund_amount) || 0;
      if (r.status === "posted" || r.status === "refunded") {
        unitsOut += r.items.reduce((s, i) => s + i.quantity, 0);
      }
    }
    return { refunded: credits, outstanding: pending, unitsBack: unitsOut, count: list.length };
  }, [side, sales, purchase]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Returns"
        description="Customer returns flow stock back into inventory and money out to the customer. Purchase returns reverse both for the supplier."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  const file =
                    side === "sales"
                      ? await djangoAdmin.orderReturns.exportCsv()
                      : await djangoAdmin.purchaseReturns.exportCsv();
                  toast.success("Exported", file);
                } catch (e) {
                  toast.error("Couldn't export", (e as Error).message);
                }
              }}
              className="h-9 px-3 rounded-md border border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-ink/65 hover:text-navy hover:border-navy/30 transition-colors flex items-center gap-2"
            >
              <Download size={13} /> Export CSV
            </button>
            <button
              type="button"
              onClick={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
              disabled={refreshing}
              className="h-9 px-3 rounded-md border border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-ink/65 hover:text-navy hover:border-navy/30 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        }
      />

      {/* Side switch */}
      <div className="flex items-center gap-1 bg-[#FAFAFA] rounded-md p-1 w-fit">
        <button
          onClick={() => setSide("sales")}
          className={cn(
            "px-4 h-9 rounded text-[11px] tracking-[0.18em] uppercase transition-colors inline-flex items-center gap-2",
            side === "sales"
              ? "bg-white text-navy shadow-sm"
              : "text-ink/55 hover:text-navy",
          )}
        >
          <ShoppingBag size={13} />
          Sales returns
        </button>
        <button
          onClick={() => setSide("purchase")}
          className={cn(
            "px-4 h-9 rounded text-[11px] tracking-[0.18em] uppercase transition-colors inline-flex items-center gap-2",
            side === "purchase"
              ? "bg-white text-navy shadow-sm"
              : "text-ink/55 hover:text-navy",
          )}
        >
          <Truck size={13} />
          Purchase returns
        </button>
      </div>

      {/* Summary KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          icon={<Banknote size={14} className="text-emerald-700" />}
          label={side === "sales" ? "Refunded" : "Credits received"}
          value={formatPrice(summary.refunded)}
          tone="emerald"
        />
        <Stat
          icon={<Clock size={14} className="text-amber-700" />}
          label={side === "sales" ? "Pending refund" : "Awaiting credit"}
          value={formatPrice(summary.outstanding)}
          tone="amber"
        />
        <Stat
          icon={
            side === "sales" ? (
              <ArrowDownLeft size={14} />
            ) : (
              <ArrowUpRight size={14} />
            )
          }
          label={side === "sales" ? "Units restocked" : "Units pulled"}
          value={String(summary.unitsBack)}
        />
        <Stat
          label="Total returns"
          value={String(summary.count)}
          icon={<RefreshCw size={14} />}
        />
      </section>

      {error && (
        <div className="rounded-md bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* List */}
      {side === "sales" ? (
        <SalesList
          rows={sales}
          onPick={setSalesActive}
        />
      ) : (
        <PurchaseList
          rows={purchase}
          onPick={setPurchaseActive}
        />
      )}

      {salesActive && (
        <SalesReturnDrawer
          ret={salesActive}
          onClose={() => setSalesActive(null)}
          onChanged={async () => {
            await load();
            const fresh = await djangoAdmin.orderReturns.get(salesActive.id);
            setSalesActive(fresh);
          }}
        />
      )}
      {purchaseActive && (
        <PurchaseReturnDrawer
          ret={purchaseActive}
          onClose={() => setPurchaseActive(null)}
          onChanged={async () => {
            await load();
            const fresh = await djangoAdmin.purchaseReturns.get(purchaseActive.id);
            setPurchaseActive(fresh);
          }}
        />
      )}
    </div>
  );
}

// ── Lists ───────────────────────────────────────────────────────────────────

function SalesList({
  rows,
  onPick,
}: {
  rows: OrderReturnShape[] | null;
  onPick: (r: OrderReturnShape) => void;
}) {
  if (!rows) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 size={22} className="text-navy/60 animate-spin" />
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="bg-white border border-[var(--jmn-line)] rounded-lg px-6 py-16 text-center">
        <RefreshCw size={20} className="mx-auto text-ink/30 mb-2" />
        <p className="text-sm text-ink/55">
          No sales returns yet — process one from an order detail page.
        </p>
      </div>
    );
  }
  return (
    <section className="bg-white border border-[var(--jmn-line)] rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#FAFAFA] text-[10px] tracking-[0.18em] uppercase text-ink/55">
            <tr>
              <th className="text-left font-medium pl-4 pr-2 py-3">Return</th>
              <th className="text-left font-medium px-2 py-3">Order</th>
              <th className="text-left font-medium px-2 py-3">Status</th>
              <th className="text-left font-medium px-2 py-3">Reason</th>
              <th className="text-right font-medium px-2 py-3">Items</th>
              <th className="text-right font-medium pl-2 pr-4 py-3">
                Refund
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                onClick={() => onPick(r)}
                className="border-t border-[var(--jmn-line)] hover:bg-[#FAFAFA] cursor-pointer transition-colors"
              >
                <td className="pl-4 pr-2 py-3">
                  <p className="font-medium text-navy tabular">{r.number}</p>
                  <p className="text-[11px] text-ink/45 tabular">
                    {formatDate(r.created_at)}
                  </p>
                </td>
                <td className="px-2 py-3">
                  <p className="text-navy tabular">{r.order_number}</p>
                  <p className="text-[11px] text-ink/45 truncate max-w-[200px]">
                    {r.customer_email}
                  </p>
                </td>
                <td className="px-2 py-3">
                  <span
                    className={cn(
                      "inline-flex px-2 py-0.5 rounded-full text-[10px] tracking-[0.18em] uppercase",
                      SALES_TONE[r.status],
                    )}
                  >
                    {r.status_label}
                  </span>
                </td>
                <td className="px-2 py-3 text-sm text-ink/65 capitalize">
                  {r.reason.replace(/_/g, " ")}
                </td>
                <td className="px-2 py-3 text-right tabular text-ink/80">
                  {r.items.reduce((s, i) => s + i.quantity, 0)}
                </td>
                <td className="pl-2 pr-4 py-3 text-right tabular text-navy font-medium">
                  {formatPrice(Number(r.refund_amount), r.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PurchaseList({
  rows,
  onPick,
}: {
  rows: PurchaseReturnShape[] | null;
  onPick: (r: PurchaseReturnShape) => void;
}) {
  if (!rows) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 size={22} className="text-navy/60 animate-spin" />
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="bg-white border border-[var(--jmn-line)] rounded-lg px-6 py-16 text-center">
        <RefreshCw size={20} className="mx-auto text-ink/30 mb-2" />
        <p className="text-sm text-ink/55">
          No purchase returns yet — start one from a purchase order detail page.
        </p>
      </div>
    );
  }
  return (
    <section className="bg-white border border-[var(--jmn-line)] rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#FAFAFA] text-[10px] tracking-[0.18em] uppercase text-ink/55">
            <tr>
              <th className="text-left font-medium pl-4 pr-2 py-3">Return</th>
              <th className="text-left font-medium px-2 py-3">PO</th>
              <th className="text-left font-medium px-2 py-3">Supplier</th>
              <th className="text-left font-medium px-2 py-3">Status</th>
              <th className="text-left font-medium px-2 py-3">Reason</th>
              <th className="text-right font-medium px-2 py-3">Items</th>
              <th className="text-right font-medium pl-2 pr-4 py-3">
                Credit
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                onClick={() => onPick(r)}
                className="border-t border-[var(--jmn-line)] hover:bg-[#FAFAFA] cursor-pointer transition-colors"
              >
                <td className="pl-4 pr-2 py-3">
                  <p className="font-medium text-navy tabular">{r.number}</p>
                  <p className="text-[11px] text-ink/45 tabular">
                    {formatDate(r.created_at)}
                  </p>
                </td>
                <td className="px-2 py-3 text-navy tabular">
                  {r.purchase_order_number}
                </td>
                <td className="px-2 py-3">
                  <p className="text-navy">{r.supplier_name}</p>
                  <p className="text-[11px] text-ink/45 tabular">
                    {r.supplier_code}
                  </p>
                </td>
                <td className="px-2 py-3">
                  <span
                    className={cn(
                      "inline-flex px-2 py-0.5 rounded-full text-[10px] tracking-[0.18em] uppercase",
                      PURCHASE_TONE[r.status],
                    )}
                  >
                    {r.status_label}
                  </span>
                </td>
                <td className="px-2 py-3 text-sm text-ink/65 capitalize">
                  {r.reason.replace(/_/g, " ")}
                </td>
                <td className="px-2 py-3 text-right tabular text-ink/80">
                  {r.items.reduce((s, i) => s + i.quantity, 0)}
                </td>
                <td className="pl-2 pr-4 py-3 text-right tabular text-navy font-medium">
                  {formatPrice(Number(r.refund_amount), r.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Drawers ────────────────────────────────────────────────────────────────

function SalesReturnDrawer({
  ret,
  onClose,
  onChanged,
}: {
  ret: OrderReturnShape;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState(ret.refund_amount);
  const [refundMethod, setRefundMethod] = useState<RefundMethod | "">(
    ret.refund_method,
  );
  const [refundRef, setRefundRef] = useState(ret.refund_reference);

  async function call(label: string, fn: () => Promise<unknown>, success: string) {
    setBusy(label);
    try {
      await fn();
      toast.success(success);
      await onChanged();
    } catch (e) {
      const err = e as Error & { fields?: Record<string, string[]> };
      const msg =
        err.fields && Object.keys(err.fields).length
          ? Object.values(err.fields)[0]?.[0] ?? err.message
          : err.message;
      toast.error("Couldn't update return", msg);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] bg-navy/40 backdrop-blur-sm flex justify-end">
      <div className="bg-white w-full max-w-xl h-full overflow-hidden flex flex-col shadow-2xl shadow-navy/20 jmn-drawer-in">
        <header className="px-6 py-5 border-b border-[var(--jmn-line)] flex items-start justify-between shrink-0">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-gold mb-1">
              Sales return · {ret.status_label}
            </p>
            <h2 className="font-display text-2xl text-navy">{ret.number}</h2>
            <p className="text-xs text-ink/55 mt-1">
              Order {ret.order_number} · {ret.customer_email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-9 w-9 grid place-items-center rounded-md hover:bg-[#F4F5F7] transition-colors"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Items */}
          <section>
            <h3 className="text-[10px] tracking-[0.3em] uppercase text-gold mb-2">
              Items ({ret.items.length})
            </h3>
            <ul className="border border-[var(--jmn-line)] rounded-md divide-y divide-[var(--jmn-line)]">
              {ret.items.map((i) => (
                <li key={i.id} className="px-3 py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-navy truncate">
                      {i.order_item_name}
                    </p>
                    <p className="text-[11px] text-ink/55 tabular">
                      {i.order_item_sku}{" "}
                      {(i.order_item_color || i.order_item_size) && (
                        <>· {[i.order_item_color, i.order_item_size].filter(Boolean).join(" · ")}</>
                      )}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] tracking-[0.18em] uppercase px-2 py-0.5 rounded-full",
                      i.condition === "resalable"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800",
                    )}
                  >
                    {i.condition_label}
                  </span>
                  <span className="tabular text-sm text-navy">
                    ×{i.quantity}
                  </span>
                  <span className="tabular text-sm text-ink/65 w-16 text-right">
                    {formatPrice(Number(i.line_total), ret.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Reason */}
          <section className="text-sm text-ink/65">
            <span className="text-[10px] tracking-[0.18em] uppercase text-ink/45 mr-2">
              Reason
            </span>
            <span className="capitalize">{ret.reason.replace(/_/g, " ")}</span>
            {ret.reason_note && (
              <p className="text-[12px] text-ink/55 mt-1">{ret.reason_note}</p>
            )}
          </section>

          {/* Refund summary */}
          <section className="bg-[#FAFAFA] rounded-md p-4 space-y-2">
            <RowLine
              label="Items total"
              value={formatPrice(Number(ret.items_total), ret.currency)}
            />
            <RowLine
              label="Refund amount"
              value={formatPrice(Number(ret.refund_amount), ret.currency)}
              bold
            />
            {ret.refund_method && (
              <RowLine
                label="Method"
                value={METHOD_LABEL[ret.refund_method as RefundMethod] ?? ret.refund_method}
              />
            )}
            {ret.refund_reference && (
              <RowLine label="Reference" value={ret.refund_reference} />
            )}
          </section>

          {/* Refund input (only when goods received and not yet refunded) */}
          {ret.status === "received" && (
            <section className="border border-amber-200 bg-amber-50/40 rounded-md p-4 space-y-3">
              <h3 className="text-[10px] tracking-[0.3em] uppercase text-amber-800">
                Issue refund
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <Field label={`Amount (${ret.currency})`}>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="rd-input tabular"
                  />
                </Field>
                <Field label="Method">
                  <select
                    value={refundMethod}
                    onChange={(e) =>
                      setRefundMethod(e.target.value as RefundMethod | "")
                    }
                    className="rd-input"
                  >
                    <option value="">— select —</option>
                    {(Object.keys(METHOD_LABEL) as RefundMethod[]).map((m) => (
                      <option key={m} value={m}>
                        {METHOD_LABEL[m]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Reference">
                <input
                  value={refundRef}
                  onChange={(e) => setRefundRef(e.target.value)}
                  placeholder="Txn / cheque #"
                  className="rd-input"
                />
              </Field>
            </section>
          )}
        </div>

        {/* Action footer with state-machine buttons */}
        <footer className="px-6 py-4 border-t border-[var(--jmn-line)] flex flex-wrap justify-end gap-2 shrink-0 bg-[#FAFAFA]">
          {ret.status === "requested" && (
            <>
              <button
                onClick={async () => {
                  const ok = await confirm({
                    title: "Reject this return?",
                    description: "The customer's return request will be denied.",
                    tone: "danger",
                    confirmLabel: "Reject",
                  });
                  if (ok)
                    call("reject", () => djangoAdmin.orderReturns.reject(ret.id), "Return rejected");
                }}
                disabled={!!busy}
                className="h-9 px-3 rounded-md border border-rose-200 text-rose-700 text-[11px] tracking-[0.18em] uppercase hover:bg-rose-50 disabled:opacity-50"
              >
                <XCircle size={13} className="inline mr-1" />
                Reject
              </button>
              <button
                onClick={() =>
                  call("approve", () => djangoAdmin.orderReturns.approve(ret.id), "Return approved")
                }
                disabled={!!busy}
                className="h-9 px-3 rounded-md bg-navy text-cream text-[11px] tracking-[0.18em] uppercase hover:opacity-90 disabled:opacity-50"
              >
                {busy === "approve" && (
                  <Loader2 size={13} className="animate-spin inline mr-1" />
                )}
                Approve
              </button>
            </>
          )}
          {ret.status === "approved" && (
            <button
              onClick={() =>
                call(
                  "receive",
                  () => djangoAdmin.orderReturns.receive(ret.id),
                  "Goods received — stock updated",
                )
              }
              disabled={!!busy}
              className="h-9 px-3 rounded-md bg-amber-500 text-white text-[11px] tracking-[0.18em] uppercase hover:opacity-90 disabled:opacity-50"
            >
              {busy === "receive" && (
                <Loader2 size={13} className="animate-spin inline mr-1" />
              )}
              Mark goods received
            </button>
          )}
          {ret.status === "received" && (
            <button
              onClick={() =>
                call(
                  "refund",
                  () =>
                    djangoAdmin.orderReturns.refund(ret.id, {
                      amount: Number(refundAmount),
                      method: refundMethod,
                      reference: refundRef,
                    }),
                  "Refund recorded",
                )
              }
              disabled={!!busy || Number(refundAmount) <= 0}
              className="h-9 px-3 rounded-md bg-emerald-600 text-white text-[11px] tracking-[0.18em] uppercase hover:opacity-90 disabled:opacity-50"
            >
              {busy === "refund" && (
                <Loader2 size={13} className="animate-spin inline mr-1" />
              )}
              <CheckCircle2 size={13} className="inline mr-1" />
              Issue refund
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-md border border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-ink/65 hover:text-navy hover:border-navy/30 transition-colors"
          >
            Close
          </button>
        </footer>

        <style jsx global>{`
          .rd-input {
            width: 100%;
            height: 36px;
            padding: 0 10px;
            border: 1px solid var(--jmn-line);
            border-radius: 6px;
            background: white;
            font-size: 14px;
            color: var(--jmn-ink, #0a0a0a);
          }
          .rd-input:focus {
            outline: none;
            border-color: var(--jmn-navy, #0e1a3a);
            box-shadow: 0 0 0 3px rgba(14, 26, 58, 0.08);
          }
        `}</style>
      </div>
    </div>
  );
}

function PurchaseReturnDrawer({
  ret,
  onClose,
  onChanged,
}: {
  ret: PurchaseReturnShape;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState(ret.refund_amount);
  const [refundMethod, setRefundMethod] = useState<RefundMethod | "">(
    ret.refund_method,
  );
  const [refundRef, setRefundRef] = useState(ret.refund_reference);

  async function call(label: string, fn: () => Promise<unknown>, success: string) {
    setBusy(label);
    try {
      await fn();
      toast.success(success);
      await onChanged();
    } catch (e) {
      const err = e as Error & { fields?: Record<string, string[]> };
      const msg =
        err.fields && Object.keys(err.fields).length
          ? Object.values(err.fields)[0]?.[0] ?? err.message
          : err.message;
      toast.error("Couldn't update return", msg);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] bg-navy/40 backdrop-blur-sm flex justify-end">
      <div className="bg-white w-full max-w-xl h-full overflow-hidden flex flex-col shadow-2xl shadow-navy/20 jmn-drawer-in">
        <header className="px-6 py-5 border-b border-[var(--jmn-line)] flex items-start justify-between shrink-0">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-gold mb-1">
              Purchase return · {ret.status_label}
            </p>
            <h2 className="font-display text-2xl text-navy">{ret.number}</h2>
            <p className="text-xs text-ink/55 mt-1">
              PO {ret.purchase_order_number} · {ret.supplier_name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-9 w-9 grid place-items-center rounded-md hover:bg-[#F4F5F7] transition-colors"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <section>
            <h3 className="text-[10px] tracking-[0.3em] uppercase text-gold mb-2">
              Items ({ret.items.length})
            </h3>
            <ul className="border border-[var(--jmn-line)] rounded-md divide-y divide-[var(--jmn-line)]">
              {ret.items.map((i) => (
                <li key={i.id} className="px-3 py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-navy truncate">{i.poi_name}</p>
                    <p className="text-[11px] text-ink/55 tabular">
                      {i.poi_sku}{" "}
                      {(i.poi_color || i.poi_size) && (
                        <>· {[i.poi_color, i.poi_size].filter(Boolean).join(" · ")}</>
                      )}
                    </p>
                  </div>
                  <span className="tabular text-sm text-navy">
                    ×{i.quantity}
                  </span>
                  <span className="tabular text-sm text-ink/65 w-20 text-right">
                    {formatPrice(Number(i.line_total), ret.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="text-sm text-ink/65">
            <span className="text-[10px] tracking-[0.18em] uppercase text-ink/45 mr-2">
              Reason
            </span>
            <span className="capitalize">{ret.reason.replace(/_/g, " ")}</span>
            {ret.reason_note && (
              <p className="text-[12px] text-ink/55 mt-1">{ret.reason_note}</p>
            )}
          </section>

          <section className="bg-[#FAFAFA] rounded-md p-4 space-y-2">
            <RowLine
              label="Items total"
              value={formatPrice(Number(ret.items_total), ret.currency)}
            />
            <RowLine
              label="Refund / credit"
              value={formatPrice(Number(ret.refund_amount), ret.currency)}
              bold
            />
            {ret.refund_method && (
              <RowLine
                label="Method"
                value={METHOD_LABEL[ret.refund_method as RefundMethod] ?? ret.refund_method}
              />
            )}
            {ret.refund_reference && (
              <RowLine label="Reference" value={ret.refund_reference} />
            )}
          </section>

          {ret.status === "posted" && (
            <section className="border border-amber-200 bg-amber-50/40 rounded-md p-4 space-y-3">
              <h3 className="text-[10px] tracking-[0.3em] uppercase text-amber-800">
                Record supplier credit
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <Field label={`Amount (${ret.currency})`}>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="rd-input tabular"
                  />
                </Field>
                <Field label="Method">
                  <select
                    value={refundMethod}
                    onChange={(e) =>
                      setRefundMethod(e.target.value as RefundMethod | "")
                    }
                    className="rd-input"
                  >
                    <option value="">— select —</option>
                    {(Object.keys(METHOD_LABEL) as RefundMethod[]).map((m) => (
                      <option key={m} value={m}>
                        {METHOD_LABEL[m]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Reference">
                <input
                  value={refundRef}
                  onChange={(e) => setRefundRef(e.target.value)}
                  placeholder="Credit note #"
                  className="rd-input"
                />
              </Field>
            </section>
          )}
        </div>

        <footer className="px-6 py-4 border-t border-[var(--jmn-line)] flex flex-wrap justify-end gap-2 shrink-0 bg-[#FAFAFA]">
          {ret.status === "draft" && (
            <>
              <button
                onClick={async () => {
                  const ok = await confirm({
                    title: "Cancel this return?",
                    description: "The draft will be discarded — no stock or money moves.",
                    tone: "danger",
                    confirmLabel: "Cancel return",
                  });
                  if (ok)
                    call(
                      "cancel",
                      () => djangoAdmin.purchaseReturns.cancel(ret.id),
                      "Return cancelled",
                    );
                }}
                disabled={!!busy}
                className="h-9 px-3 rounded-md border border-rose-200 text-rose-700 text-[11px] tracking-[0.18em] uppercase hover:bg-rose-50 disabled:opacity-50"
              >
                <XCircle size={13} className="inline mr-1" />
                Cancel
              </button>
              <button
                onClick={() =>
                  call(
                    "post",
                    () => djangoAdmin.purchaseReturns.post(ret.id),
                    "Goods pulled from stock",
                  )
                }
                disabled={!!busy}
                className="h-9 px-3 rounded-md bg-amber-500 text-white text-[11px] tracking-[0.18em] uppercase hover:opacity-90 disabled:opacity-50"
              >
                {busy === "post" && (
                  <Loader2 size={13} className="animate-spin inline mr-1" />
                )}
                Post (pull stock)
              </button>
            </>
          )}
          {ret.status === "posted" && (
            <button
              onClick={() =>
                call(
                  "refund",
                  () =>
                    djangoAdmin.purchaseReturns.refund(ret.id, {
                      amount: Number(refundAmount),
                      method: refundMethod,
                      reference: refundRef,
                    }),
                  "Supplier credit recorded",
                )
              }
              disabled={!!busy || Number(refundAmount) <= 0}
              className="h-9 px-3 rounded-md bg-emerald-600 text-white text-[11px] tracking-[0.18em] uppercase hover:opacity-90 disabled:opacity-50"
            >
              {busy === "refund" && (
                <Loader2 size={13} className="animate-spin inline mr-1" />
              )}
              <CheckCircle2 size={13} className="inline mr-1" />
              Record credit
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-md border border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-ink/65 hover:text-navy hover:border-navy/30 transition-colors"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "emerald" | "amber";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50/50"
      : tone === "amber"
      ? "border-amber-200 bg-amber-50/50"
      : "border-[var(--jmn-line)] bg-white";
  return (
    <div className={cn("rounded-lg border p-4", toneClass)}>
      <div className="flex items-center gap-2 text-[10px] tracking-[0.18em] uppercase text-ink/55">
        {icon}
        {label}
      </div>
      <p className="font-display text-2xl text-navy tabular mt-2">{value}</p>
    </div>
  );
}

function RowLine({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink/55">{label}</span>
      <span
        className={cn(
          "tabular text-navy",
          bold && "font-semibold text-base",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] tracking-[0.18em] uppercase text-ink/55 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
