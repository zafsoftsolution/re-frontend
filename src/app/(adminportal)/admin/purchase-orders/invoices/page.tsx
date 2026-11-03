"use client";

/**
 * Purchase Invoices
 * -----------------
 * One row per non-draft, non-cancelled PO with its financial state — total,
 * paid, balance, overdue flag. Header strip shows supplier-wise outstanding
 * totals. Row click opens a drawer with the full payment ledger + a quick
 * "record payment" form so cashing a supplier off doesn't require leaving
 * this page.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Wallet,
  X,
} from "lucide-react";
import {
  djangoAdmin,
  type PaginatedResponse,
  type PurchaseOrderListShape,
  type PurchaseOrderShape,
  type PurchasePaymentMethod,
  type PurchasePaymentStatus,
  type PurchasePaymentShape,
  type SupplierDueShape,
  type SupplierShape,
} from "@/lib/django-admin";
import { useToast } from "@/context/FeedbackContext";
import PageHeader from "@/components/admin/PageHeader";
import { cn, formatDate, formatPrice } from "@/lib/utils";

type FilterTab = "all" | "unpaid" | "partial" | "paid" | "overdue";

const TAB_LABEL: Record<FilterTab, string> = {
  all: "All",
  unpaid: "Unpaid",
  partial: "Partially paid",
  paid: "Paid",
  overdue: "Overdue",
};

const METHOD_LABEL: Record<PurchasePaymentMethod, string> = {
  cash: "Cash",
  bank: "Bank",
  mobile: "Mobile",
  cheque: "Cheque",
  card: "Card",
  other: "Other",
};

export default function PurchaseInvoicesPage() {
  const [rows, setRows] = useState<PurchaseOrderListShape[] | null>(null);
  const [dues, setDues] = useState<SupplierDueShape[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [tab, setTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [suppliers, setSuppliers] = useState<SupplierShape[] | null>(null);

  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);

  // State is only set in promise callbacks so the effect can call this without a
  // synchronous setState (react-hooks/set-state-in-effect).
  const load = useCallback(() => {
    const query: Parameters<typeof djangoAdmin.purchaseOrders.invoices>[0] = {
      page_size: 100,
    };
    if (tab === "unpaid" || tab === "partial" || tab === "paid") {
      query.payment_status = tab as PurchasePaymentStatus;
    } else if (tab === "overdue") {
      query.overdue = "1";
    }
    if (supplierFilter) query.supplier = supplierFilter;
    if (search.trim()) query.search = search.trim();

    return Promise.all([
      djangoAdmin.purchaseOrders.invoices(query),
      djangoAdmin.purchaseOrders.supplierDues(),
    ]).then(
      ([list, due]) => {
        setError(null);
        setRows(
          (list as PaginatedResponse<PurchaseOrderListShape>).results ??
            (list as unknown as PurchaseOrderListShape[]),
        );
        setDues(due);
      },
      (e) => setError((e as Error).message),
    );
  }, [tab, supplierFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  // Suppliers for the filter dropdown — load once.
  useEffect(() => {
    djangoAdmin.suppliers
      .list({ page_size: 200 })
      .then((data) => {
        const items =
          (data as PaginatedResponse<SupplierShape>).results ??
          (data as unknown as SupplierShape[]);
        setSuppliers(items);
      })
      .catch(() => {});
  }, []);

  // Aggregate KPI strip — sum across all rows currently in the table so the
  // numbers stay coherent with whatever filter is active.
  const summary = useMemo(() => {
    const list = rows ?? [];
    let totalBilled = 0;
    let totalPaid = 0;
    let balance = 0;
    let overdue = 0;
    let open = 0;
    for (const r of list) {
      totalBilled += Number(r.total) || 0;
      totalPaid += Number(r.amount_paid) || 0;
      balance += Number(r.balance_due) || 0;
      if (r.payment_status !== "paid") open += 1;
      if (r.is_overdue) overdue += 1;
    }
    return { totalBilled, totalPaid, balance, overdue, open, count: list.length };
  }, [rows]);

  if (error && !rows) {
    return (
      <div className="rounded-md bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Purchasing"
        title="Purchase invoices"
        description="Every billable purchase order — who's been cleared, who's still owed, who's overdue. Click a row to record a payment."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/purchase-orders"
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm border border-[var(--jmn-line)] hover:bg-[#FAFAFA]"
            >
              <ArrowLeft size={14} />
              Purchase orders
            </Link>
            <Link
              href="/admin/purchase-orders/new"
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm bg-navy text-cream hover:opacity-90"
            >
              <Plus size={14} />
              New PO
            </Link>
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

      {/* Summary KPIs — derived from whatever's in the current filter. */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          icon={<Wallet size={14} />}
          label="Billed"
          value={formatPrice(summary.totalBilled)}
          hint={`${summary.count} invoices`}
        />
        <Stat
          icon={<CheckCircle2 size={14} className="text-emerald-600" />}
          label="Paid"
          value={formatPrice(summary.totalPaid)}
          tone="emerald"
        />
        <Stat
          icon={<Clock size={14} className="text-amber-600" />}
          label="Outstanding"
          value={formatPrice(summary.balance)}
          hint={`${summary.open} open`}
          tone="amber"
        />
        <Stat
          icon={<AlertTriangle size={14} className="text-rose-600" />}
          label="Overdue"
          value={String(summary.overdue)}
          hint="needs follow-up"
          tone="rose"
        />
      </section>

      {/* Supplier-wise dues — small horizontally-scrolling strip. */}
      {dues && dues.length > 0 && (
        <section className="bg-white border border-[var(--jmn-line)] rounded-lg">
          <header className="px-4 py-3 border-b border-[var(--jmn-line)] flex items-center justify-between">
            <h2 className="text-[10px] tracking-[0.3em] uppercase text-gold">
              Supplier balances
            </h2>
            <span className="text-[11px] text-ink/55 tabular">
              {dues.length} supplier{dues.length === 1 ? "" : "s"}
            </span>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAFA] text-[10px] tracking-[0.18em] uppercase text-ink/55">
                <tr>
                  <th className="text-left font-medium pl-4 pr-2 py-2.5">
                    Supplier
                  </th>
                  <th className="text-right font-medium px-2 py-2.5">
                    Billed
                  </th>
                  <th className="text-right font-medium px-2 py-2.5">Paid</th>
                  <th className="text-right font-medium px-2 py-2.5">
                    Balance
                  </th>
                  <th className="text-right font-medium px-2 py-2.5">Open</th>
                  <th className="text-right font-medium pr-4 pl-2 py-2.5">
                    Overdue
                  </th>
                </tr>
              </thead>
              <tbody>
                {dues.map((d) => {
                  const balance = Number(d.balance_due) || 0;
                  const tone =
                    balance <= 0
                      ? "text-emerald-700"
                      : d.overdue_invoice_count > 0
                      ? "text-rose-700"
                      : "text-amber-700";
                  return (
                    <tr
                      key={d.supplier + d.currency}
                      onClick={() =>
                        setSupplierFilter(
                          supplierFilter === d.supplier ? "" : d.supplier,
                        )
                      }
                      className={cn(
                        "border-t border-[var(--jmn-line)] hover:bg-[#FAFAFA] cursor-pointer transition-colors",
                        supplierFilter === d.supplier && "bg-navy/[0.04]",
                      )}
                    >
                      <td className="pl-4 pr-2 py-2.5">
                        <div className="min-w-0">
                          <p className="font-medium text-navy truncate">
                            {d.supplier_name}
                          </p>
                          <p className="text-[11px] text-ink/45 tabular">
                            {d.supplier_code} · {d.currency}
                          </p>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-right tabular text-ink/80">
                        {formatPrice(Number(d.total_billed) || 0, d.currency)}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular text-emerald-700">
                        {formatPrice(Number(d.total_paid) || 0, d.currency)}
                      </td>
                      <td
                        className={cn(
                          "px-2 py-2.5 text-right tabular font-semibold",
                          tone,
                        )}
                      >
                        {formatPrice(balance, d.currency)}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular text-ink/65">
                        {d.open_invoice_count}
                      </td>
                      <td className="pr-4 pl-2 py-2.5 text-right tabular">
                        {d.overdue_invoice_count > 0 ? (
                          <span className="text-rose-700 font-medium">
                            {d.overdue_invoice_count}
                          </span>
                        ) : (
                          <span className="text-ink/35">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Filters */}
      <section className="bg-white border border-[var(--jmn-line)] rounded-lg p-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-[#FAFAFA] rounded-md p-1">
          {(Object.keys(TAB_LABEL) as FilterTab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "px-3 h-8 rounded text-[11px] tracking-[0.18em] uppercase transition-colors",
                tab === t
                  ? "bg-white text-navy shadow-sm"
                  : "text-ink/55 hover:text-navy",
              )}
            >
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-[180px] flex items-center gap-2 h-9 px-3 bg-[#FAFAFA] rounded-md">
          <Search size={14} className="text-ink/45" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search PO #, supplier, reference…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink/40"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-ink/45 hover:text-navy"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          className="h-9 px-3 rounded-md bg-[#FAFAFA] text-sm text-navy outline-none"
        >
          <option value="">All suppliers</option>
          {suppliers?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </section>

      {/* Invoice list */}
      {!rows ? (
        <div className="grid place-items-center py-20">
          <Loader2 size={22} className="text-navy/60 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-[var(--jmn-line)] rounded-lg px-6 py-16 text-center">
          <Wallet size={20} className="mx-auto text-ink/30 mb-2" />
          <p className="text-sm text-ink/55">
            No invoices match the current filter.
          </p>
        </div>
      ) : (
        <section className="bg-white border border-[var(--jmn-line)] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAFA] text-[10px] tracking-[0.18em] uppercase text-ink/55">
                <tr>
                  <th className="text-left font-medium pl-4 pr-2 py-3">
                    Invoice
                  </th>
                  <th className="text-left font-medium px-2 py-3">Supplier</th>
                  <th className="text-left font-medium px-2 py-3">Status</th>
                  <th className="text-right font-medium px-2 py-3">Total</th>
                  <th className="text-right font-medium px-2 py-3">Paid</th>
                  <th className="text-right font-medium px-2 py-3">Balance</th>
                  <th className="text-left font-medium px-2 py-3">Due / Paid</th>
                  <th className="pl-2 pr-2 py-3 w-[60px] text-center">PDF</th>
                  <th className="pl-2 pr-4 py-3 w-[40px]" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <InvoiceRow
                    key={r.id}
                    row={r}
                    onClick={() => setActiveInvoiceId(r.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Invoice drawer — payment history + record-payment form. */}
      {activeInvoiceId && (
        <InvoiceDrawer
          poId={activeInvoiceId}
          onClose={() => setActiveInvoiceId(null)}
          onChanged={async () => {
            await load();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────

function Stat({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "emerald" | "amber" | "rose";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50/50"
      : tone === "amber"
      ? "border-amber-200 bg-amber-50/50"
      : tone === "rose"
      ? "border-rose-200 bg-rose-50/50"
      : "border-[var(--jmn-line)] bg-white";
  return (
    <div className={cn("rounded-lg border p-4", toneClass)}>
      <div className="flex items-center gap-2 text-[10px] tracking-[0.18em] uppercase text-ink/55">
        {icon}
        {label}
      </div>
      <p className="font-display text-2xl text-navy tabular mt-2">{value}</p>
      {hint && <p className="text-[11px] text-ink/45 mt-1">{hint}</p>}
    </div>
  );
}

function InvoiceRow({
  row,
  onClick,
}: {
  row: PurchaseOrderListShape;
  onClick: () => void;
}) {
  const total = Number(row.total) || 0;
  const paid = Number(row.amount_paid) || 0;
  const balance = Number(row.balance_due) || 0;
  const due = computeDue(row);
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);

  async function downloadPdf(e: React.MouseEvent) {
    // Don't trigger the row's onClick (which opens the drawer).
    e.stopPropagation();
    setDownloading(true);
    try {
      const filename = await djangoAdmin.purchaseOrders.downloadInvoicePdf(
        row.id,
        row.number,
      );
      toast.success("Invoice downloaded", filename);
    } catch (err) {
      toast.error("Couldn't download invoice", (err as Error).message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <tr
      onClick={onClick}
      className="border-t border-[var(--jmn-line)] hover:bg-[#FAFAFA] cursor-pointer transition-colors"
    >
      <td className="pl-4 pr-2 py-3">
        <p className="font-medium text-navy tabular">{row.number}</p>
        <p className="text-[11px] text-ink/45 tabular">
          {formatDate(row.created_at)}
        </p>
      </td>
      <td className="px-2 py-3">
        <p className="text-navy truncate max-w-[200px]">{row.supplier_name}</p>
        <p className="text-[11px] text-ink/45 tabular">{row.supplier_code}</p>
      </td>
      <td className="px-2 py-3">
        <PaymentBadge status={row.payment_status} overdue={row.is_overdue} />
      </td>
      <td className="px-2 py-3 text-right tabular text-navy">
        {formatPrice(total, row.currency)}
      </td>
      <td className="px-2 py-3 text-right tabular text-emerald-700">
        {formatPrice(paid, row.currency)}
      </td>
      <td
        className={cn(
          "px-2 py-3 text-right tabular font-medium",
          balance <= 0
            ? "text-emerald-700"
            : row.is_overdue
            ? "text-rose-700"
            : "text-amber-700",
        )}
      >
        {formatPrice(balance, row.currency)}
      </td>
      <td className="px-2 py-3 text-[11px] text-ink/65 tabular">{due}</td>
      <td className="pl-2 pr-2 py-3 text-center">
        <button
          type="button"
          onClick={downloadPdf}
          disabled={downloading}
          title="Download invoice PDF"
          aria-label={`Download invoice ${row.number}`}
          className="h-7 w-7 inline-grid place-items-center rounded text-ink/55 hover:text-navy hover:bg-navy/5 transition-colors disabled:opacity-40"
        >
          {downloading ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Download size={13} />
          )}
        </button>
      </td>
      <td className="pl-2 pr-4 py-3 text-right">
        <ChevronRight size={16} className="text-ink/35" />
      </td>
    </tr>
  );
}

function PaymentBadge({
  status,
  overdue,
}: {
  status: PurchasePaymentStatus;
  overdue: boolean;
}) {
  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] tracking-[0.18em] uppercase">
        <CheckCircle2 size={11} />
        Paid
      </span>
    );
  }
  if (overdue) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] tracking-[0.18em] uppercase">
        <AlertTriangle size={11} />
        Overdue
      </span>
    );
  }
  if (status === "partial") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] tracking-[0.18em] uppercase">
        <Clock size={11} />
        Partial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ink/10 text-ink/70 text-[10px] tracking-[0.18em] uppercase">
      <Clock size={11} />
      Unpaid
    </span>
  );
}

function computeDue(row: PurchaseOrderListShape): string {
  if (row.payment_status === "paid") {
    return row.paid_at ? `Paid ${formatDate(row.paid_at)}` : "Paid";
  }
  const anchor = row.ordered_at || row.created_at;
  if (!anchor || row.payment_terms_days == null) return "—";
  const due = new Date(anchor);
  due.setDate(due.getDate() + Number(row.payment_terms_days || 0));
  const today = new Date();
  const ms = due.getTime() - today.getTime();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  return `Due in ${days} day${days === 1 ? "" : "s"}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Invoice drawer — payment history + record-payment form
// ─────────────────────────────────────────────────────────────────────────────

function InvoiceDrawer({
  poId,
  onClose,
  onChanged,
}: {
  poId: string;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [po, setPo] = useState<PurchaseOrderShape | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PurchasePaymentMethod>("cash");
  const [reference, setReference] = useState("");
  const [paidDate, setPaidDate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const toast = useToast();

  async function downloadPdf() {
    if (!po) return;
    setDownloading(true);
    try {
      const filename = await djangoAdmin.purchaseOrders.downloadInvoicePdf(
        po.id,
        po.number,
      );
      toast.success("Invoice downloaded", filename);
    } catch (err) {
      toast.error("Couldn't download invoice", (err as Error).message);
    } finally {
      setDownloading(false);
    }
  }

  const load = useCallback(
    () =>
      djangoAdmin.purchaseOrders.get(poId).then(
        (data) => {
          setLoadError(null);
          setPo(data);
        },
        (e) => setLoadError((e as Error).message),
      ),
    [poId],
  );

  useEffect(() => {
    load();
  }, [load]);

  const balance = po ? Number(po.balance_due) || 0 : 0;

  async function submit() {
    if (!po) return;
    const amt = Number(amount);
    if (!amount.trim() || Number.isNaN(amt) || amt === 0) {
      toast.error("Amount is required");
      return;
    }
    // Overpayment guard — mirrors the backend check. Positive amounts can't
    // exceed the remaining balance (0.01 wiggle room for cent rounding).
    if (amt > 0 && amt - balance > 0.01) {
      toast.error(
        "Exceeds balance",
        `Remaining is ${formatPrice(balance, po.currency)}.`,
      );
      return;
    }
    setSaving(true);
    try {
      await djangoAdmin.purchaseOrders.pay(po.id, {
        amount: amt,
        method,
        reference,
        paid_at: paidDate
          ? new Date(paidDate + "T12:00:00").toISOString()
          : null,
        note,
      });
      toast.success("Payment recorded", `${po.currency} ${amt} against ${po.number}`);
      setAmount("");
      setReference("");
      setNote("");
      await load();
      await onChanged();
    } catch (e) {
      const err = e as Error & { fields?: Record<string, string[]> };
      const msg =
        err.fields && Object.keys(err.fields).length
          ? Object.values(err.fields)[0]?.[0] ?? err.message
          : err.message;
      toast.error("Couldn't record payment", msg || "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] bg-navy/40 backdrop-blur-sm flex justify-end">
      <div className="bg-white w-full max-w-xl h-full overflow-hidden flex flex-col shadow-2xl shadow-navy/20 jmn-drawer-in">
        <header className="px-6 py-5 border-b border-[var(--jmn-line)] flex items-start justify-between shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.3em] uppercase text-gold mb-1">
              Invoice
            </p>
            <h2 className="font-display text-2xl text-navy">
              {po ? po.number : "Loading…"}
            </h2>
            {po && (
              <p className="text-xs text-ink/55 mt-1 truncate">
                {po.supplier_name} · {po.warehouse_name}
              </p>
            )}
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

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {loadError && (
            <div className="px-4 py-3 rounded-md bg-rose-50 ring-1 ring-rose-200 text-rose-700 text-sm">
              {loadError}
            </div>
          )}

          {!po && !loadError && (
            <div className="grid place-items-center py-12">
              <Loader2 size={20} className="text-navy/60 animate-spin" />
            </div>
          )}

          {po && (
            <>
              {/* Financials at a glance */}
              <div className="grid grid-cols-3 gap-2">
                <MiniStat
                  label="Total"
                  value={formatPrice(Number(po.total) || 0, po.currency)}
                />
                <MiniStat
                  label="Paid"
                  value={formatPrice(Number(po.amount_paid) || 0, po.currency)}
                  tone="emerald"
                />
                <MiniStat
                  label="Balance"
                  value={formatPrice(balance, po.currency)}
                  tone={
                    balance <= 0
                      ? "emerald"
                      : po.is_overdue
                      ? "rose"
                      : "amber"
                  }
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap text-[11px] text-ink/65">
                <PaymentBadge
                  status={po.payment_status}
                  overdue={po.is_overdue}
                />
                <span>·</span>
                <span>Status: {po.status}</span>
                <span>·</span>
                <span>Terms: Net {po.payment_terms_days}</span>
                {po.supplier_reference && (
                  <>
                    <span>·</span>
                    <span>Supplier ref: {po.supplier_reference}</span>
                  </>
                )}
              </div>

              {/* Payment ledger */}
              <section>
                <h3 className="text-[10px] tracking-[0.3em] uppercase text-gold mb-2">
                  Payments ({po.payments?.length ?? 0})
                </h3>
                {!po.payments || po.payments.length === 0 ? (
                  <p className="text-sm text-ink/55">
                    No payments recorded yet.
                  </p>
                ) : (
                  <ul className="border border-[var(--jmn-line)] rounded-md divide-y divide-[var(--jmn-line)]">
                    {po.payments.map((p) => (
                      <PaymentRow key={p.id} payment={p} />
                    ))}
                  </ul>
                )}
              </section>

              {/* Record payment */}
              {po.payment_status !== "paid" && (
                <section className="border border-amber-200 bg-amber-50/50 rounded-lg p-4 space-y-3">
                  <header className="flex items-center justify-between">
                    <h3 className="text-[10px] tracking-[0.3em] uppercase text-amber-800">
                      Record payment
                    </h3>
                    <button
                      type="button"
                      onClick={() => setAmount(balance.toFixed(2))}
                      className="text-[11px] tracking-[0.18em] uppercase text-navy hover:underline"
                    >
                      Pay balance
                    </button>
                  </header>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label={`Amount (${po.currency})`}>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={balance.toFixed(2)}
                        className="invoice-input tabular"
                      />
                    </Field>
                    <Field label="Method">
                      <select
                        value={method}
                        onChange={(e) =>
                          setMethod(e.target.value as PurchasePaymentMethod)
                        }
                        className="invoice-input"
                      >
                        {(
                          Object.keys(METHOD_LABEL) as PurchasePaymentMethod[]
                        ).map((m) => (
                          <option key={m} value={m}>
                            {METHOD_LABEL[m]}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Reference">
                      <input
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="Txn / cheque #"
                        className="invoice-input"
                      />
                    </Field>
                    <Field label="Paid on">
                      <input
                        type="date"
                        value={paidDate}
                        onChange={(e) => setPaidDate(e.target.value)}
                        className="invoice-input tabular"
                      />
                    </Field>
                  </div>
                  <Field label="Note">
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Optional"
                      className="invoice-input"
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={saving}
                    className="w-full h-10 rounded-md bg-amber-500 text-white font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    Record payment
                  </button>
                </section>
              )}
            </>
          )}
        </div>

        <footer className="px-6 py-4 border-t border-[var(--jmn-line)] flex justify-between items-center gap-2 shrink-0 bg-[#FAFAFA]">
          {po && (
            <Link
              href={`/admin/purchase-orders/${po.id}`}
              className="text-[11px] tracking-[0.18em] uppercase text-navy hover:underline"
            >
              Open full PO →
            </Link>
          )}
          <div className="flex items-center gap-2">
            {po && (
              <button
                type="button"
                onClick={downloadPdf}
                disabled={downloading}
                className="h-9 px-3 rounded-md border border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-navy hover:bg-white transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Download size={13} />
                )}
                Download PDF
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-md border border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-ink/65 hover:text-navy hover:border-navy/30 transition-colors"
            >
              Close
            </button>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        .invoice-input {
          width: 100%;
          height: 36px;
          padding: 0 10px;
          border: 1px solid var(--jmn-line);
          border-radius: 6px;
          background: white;
          font-size: 14px;
          color: var(--jmn-ink, #0a0a0a);
        }
        .invoice-input:focus {
          outline: none;
          border-color: var(--jmn-navy, #0e1a3a);
          box-shadow: 0 0 0 3px rgba(14, 26, 58, 0.08);
        }
      `}</style>
    </div>
  );
}

function PaymentRow({ payment }: { payment: PurchasePaymentShape }) {
  const amt = Number(payment.amount) || 0;
  return (
    <li className="px-3 py-2.5 flex items-center gap-3">
      <div
        className={cn(
          "h-8 w-8 grid place-items-center rounded text-[10px] tracking-[0.1em] uppercase shrink-0",
          amt >= 0
            ? "bg-emerald-100 text-emerald-800"
            : "bg-rose-100 text-rose-800",
        )}
      >
        {METHOD_LABEL[payment.method].slice(0, 3)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-navy tabular">
          {formatPrice(Math.abs(amt), payment.currency)}{" "}
          {amt < 0 && <span className="text-rose-700">(adjustment)</span>}
        </p>
        <p className="text-[11px] text-ink/55 truncate">
          {payment.reference && <>Ref {payment.reference} · </>}
          {formatDate(payment.paid_at)}
          {payment.note && <> · {payment.note}</>}
        </p>
      </div>
    </li>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "amber" | "rose";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "amber"
      ? "text-amber-700"
      : tone === "rose"
      ? "text-rose-700"
      : "text-navy";
  return (
    <div className="border border-[var(--jmn-line)] rounded-md px-3 py-2.5 bg-white">
      <p className="text-[10px] tracking-[0.2em] uppercase text-ink/55">
        {label}
      </p>
      <p className={cn("font-display text-lg tabular mt-0.5", toneClass)}>
        {value}
      </p>
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
