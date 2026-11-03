"use client";

/**
 * URL Redirect manager.
 *
 * One table, inline-create at the top, edit-in-place via a side drawer.
 * Each row shows the hit count + last-seen timestamp so old rules that
 * crawlers stopped requesting can be pruned. Server normalises from_path,
 * so adding "/Mens-Shirts/" stores "/mens-shirts" and lights up for any
 * case / trailing-slash variant.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  djangoAdmin,
  type PaginatedResponse,
  type RedirectInput,
  type RedirectShape,
} from "@/lib/django-admin";
import { useConfirm, useToast } from "@/context/FeedbackContext";
import PageHeader from "@/components/admin/PageHeader";
import { cn, formatDate } from "@/lib/utils";

type FilterTab = "all" | "active" | "disabled";

const TAB_LABEL: Record<FilterTab, string> = {
  all: "All",
  active: "Active",
  disabled: "Disabled",
};

export default function RedirectsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<RedirectShape[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<RedirectShape | null>(null);

  // Inline-create form lives in its own state so it doesn't clobber the list.
  const [creatingFrom, setCreatingFrom] = useState("");
  const [creatingTo, setCreatingTo] = useState("");
  const [creatingStatus, setCreatingStatus] = useState<301 | 302>(301);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await djangoAdmin.redirects.list({ page_size: 200 });
      setRows(
        (data as PaginatedResponse<RedirectShape>).results ??
          (data as unknown as RedirectShape[]),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = rows ?? [];
    if (tab === "active") list = list.filter((r) => r.is_active);
    else if (tab === "disabled") list = list.filter((r) => !r.is_active);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.from_path.toLowerCase().includes(q) ||
          r.to_path.toLowerCase().includes(q) ||
          r.notes.toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, tab, search]);

  const counts = useMemo(() => {
    const list = rows ?? [];
    return {
      all: list.length,
      active: list.filter((r) => r.is_active).length,
      disabled: list.filter((r) => !r.is_active).length,
    };
  }, [rows]);

  async function submitCreate() {
    if (!creatingFrom.trim() || !creatingTo.trim()) {
      toast.error("Both from and to paths are required");
      return;
    }
    setCreating(true);
    try {
      const payload: RedirectInput = {
        from_path: creatingFrom.trim(),
        to_path: creatingTo.trim(),
        status_code: creatingStatus,
      };
      const r = await djangoAdmin.redirects.create(payload);
      toast.success("Redirect added", `${r.from_path} → ${r.to_path}`);
      setCreatingFrom("");
      setCreatingTo("");
      setCreatingStatus(301);
      await load();
    } catch (e) {
      const err = e as Error & { fields?: Record<string, string[]> };
      const msg =
        err.fields && Object.keys(err.fields).length
          ? Object.values(err.fields)[0]?.[0] ?? err.message
          : err.message;
      toast.error("Couldn't add redirect", msg);
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(r: RedirectShape) {
    try {
      const updated = await djangoAdmin.redirects.update(r.id, {
        is_active: !r.is_active,
      });
      setRows((prev) =>
        (prev ?? []).map((row) => (row.id === r.id ? updated : row)),
      );
    } catch (e) {
      toast.error("Couldn't update", (e as Error).message);
    }
  }

  async function destroy(r: RedirectShape) {
    const ok = await confirm({
      title: `Delete redirect for ${r.from_path}?`,
      description:
        "Visitors hitting this URL will get the original 404 again. Disable it instead if you might want to restore it.",
      tone: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await djangoAdmin.redirects.delete(r.id);
      toast.success("Redirect deleted");
      await load();
    } catch (e) {
      toast.error("Couldn't delete", (e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Marketing · SEO"
        title="Redirects"
        description="Send old URLs to new ones with a 301 or 302. Stored matches normalise casing and trailing slashes, so one rule covers all variants."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/seo"
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm border border-[var(--jmn-line)] hover:bg-[#FAFAFA]"
            >
              <ArrowRight size={14} />
              SEO audit
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

      {/* Inline create */}
      <section className="bg-white border border-[var(--jmn-line)] rounded-lg p-4">
        <h3 className="text-[10px] tracking-[0.3em] uppercase text-gold mb-3">
          New redirect
        </h3>
        <div className="grid sm:grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
          <Field label="From path" hint="Old URL — paths only, no domain.">
            <input
              value={creatingFrom}
              onChange={(e) => setCreatingFrom(e.target.value)}
              placeholder="/old-product-slug"
              className="r-input tabular"
            />
          </Field>
          <Field label="To path / URL" hint="Can be a path or full URL.">
            <input
              value={creatingTo}
              onChange={(e) => setCreatingTo(e.target.value)}
              placeholder="/products/new-slug"
              className="r-input tabular"
            />
          </Field>
          <Field label="Status">
            <select
              value={creatingStatus}
              onChange={(e) =>
                setCreatingStatus(Number(e.target.value) as 301 | 302)
              }
              className="r-input"
            >
              <option value={301}>301 — Permanent</option>
              <option value={302}>302 — Temporary</option>
            </select>
          </Field>
          <button
            type="button"
            onClick={submitCreate}
            disabled={creating}
            className="h-10 px-4 rounded-md bg-navy text-cream text-[11px] tracking-[0.18em] uppercase hover:opacity-90 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Add
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-md bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <section className="bg-white border border-[var(--jmn-line)] rounded-lg p-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-[#FAFAFA] rounded-md p-1">
          {(Object.keys(TAB_LABEL) as FilterTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-3 h-8 rounded text-[11px] tracking-[0.18em] uppercase transition-colors flex items-center gap-1.5",
                tab === t
                  ? "bg-white text-navy shadow-sm"
                  : "text-ink/55 hover:text-navy",
              )}
            >
              {TAB_LABEL[t]}
              <span className="text-[10px] text-ink/40 tabular">
                {counts[t]}
              </span>
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[180px] flex items-center gap-2 h-9 px-3 bg-[#FAFAFA] rounded-md">
          <Search size={14} className="text-ink/45" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by path or note…"
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
      </section>

      {/* List */}
      {!rows ? (
        <div className="grid place-items-center py-20">
          <Loader2 size={22} className="text-navy/60 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[var(--jmn-line)] rounded-lg px-6 py-16 text-center">
          <p className="text-sm text-ink/55">
            {rows.length === 0
              ? "No redirects yet. Add one above."
              : "No redirects match this filter."}
          </p>
        </div>
      ) : (
        <section className="bg-white border border-[var(--jmn-line)] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAFA] text-[10px] tracking-[0.18em] uppercase text-ink/55">
                <tr>
                  <th className="text-left font-medium pl-5 pr-2 py-3 w-[60px]">
                    Status
                  </th>
                  <th className="text-left font-medium px-2 py-3">From</th>
                  <th className="text-left font-medium px-2 py-3">→ To</th>
                  <th className="text-right font-medium px-2 py-3 w-[80px]">
                    Hits
                  </th>
                  <th className="text-left font-medium px-2 py-3 w-[140px]">
                    Last hit
                  </th>
                  <th className="px-2 py-3 w-[60px]" />
                  <th className="pl-2 pr-5 py-3 w-[80px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-[var(--jmn-line)] hover:bg-[#FAFAFA] transition-colors"
                  >
                    <td className="pl-5 pr-2 py-3">
                      <span
                        className={cn(
                          "inline-flex px-2 py-0.5 rounded-full text-[10px] tracking-[0.18em] uppercase tabular",
                          r.status_code === 301
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800",
                        )}
                      >
                        {r.status_code}
                      </span>
                    </td>
                    <td className="px-2 py-3 tabular text-navy break-all max-w-[260px]">
                      {r.from_path}
                    </td>
                    <td className="px-2 py-3 tabular text-ink/80 break-all max-w-[300px]">
                      {r.to_path}
                    </td>
                    <td className="px-2 py-3 text-right tabular text-ink/65">
                      {r.hit_count}
                    </td>
                    <td className="px-2 py-3 text-[11px] text-ink/55 tabular">
                      {r.last_hit_at ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} />
                          {formatDate(r.last_hit_at)}
                        </span>
                      ) : (
                        <span className="text-ink/35">never</span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleActive(r)}
                        title={r.is_active ? "Disable" : "Enable"}
                        className={cn(
                          "h-7 px-2 rounded text-[10px] tracking-[0.18em] uppercase transition-colors",
                          r.is_active
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-ink/10 text-ink/55 hover:bg-ink/15",
                        )}
                      >
                        {r.is_active ? "ON" : "OFF"}
                      </button>
                    </td>
                    <td className="pl-2 pr-5 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditing(r)}
                          className="h-7 w-7 grid place-items-center rounded text-ink/55 hover:text-navy hover:bg-navy/5 transition-colors"
                          aria-label="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => destroy(r)}
                          className="h-7 w-7 grid place-items-center rounded text-rose-700 hover:bg-rose-50 transition-colors"
                          aria-label="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {editing && (
        <EditDrawer
          rule={editing}
          onClose={() => setEditing(null)}
          onSaved={async (updated) => {
            setEditing(null);
            setRows((prev) =>
              (prev ?? []).map((r) => (r.id === updated.id ? updated : r)),
            );
          }}
        />
      )}

      <style jsx global>{`
        .r-input {
          width: 100%;
          height: 40px;
          padding: 0 12px;
          border: 1px solid var(--jmn-line);
          border-radius: 6px;
          background: white;
          font-size: 14px;
          color: var(--jmn-ink, #0a0a0a);
        }
        .r-input:focus {
          outline: none;
          border-color: var(--jmn-navy, #0e1a3a);
          box-shadow: 0 0 0 3px rgba(14, 26, 58, 0.08);
        }
        textarea.r-input {
          height: auto;
          padding: 8px 12px;
        }
      `}</style>
    </div>
  );
}

function EditDrawer({
  rule,
  onClose,
  onSaved,
}: {
  rule: RedirectShape;
  onClose: () => void;
  onSaved: (updated: RedirectShape) => Promise<void>;
}) {
  const toast = useToast();
  const [fromPath, setFromPath] = useState(rule.from_path);
  const [toPath, setToPath] = useState(rule.to_path);
  const [statusCode, setStatusCode] = useState<301 | 302>(rule.status_code);
  const [isActive, setIsActive] = useState(rule.is_active);
  const [notes, setNotes] = useState(rule.notes);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const updated = await djangoAdmin.redirects.update(rule.id, {
        from_path: fromPath.trim(),
        to_path: toPath.trim(),
        status_code: statusCode,
        is_active: isActive,
        notes,
      });
      toast.success("Redirect updated");
      await onSaved(updated);
    } catch (e) {
      const err = e as Error & { fields?: Record<string, string[]> };
      const msg =
        err.fields && Object.keys(err.fields).length
          ? Object.values(err.fields)[0]?.[0] ?? err.message
          : err.message;
      toast.error("Couldn't update redirect", msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] bg-navy/40 backdrop-blur-sm flex justify-end"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white w-full max-w-lg h-full overflow-hidden flex flex-col shadow-2xl shadow-navy/20 jmn-drawer-in">
        <header className="px-6 py-5 border-b border-[var(--jmn-line)] flex items-start justify-between shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.3em] uppercase text-gold mb-1">
              Edit redirect
            </p>
            <h2 className="font-display text-xl text-navy truncate tabular">
              {rule.from_path}
            </h2>
            <p className="text-[11px] text-ink/55 mt-1 tabular truncate">
              {rule.hit_count} hits
              {rule.last_hit_at && <> · last seen {formatDate(rule.last_hit_at)}</>}
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

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <Field label="From path">
            <input
              value={fromPath}
              onChange={(e) => setFromPath(e.target.value)}
              className="r-input tabular"
            />
          </Field>
          <Field label="To path / URL">
            <input
              value={toPath}
              onChange={(e) => setToPath(e.target.value)}
              className="r-input tabular"
            />
            {toPath && (
              <a
                href={toPath}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 text-[11px] tracking-[0.18em] uppercase text-navy hover:underline inline-flex items-center gap-1"
              >
                <ExternalLink size={11} />
                Preview destination
              </a>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Status">
              <select
                value={statusCode}
                onChange={(e) =>
                  setStatusCode(Number(e.target.value) as 301 | 302)
                }
                className="r-input"
              >
                <option value={301}>301 — Permanent</option>
                <option value={302}>302 — Temporary</option>
              </select>
            </Field>
            <Field label="Active">
              <label className="flex items-center gap-2 h-10 px-3 rounded-md border border-[var(--jmn-line)] cursor-pointer bg-white">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 accent-navy"
                />
                <span className="text-sm text-navy">
                  {isActive ? "Enabled" : "Disabled"}
                </span>
              </label>
            </Field>
          </div>
          <Field label="Notes" hint="Why this redirect exists. Visible to admins only.">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="r-input"
            />
          </Field>
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
            disabled={saving}
            className="h-9 px-4 rounded-md bg-navy text-cream text-[11px] tracking-[0.18em] uppercase hover:opacity-90 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Save
          </button>
        </footer>
      </div>
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
