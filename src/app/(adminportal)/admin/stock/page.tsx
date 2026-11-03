"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, RefreshCw, Save } from "lucide-react";
import { djangoAdmin, type PaginatedResponse } from "@/lib/django-admin";
import { useToast } from "@/context/FeedbackContext";
import PageHeader from "@/components/admin/PageHeader";
import DataTable, { type Column } from "@/components/admin/DataTable";

interface StockLevel {
  id: string;
  product: string;
  product_name: string;
  color: string;
  size: string;
  warehouse: string;
  warehouse_code: string;
  quantity: number;
  reserved: number;
  available: number;
  low_stock_threshold: number;
  updated_at: string;
}

export default function AdminStock() {
  const [rows, setRows] = useState<StockLevel[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<StockLevel | null>(null);
  const toast = useToast();

  const load = async () => {
    setError(null);
    try {
      const data = await djangoAdmin.stockLevels.list();
      const items =
        (data as PaginatedResponse<StockLevel>).results ??
        (data as unknown as StockLevel[]);
      setRows(items);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const columns: Column<StockLevel>[] = [
    {
      key: "product",
      header: "Product",
      sortable: true,
      accessor: (s) => s.product_name,
      render: (s) => (
        <div className="min-w-0">
          <p className="font-medium text-navy truncate">{s.product_name}</p>
          <p className="text-[11px] text-ink/45 tabular">
            {s.color} · {s.size}
          </p>
        </div>
      ),
    },
    {
      key: "warehouse",
      header: "Warehouse",
      sortable: true,
      accessor: (s) => s.warehouse_code,
      render: (s) => (
        <span className="text-[11px] tracking-[0.18em] uppercase text-ink/70">
          {s.warehouse_code}
        </span>
      ),
    },
    {
      key: "quantity",
      header: "On hand",
      sortable: true,
      align: "right",
      accessor: (s) => s.quantity,
      render: (s) => (
        <span className="tabular text-sm text-navy">{s.quantity}</span>
      ),
    },
    {
      key: "reserved",
      header: "Reserved",
      sortable: true,
      align: "right",
      accessor: (s) => s.reserved,
      render: (s) => (
        <span className="tabular text-sm text-ink/65">{s.reserved}</span>
      ),
    },
    {
      key: "available",
      header: "Available",
      sortable: true,
      align: "right",
      accessor: (s) => s.available,
      render: (s) => {
        const tone =
          s.available <= 0
            ? "text-rose-700"
            : s.available <= s.low_stock_threshold
            ? "text-amber-700"
            : "text-emerald-700";
        return <span className={`tabular text-sm font-medium ${tone}`}>{s.available}</span>;
      },
    },
    {
      key: "threshold",
      header: "Low at",
      sortable: true,
      align: "right",
      accessor: (s) => s.low_stock_threshold,
      render: (s) => (
        <span className="tabular text-sm text-ink/55">{s.low_stock_threshold}</span>
      ),
    },
  ];

  if (error && !rows) {
    return (
      <div className="rounded-md bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (!rows) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 size={22} className="text-navy/60 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventory"
        title="Stock levels"
        description="On-hand quantity across every warehouse, color, and size. Click a row to adjust."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                try {
                  const file = await djangoAdmin.stockLevels.exportCsv();
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

      <DataTable<StockLevel>
        rows={rows}
        columns={columns}
        rowKey={(s) => s.id}
        searchPlaceholder="Search product, color, size, warehouse…"
        searchAccessor={(s) => `${s.product_name} ${s.color} ${s.size} ${s.warehouse_code}`}
        pageSize={20}
        emptyTitle="No stock records yet."
        onRowClick={setEditing}
      />

      {editing && (
        <StockEditDrawer
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            await load();
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function StockEditDrawer({
  row,
  onClose,
  onSaved,
}: {
  row: StockLevel;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [quantity, setQuantity] = useState(String(row.quantity));
  const [threshold, setThreshold] = useState(String(row.low_stock_threshold));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function save() {
    setError(null);
    // Client-side guard with toast — saves the user a server round-trip when
    // they cleared the quantity to "" instead of typing a real number.
    if (quantity.trim() === "" || Number.isNaN(Number(quantity))) {
      const msg = "Quantity must be a number";
      setError(msg);
      toast.error(msg);
      return;
    }
    setSaving(true);
    try {
      await djangoAdmin.stockLevels.update(row.id, {
        quantity: Number(quantity),
        low_stock_threshold: Number(threshold),
      });
      toast.success("Stock updated");
      await onSaved();
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      toast.error("Couldn't update stock", msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      // Backdrop click does NOT close — only the X / Cancel buttons.
      className="fixed inset-0 z-[80] bg-navy/40 backdrop-blur-sm flex justify-end"
    >
      <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl shadow-navy/20 jmn-drawer-in">
        <header className="px-6 py-5 border-b border-[var(--jmn-line)]">
          <p className="text-[10px] tracking-[0.3em] uppercase text-gold mb-1">
            Adjust stock
          </p>
          <h2 className="font-display text-2xl text-navy">{row.product_name}</h2>
          <p className="text-xs text-ink/55 mt-1">
            {row.color} · {row.size} · {row.warehouse_code}
          </p>
        </header>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="On hand" value={String(row.quantity)} />
            <Stat label="Reserved" value={String(row.reserved)} />
            <Stat label="Available" value={String(row.available)} />
          </div>

          <label className="block">
            <span className="block text-[11px] tracking-[0.2em] uppercase text-ink/55 mb-1.5">
              New quantity
            </span>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-white border border-[var(--jmn-line)] rounded-md px-3 h-10 text-sm text-navy focus:border-navy/40 outline-none"
            />
          </label>

          <label className="block">
            <span className="block text-[11px] tracking-[0.2em] uppercase text-ink/55 mb-1.5">
              Low-stock threshold
            </span>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="w-full bg-white border border-[var(--jmn-line)] rounded-md px-3 h-10 text-sm text-navy focus:border-navy/40 outline-none"
            />
          </label>

          {error && <p className="text-sm text-rose-700">{error}</p>}
        </div>

        <footer className="px-6 py-4 border-t border-[var(--jmn-line)] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-md border border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-ink/65 hover:text-navy hover:border-navy/30 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="h-9 px-4 rounded-md bg-navy text-cream text-[12px] tracking-[0.1em] uppercase hover:bg-navy-deep disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save
          </button>
        </footer>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#FAFAFA] border border-[var(--jmn-line)] rounded-md px-3 py-2.5">
      <p className="text-[10px] tracking-[0.2em] uppercase text-ink/50">{label}</p>
      <p className="font-display text-xl text-navy tabular mt-0.5">{value}</p>
    </div>
  );
}
