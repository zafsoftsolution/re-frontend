"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Download, Loader2, Plus, RefreshCw } from "lucide-react";
import {
  djangoAdmin,
  type PurchaseOrderListShape,
  type PurchaseOrderStatus,
} from "@/lib/django-admin";
import PageHeader from "@/components/admin/PageHeader";
import DataTable, { type Column } from "@/components/admin/DataTable";
import { useToast } from "@/context/FeedbackContext";
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

const TABS: Array<{ key: string; label: string; match: PurchaseOrderStatus[] | null }> = [
  { key: "all", label: "All", match: null },
  { key: "draft", label: "Drafts", match: ["draft", "awaiting_approval"] },
  { key: "open", label: "Open", match: ["approved", "ordered", "partial_received"] },
  { key: "completed", label: "Completed", match: ["received", "closed"] },
  { key: "cancelled", label: "Cancelled", match: ["cancelled"] },
];

const columns: Column<PurchaseOrderListShape>[] = [
  {
    key: "number",
    header: "PO #",
    sortable: true,
    accessor: (p) => p.number,
    render: (p) => (
      <Link
        href={`/admin/purchase-orders/${p.id}`}
        className="font-medium text-navy hover:underline tabular"
      >
        {p.number}
      </Link>
    ),
  },
  {
    key: "supplier",
    header: "Supplier",
    accessor: (p) => p.supplier_name,
    render: (p) => (
      <div className="min-w-0">
        <p className="text-sm text-ink/85 truncate">{p.supplier_name}</p>
        <p className="text-[11px] text-ink/45 tabular">{p.supplier_code}</p>
      </div>
    ),
  },
  {
    key: "warehouse",
    header: "Receive at",
    accessor: (p) => p.warehouse_name,
    render: (p) => (
      <span className="text-sm text-ink/70 truncate">{p.warehouse_name}</span>
    ),
  },
  {
    key: "items",
    header: "Lines",
    accessor: (p) => p.item_count,
    render: (p) => (
      <span className="text-sm text-ink/70 tabular">{p.item_count}</span>
    ),
    align: "right",
  },
  {
    key: "total",
    header: "Total",
    sortable: true,
    accessor: (p) => Number(p.total),
    render: (p) => (
      <span className="font-medium text-navy tabular">
        {p.currency} {Number(p.total).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
    ),
    align: "right",
  },
  {
    key: "expected",
    header: "Expected",
    accessor: (p) => p.expected_delivery_date ?? "",
    render: (p) =>
      p.expected_delivery_date ? (
        <span className="text-sm text-ink/70 tabular">
          {new Date(p.expected_delivery_date).toLocaleDateString()}
        </span>
      ) : (
        <span className="text-ink/30">—</span>
      ),
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    accessor: (p) => p.status,
    render: (p) => <POStatusPill status={p.status} />,
  },
  {
    key: "created",
    header: "Created",
    sortable: true,
    accessor: (p) => p.created_at,
    render: (p) => (
      <span className="text-[11px] text-ink/55 tabular">
        {new Date(p.created_at).toLocaleDateString()}
      </span>
    ),
  },
];

export default function AdminPurchaseOrders() {
  const [rows, setRows] = useState<PurchaseOrderListShape[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const toast = useToast();

  // State is only set in promise callbacks so the mount effect can call
  // this without a synchronous setState (react-hooks/set-state-in-effect).
  // `refreshing` starts true for the initial fetch.
  function fetchRows() {
    return djangoAdmin.purchaseOrders
      .list({ page_size: 100 })
      .then(
        (data) => {
          setError(null);
          setRows(data.results);
        },
        (e) => setError((e as Error).message),
      )
      .finally(() => setRefreshing(false));
  }

  function load() {
    setRefreshing(true);
    return fetchRows();
  }

  useEffect(() => {
    fetchRows();
  }, []);

  const tab = TABS.find((t) => t.key === activeTab) ?? TABS[0];
  const filtered =
    rows && tab.match ? rows.filter((p) => tab.match!.includes(p.status)) : rows ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Purchasing"
        title="Purchase Orders"
        description="Buy stock from suppliers. Posting a goods receipt against a PO updates stock in real time."
        actions={
          <>
            <button
              onClick={async () => {
                try {
                  const file = await djangoAdmin.purchaseOrders.exportCsv();
                  toast.success("Exported", file);
                } catch (e) {
                  toast.error("Couldn't export", (e as Error).message);
                }
              }}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm border border-[var(--jmn-line)] hover:bg-[#FAFAFA]"
            >
              <Download size={14} />
              Export CSV
            </button>
            <button
              onClick={load}
              disabled={refreshing}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm border border-[var(--jmn-line)] hover:bg-[#FAFAFA] disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
            <Link
              href="/admin/purchase-orders/new"
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-navy text-cream text-sm hover:opacity-90"
            >
              <Plus size={14} />
              New purchase order
            </Link>
          </>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-md bg-rose-50 ring-1 ring-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "px-3 h-8 rounded-full text-[11px] tracking-[0.18em] uppercase ring-1",
              t.key === activeTab
                ? "bg-navy text-cream ring-navy"
                : "bg-white text-ink/65 ring-[var(--jmn-line)] hover:text-navy",
            )}
          >
            {t.label}
            {rows && t.match && (
              <span className="ml-2 tabular text-[10px] opacity-75">
                {rows.filter((p) => t.match!.includes(p.status)).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {rows === null ? (
        <div className="bg-white border border-[var(--jmn-line)] rounded-lg p-12 grid place-items-center text-ink/45">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : (
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(p) => p.id}
          searchPlaceholder="Search by PO number, supplier…"
          searchAccessor={(p) =>
            `${p.number} ${p.supplier_name} ${p.supplier_code} ${p.supplier_reference}`
          }
          pageSize={20}
          emptyTitle="No purchase orders yet."
          emptyDescription="Create one to start buying stock from a supplier."
        />
      )}
    </>
  );
}
