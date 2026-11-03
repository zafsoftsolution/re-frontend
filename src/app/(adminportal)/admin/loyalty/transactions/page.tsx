"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  djangoAdmin,
  type LoyaltyTransactionShape,
} from "@/lib/django-admin";
import PageHeader from "@/components/admin/PageHeader";
import { useToast } from "@/context/FeedbackContext";
import { cn } from "@/lib/utils";

const REASON_TONE: Record<string, string> = {
  order_award: "text-emerald-700",
  signup_bonus: "text-emerald-700",
  birthday_bonus: "text-emerald-700",
  referral_bonus: "text-emerald-700",
  review_bonus: "text-emerald-700",
  manual_credit: "text-emerald-700",
  redemption: "text-rose-700",
  manual_debit: "text-rose-700",
  order_refund_clawback: "text-rose-700",
  expiry: "text-rose-700",
  adjustment: "text-blue-700",
};

const REASON_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "order_award", label: "Order earnings" },
  { value: "redemption", label: "Redemptions" },
  { value: "manual_credit", label: "Manual credits" },
  { value: "manual_debit", label: "Manual debits" },
  { value: "order_refund_clawback", label: "Refund clawbacks" },
  { value: "adjustment", label: "Adjustments" },
];

const PAGE_SIZE = 25;

export default function AdminLoyaltyTransactions() {
  const [rows, setRows] = useState<LoyaltyTransactionShape[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdjust, setShowAdjust] = useState(false);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total],
  );

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await djangoAdmin.loyalty.transactions.list({
        search: search || undefined,
        reason: reason || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setRows(res.results);
      setTotal(res.count);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, reason]);

  return (
    <>
      <PageHeader
        eyebrow="Loyalty"
        title="Activity ledger"
        description="Every points credit and debit, oldest journal-style. Read-only — corrections go through a balancing entry, never an edit."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={busy}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm border border-[var(--jmn-line)] hover:bg-[#FAFAFA] disabled:opacity-50"
            >
              <RefreshCw size={14} className={busy ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={() => setShowAdjust(true)}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-navy text-cream text-sm hover:opacity-90"
            >
              <Plus size={14} />
              Manual adjustment
            </button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-md bg-rose-50 ring-1 ring-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white border border-[var(--jmn-line)] rounded-lg overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-[var(--jmn-line)] flex flex-wrap items-center gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              load();
            }}
            className="flex-1 min-w-[220px] flex items-center gap-2 px-3 h-9 rounded-md bg-[#F4F5F7]"
          >
            <Search size={14} className="text-ink/45" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer email, reference…"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink/40"
            />
          </form>

          <select
            value={reason}
            onChange={(e) => {
              setPage(1);
              setReason(e.target.value);
            }}
            className="h-9 px-3 rounded-md border border-[var(--jmn-line)] bg-white text-sm"
          >
            {REASON_FILTERS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        {rows === null ? (
          <div className="grid place-items-center py-16">
            <Loader2 size={20} className="animate-spin text-navy/60" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-ink/55">
            No transactions match your filters.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#FAFAFA] text-[10px] tracking-[0.18em] uppercase text-ink/55">
                  <tr>
                    <th className="text-left font-medium px-4 py-2.5">When</th>
                    <th className="text-left font-medium px-4 py-2.5">Customer</th>
                    <th className="text-left font-medium px-4 py-2.5">Reason</th>
                    <th className="text-right font-medium px-4 py-2.5">Points</th>
                    <th className="text-right font-medium px-4 py-2.5">Balance</th>
                    <th className="text-left font-medium px-4 py-2.5">Reference</th>
                    <th className="text-left font-medium px-4 py-2.5">Note / Actor</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => {
                    const positive = t.points >= 0;
                    return (
                      <tr
                        key={t.id}
                        className="border-t border-[var(--jmn-line)] hover:bg-[#FAFAFA] transition-colors"
                      >
                        <td className="px-4 py-3 text-[11px] text-ink/55 tabular whitespace-nowrap">
                          {new Date(t.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-navy">
                          {t.user_email}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "text-[10px] tracking-[0.18em] uppercase",
                              REASON_TONE[t.reason] ?? "text-ink/65",
                            )}
                          >
                            {t.reason_label}
                          </span>
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3 text-right tabular font-medium",
                            positive ? "text-emerald-700" : "text-rose-700",
                          )}
                        >
                          {positive ? "+" : ""}
                          {t.points.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right tabular text-ink/65">
                          {t.balance_after.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-ink/55 tabular truncate max-w-[180px]">
                          {t.reference || "—"}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-ink/55 truncate max-w-[260px]">
                          {t.note || "—"}
                          {t.actor_email && (
                            <span className="block text-[10px] text-ink/40 mt-0.5">
                              by {t.actor_email}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-[var(--jmn-line)] flex items-center justify-between text-xs text-ink/55">
              <span className="tabular">
                Showing{" "}
                <span className="text-navy">
                  {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, total)}
                </span>{" "}
                of <span className="text-navy">{total}</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-8 w-8 grid place-items-center rounded-md hover:bg-[#F4F5F7] disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-3 tabular text-navy">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-8 w-8 grid place-items-center rounded-md hover:bg-[#F4F5F7] disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showAdjust && (
        <ManualAdjustDrawer
          onClose={() => setShowAdjust(false)}
          onDone={() => {
            setShowAdjust(false);
            setPage(1);
            load();
          }}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Manual adjustment drawer
// ─────────────────────────────────────────────────────────────────────────────

function ManualAdjustDrawer({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [userId, setUserId] = useState("");
  const [points, setPoints] = useState("0");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const toast = useToast();

  async function save() {
    setErr(null);
    // Client-side validation with toast — saves a server round-trip.
    const missing: string[] = [];
    if (!userId.trim()) missing.push("Customer ID");
    if (Number.isNaN(Number(points)) || Number(points) === 0) {
      missing.push("Points (signed, non-zero)");
    }
    if (missing.length > 0) {
      const msg =
        missing.length === 1
          ? `${missing[0]} is required`
          : `Please fill in: ${missing.join(", ")}`;
      setErr(msg);
      toast.error(msg);
      return;
    }
    setBusy(true);
    try {
      await djangoAdmin.loyalty.adjust({
        user: userId.trim(),
        points: Number(points),
        note,
      });
      toast.success("Points adjusted");
      onDone();
    } catch (e) {
      const msg = (e as Error).message;
      setErr(msg);
      toast.error("Couldn't adjust points", msg);
    } finally {
      setBusy(false);
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
            Loyalty
          </p>
          <h2 className="font-display text-2xl text-navy">Manual adjustment</h2>
          <p className="text-xs text-ink/55 mt-1 leading-relaxed">
            Use sparingly — every adjustment is journaled with your account as the actor.
            Positive = credit, negative = debit.
          </p>
        </header>

        <div className="px-6 py-5 space-y-4">
          <Field label="Customer ID (UUID)">
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g. baf0feca-2e5f-4689-b712-…"
              className="adjust-input"
            />
            <p className="mt-1 text-[10px] text-ink/45">
              Find on the customer detail page.
            </p>
          </Field>
          <Field label="Points (signed)">
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="e.g. 250 or -100"
              className="adjust-input tabular"
            />
          </Field>
          <Field label="Note (visible in ledger)">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. Goodwill credit — order delayed"
              className="adjust-input"
            />
          </Field>

          {err && <p className="text-sm text-rose-700">{err}</p>}
        </div>

        <footer className="px-6 py-4 border-t border-[var(--jmn-line)] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-md border border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-ink/65 hover:text-navy"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={busy || !userId.trim() || Number(points) === 0}
            className="h-9 px-4 rounded-md bg-navy text-cream text-[11px] tracking-[0.18em] uppercase hover:opacity-90 disabled:opacity-40 inline-flex items-center gap-2"
          >
            {busy && <Loader2 size={13} className="animate-spin" />}
            Apply
          </button>
        </footer>

        <style jsx global>{`
          .adjust-input {
            width: 100%;
            height: 36px;
            padding: 0 12px;
            border: 1px solid var(--jmn-line);
            border-radius: 6px;
            background: white;
            font-size: 14px;
            color: var(--jmn-ink, #0a0a0a);
          }
          .adjust-input:focus {
            outline: none;
            border-color: var(--jmn-navy);
            box-shadow: 0 0 0 3px rgba(14, 26, 58, 0.08);
          }
          textarea.adjust-input {
            height: auto;
            padding-top: 8px;
            padding-bottom: 8px;
            resize: vertical;
          }
        `}</style>
      </div>
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
    <div>
      <label className="text-[10px] tracking-[0.18em] uppercase text-ink/55 mb-1 block">
        {label}
      </label>
      {children}
    </div>
  );
}
