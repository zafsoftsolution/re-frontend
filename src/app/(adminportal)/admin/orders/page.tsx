"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Download, FileText, Loader2, Plus, RefreshCw, X } from "lucide-react";
import { djangoAdmin, type PaginatedResponse } from "@/lib/django-admin";
import { useToast } from "@/context/FeedbackContext";
import { formatDate, formatPrice } from "@/lib/utils";
import PageHeader from "@/components/admin/PageHeader";
import DataTable, { type Column } from "@/components/admin/DataTable";
import StatusPill from "@/components/admin/StatusPill";
import AdminOrderCreate from "@/components/admin/AdminOrderCreate";
import CreateOrderReturn from "@/components/admin/CreateOrderReturn";

interface AdminOrder {
  id: string;
  order_number: string;
  user: string | null;
  customer_email: string;
  customer_phone: string;
  status: string;
  payment_status: string;
  payment_method: string;
  shipping_address: Record<string, string>;
  billing_address: Record<string, string>;
  subtotal: string;
  discount: string;
  shipping: string;
  tax: string;
  total: string;
  currency: string;
  coupon_code: string;
  items: Array<{
    id: string;
    product_name: string;
    sku: string;
    color: string;
    size: string;
    quantity: number;
    unit_price: string;
    total: string;
  }>;
  timeline: Array<{ id: string; status: string; note: string; at: string }>;
  placed_at: string;
}

const STATUS_OPTIONS = [
  "pending_payment",
  "processing",
  "ready_to_ship",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
  "refunded",
] as const;

const FILTERS: { key: "all" | (typeof STATUS_OPTIONS)[number]; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending_payment", label: "Pending" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

export default function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [active, setActive] = useState<AdminOrder | null>(null);
  const [creating, setCreating] = useState(false);
  const toast = useToast();

  const load = async () => {
    setError(null);
    try {
      const data = await djangoAdmin.orders.list({ ordering: "-placed_at" });
      const rows =
        (data as unknown as PaginatedResponse<AdminOrder>).results ??
        (data as unknown as AdminOrder[]);
      setOrders(rows);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!orders) return [];
    if (filter === "all") return orders;
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const columns: Column<AdminOrder>[] = [
    {
      key: "orderNumber",
      header: "Order",
      sortable: true,
      accessor: (o) => o.order_number,
      render: (o) => (
        <span className="font-medium text-navy">{o.order_number}</span>
      ),
    },
    {
      key: "placedAt",
      header: "Placed",
      sortable: true,
      accessor: (o) => o.placed_at,
      render: (o) => (
        <span className="text-sm text-ink/65">{formatDate(o.placed_at)}</span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      accessor: (o) => o.customer_email,
      render: (o) => (
        <span className="text-sm text-ink/80 truncate">{o.customer_email}</span>
      ),
    },
    {
      key: "items",
      header: "Items",
      align: "right",
      accessor: (o) => o.items.length,
      render: (o) => (
        <span className="tabular text-sm text-ink/65">{o.items.length}</span>
      ),
    },
    {
      key: "total",
      header: "Total",
      sortable: true,
      align: "right",
      accessor: (o) => Number(o.total),
      render: (o) => (
        <span className="tabular text-sm text-navy">
          {formatPrice(Number(o.total), o.currency)}
        </span>
      ),
    },
    {
      key: "payment",
      header: "Payment",
      accessor: (o) => o.payment_status,
      render: (o) => (
        <span
          className={`text-[11px] tracking-[0.18em] uppercase ${
            o.payment_status === "paid"
              ? "text-emerald-700"
              : o.payment_status === "failed" || o.payment_status === "refunded"
              ? "text-rose-700"
              : "text-amber-700"
          }`}
        >
          {o.payment_status}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (o) => o.status,
      render: (o) => <StatusPill status={o.status} />,
    },
    {
      // Quick PDF download — useful when packing a batch of orders for the
      // courier. e.stopPropagation so the row's drawer-open click doesn't
      // also fire.
      key: "pdf",
      header: "PDF",
      align: "center",
      accessor: () => "",
      render: (o) => <InvoiceCell order={o} />,
    },
  ];

  if (error) {
    return (
      <div className="rounded-md bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (!orders) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 size={22} className="text-navy/60 animate-spin" />
      </div>
    );
  }

  const counts = {
    all: orders.length,
    pending_payment: orders.filter((o) => o.status === "pending_payment").length,
    processing: orders.filter((o) => o.status === "processing").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Orders"
        description="Every order across web, B2B, and POS — filter, audit, and dispatch."
        actions={
          <div className="flex gap-2">
            <button
              onClick={async () => {
                try {
                  // Pass the same status filter that's active on the tabs so
                  // the export matches what the operator sees.
                  const file = await djangoAdmin.orders.exportCsv(
                    filter === "all" ? undefined : { status: filter },
                  );
                  toast.success("Exported", file);
                } catch (e) {
                  toast.error("Couldn't export", (e as Error).message);
                }
              }}
              className="h-9 px-4 rounded-md border border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-ink/65 hover:text-navy hover:border-navy/30 transition-colors flex items-center gap-2"
            >
              <Download size={13} /> Export CSV
            </button>
            <button
              onClick={() => setCreating(true)}
              className="h-9 px-4 rounded-md bg-navy text-cream text-[12px] tracking-[0.1em] uppercase hover:bg-navy-deep transition-colors flex items-center gap-2"
            >
              <Plus size={13} /> New order
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-1 border-b border-[var(--jmn-line)]">
        {FILTERS.map((t) => {
          const isActive = filter === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-4 py-2.5 text-[12px] tracking-[0.15em] uppercase transition-colors border-b-2 -mb-px flex items-center gap-2 ${
                isActive
                  ? "text-navy border-gold"
                  : "text-ink/55 border-transparent hover:text-navy"
              }`}
            >
              {t.label}
              <span
                className={`text-[10px] tabular px-1.5 rounded-full ${
                  isActive ? "bg-gold/20 text-navy" : "bg-ink/5 text-ink/55"
                }`}
              >
                {counts[t.key as keyof typeof counts]}
              </span>
            </button>
          );
        })}
      </div>

      <DataTable<AdminOrder>
        rows={filtered}
        columns={columns}
        rowKey={(o) => o.id}
        searchPlaceholder="Search by order number or email…"
        searchAccessor={(o) => `${o.order_number} ${o.customer_email}`}
        pageSize={12}
        emptyTitle="No orders match this filter."
        onRowClick={setActive}
      />

      {active && (
        <OrderDrawer
          order={active}
          onClose={() => setActive(null)}
          onChanged={async () => {
            await load();
            const fresh = await djangoAdmin.orders.get(active.id);
            setActive(fresh as AdminOrder);
          }}
        />
      )}

      {creating && (
        <AdminOrderCreate
          onClose={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

// Quick-download cell that lives inside the orders DataTable. Sits in its
// own component so it can hold the per-row `downloading` state without
// re-rendering the whole table on every click.
function InvoiceCell({ order }: { order: AdminOrder }) {
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        setDownloading(true);
        try {
          const f = await djangoAdmin.orders.downloadInvoicePdf(
            order.id,
            order.order_number,
          );
          toast.success("Invoice downloaded", f);
        } catch (err) {
          toast.error("Couldn't download", (err as Error).message);
        } finally {
          setDownloading(false);
        }
      }}
      disabled={downloading}
      title="Download invoice / delivery slip"
      aria-label={`Download invoice ${order.order_number}`}
      className="h-7 w-7 inline-grid place-items-center rounded text-ink/55 hover:text-navy hover:bg-navy/5 transition-colors disabled:opacity-40"
    >
      {downloading ? (
        <Loader2 size={13} className="animate-spin" />
      ) : (
        <FileText size={13} />
      )}
    </button>
  );
}

function OrderDrawer({
  order,
  onClose,
  onChanged,
}: {
  order: AdminOrder;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState(order.status);
  const [note, setNote] = useState("");
  const [returnOpen, setReturnOpen] = useState(false);
  const toast = useToast();

  async function downloadInvoice() {
    setBusy("invoice");
    try {
      const filename = await djangoAdmin.orders.downloadInvoicePdf(
        order.id,
        order.order_number,
      );
      toast.success("Invoice downloaded", filename);
    } catch (e) {
      toast.error("Couldn't generate invoice", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function applyStatus() {
    setBusy("status");
    setError(null);
    try {
      await djangoAdmin.orders.updateStatus(order.id, statusDraft, note || undefined);
      setNote("");
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function markPaid() {
    setBusy("paid");
    setError(null);
    try {
      await djangoAdmin.orders.markPaid(order.id);
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    // Backdrop click does NOT close the drawer — only the X / Cancel buttons.
    // Two reasons: (1) consistency with every other admin modal in the app,
    // and (2) when the nested "Process return" drawer renders inside this
    // tree, its clicks would bubble up and dismiss this drawer too.
    <div className="fixed inset-0 z-[80] bg-navy/40 backdrop-blur-sm flex justify-end">
      <div className="bg-white w-full max-w-xl h-full overflow-y-auto">
        <div className="px-6 py-5 border-b border-[var(--jmn-line)] flex items-center justify-between">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-gold mb-1">
              Order
            </p>
            <h2 className="font-display text-2xl text-navy">{order.order_number}</h2>
            <p className="text-xs text-ink/55 mt-1">
              Placed {formatDate(order.placed_at)} · {order.customer_email}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-9 w-9 grid place-items-center rounded-md hover:bg-[#F4F5F7] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 border-b border-[var(--jmn-line)]">
          <p className="text-[10px] tracking-[0.3em] uppercase text-ink/55 mb-3">
            Status
          </p>
          <div className="flex items-center gap-3 mb-3">
            <StatusPill status={order.status} />
            <span className="text-[10px] tracking-[0.18em] uppercase text-ink/45">
              · Payment {order.payment_status}
            </span>
          </div>
          <div className="grid sm:grid-cols-[1fr_auto] gap-2">
            <div className="relative">
              <select
                value={statusDraft}
                onChange={(e) => setStatusDraft(e.target.value)}
                className="w-full appearance-none h-10 pl-3 pr-9 rounded-md border border-[var(--jmn-line)] bg-white text-sm text-navy focus:border-navy/40 outline-none"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/45 pointer-events-none"
              />
            </div>
            <button
              onClick={applyStatus}
              disabled={busy === "status" || statusDraft === order.status}
              className="h-10 px-4 rounded-md bg-navy text-cream text-[12px] tracking-[0.1em] uppercase hover:bg-navy-deep disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {busy === "status" ? "Saving…" : "Update"}
            </button>
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note for this status change"
            className="mt-2 w-full h-10 px-3 rounded-md border border-[var(--jmn-line)] text-sm focus:border-navy/40 outline-none"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {order.payment_status !== "paid" && (
              <button
                onClick={markPaid}
                disabled={busy === "paid"}
                className="h-9 px-3 rounded-md border border-emerald-700/40 text-emerald-700 text-[11px] tracking-[0.18em] uppercase hover:bg-emerald-50 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <CheckCircle2 size={13} />
                {busy === "paid" ? "Marking paid…" : "Mark paid"}
              </button>
            )}
            {/*
             * Download the printable invoice / delivery slip for this order.
             * Used to hand the rider a paper slip + signature box at the door.
             */}
            <button
              onClick={downloadInvoice}
              disabled={busy === "invoice"}
              className="h-9 px-3 rounded-md border border-navy/30 text-navy text-[11px] tracking-[0.18em] uppercase hover:bg-navy/5 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {busy === "invoice" ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <FileText size={13} />
              )}
              Invoice PDF
            </button>
            {/* Process a customer return against this order. Opens a drawer
                to pick items + qty + condition; status flows through
                approve → receive → refund on /admin/returns. */}
            <button
              onClick={() => setReturnOpen(true)}
              disabled={!!busy}
              className="h-9 px-3 rounded-md border border-amber-300 text-amber-800 text-[11px] tracking-[0.18em] uppercase hover:bg-amber-50 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <RefreshCw size={13} />
              Process return
            </button>
          </div>

          {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
        </div>

        <div className="px-6 py-5 border-b border-[var(--jmn-line)]">
          <p className="text-[10px] tracking-[0.3em] uppercase text-ink/55 mb-3">
            Items ({order.items.length})
          </p>
          <ul className="space-y-3">
            {order.items.map((it) => (
              <li
                key={it.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="truncate">
                  {it.product_name}{" "}
                  <span className="text-ink/45">
                    · {it.color} · {it.size} · ×{it.quantity}
                  </span>
                </span>
                <span className="tabular text-navy shrink-0">
                  {formatPrice(Number(it.total), order.currency)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-5 pt-4 border-t border-[var(--jmn-line)] space-y-1.5 text-sm">
            <Row label="Subtotal" value={formatPrice(Number(order.subtotal), order.currency)} />
            {Number(order.discount) > 0 && (
              <Row
                label={`Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}`}
                value={`− ${formatPrice(Number(order.discount), order.currency)}`}
              />
            )}
            <Row label="Shipping" value={formatPrice(Number(order.shipping), order.currency)} />
            <Row label="Tax" value={formatPrice(Number(order.tax), order.currency)} />
            <Row
              label="Total"
              value={formatPrice(Number(order.total), order.currency)}
              bold
            />
          </div>
        </div>

        <div className="px-6 py-5 border-b border-[var(--jmn-line)]">
          <p className="text-[10px] tracking-[0.3em] uppercase text-ink/55 mb-3">
            Shipping to
          </p>
          <AddressBlock address={order.shipping_address} />
        </div>

        <div className="px-6 py-5">
          <p className="text-[10px] tracking-[0.3em] uppercase text-ink/55 mb-3">
            Timeline
          </p>
          <ol className="space-y-3 border-l border-[var(--jmn-line)] pl-4">
            {order.timeline.map((t) => (
              <li key={t.id} className="relative">
                <span className="absolute -left-[19px] top-1 h-2 w-2 rounded-full bg-gold" />
                <p className="text-sm text-navy">{t.status.replace(/_/g, " ")}</p>
                <p className="text-[11px] text-ink/50 tabular">
                  {formatDate(t.at)}
                  {t.note && <span className="ml-2 text-ink/65">— {t.note}</span>}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Process-return drawer — opens stacked on top of this OrderDrawer. */}
      {returnOpen && (
        <CreateOrderReturn
          order={{
            id: order.id,
            order_number: order.order_number,
            customer_email: order.customer_email,
            currency: order.currency,
            items: order.items.map((it) => ({
              id: it.id,
              product_name: it.product_name,
              sku: it.sku,
              color: it.color,
              size: it.size,
              quantity: it.quantity,
              unit_price: it.unit_price,
              total: it.total,
            })),
          }}
          onClose={() => setReturnOpen(false)}
          onCreated={async () => {
            setReturnOpen(false);
            await onChanged();
            toast.success("Return created", "Find it under Returns to continue.");
          }}
        />
      )}
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${
        bold ? "pt-2 border-t border-[var(--jmn-line)] text-navy font-medium" : ""
      }`}
    >
      <span className="text-ink/60">{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}

function AddressBlock({ address }: { address: Record<string, string> }) {
  if (!address) return <p className="text-sm text-ink/55">—</p>;
  return (
    <div className="text-sm leading-relaxed text-ink/80">
      <p className="font-medium text-navy">
        {address.first_name || address.firstName} {address.last_name || address.lastName}
      </p>
      {address.company && <p>{address.company}</p>}
      <p>{address.line1}</p>
      {address.line2 && <p>{address.line2}</p>}
      <p>
        {address.city}
        {address.state ? `, ${address.state}` : ""} {address.postcode}
      </p>
      <p>{address.country}</p>
      {address.phone && <p className="mt-2 text-ink/55">{address.phone}</p>}
    </div>
  );
}
