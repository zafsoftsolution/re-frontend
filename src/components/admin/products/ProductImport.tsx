"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, XCircle } from "lucide-react";
import { djangoAdmin, DjangoApiError, type ProductImportResult } from "@/lib/django-admin";
import { useConfirm, useToast } from "@/context/FeedbackContext";
import PageHeader from "@/components/admin/PageHeader";
import { btn } from "@/components/admin/ui/AdminDialog";
import { formatBytes } from "@/lib/admin/quotes";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;
const COLUMNS: [string, string][] = [
  ["sku", "Required. Upsert key — existing SKU = update, new SKU = create."],
  ["name", "Required for new parts."],
  ["part_number", "OEM part number."],
  ["alt_part_numbers", "Separate with ;"],
  ["category", "Category slug. Required for new parts."],
  ["brand", "Parts-brand slug."],
  ["machine_models", "Model slugs separated by ; — replaces the part's list."],
  ["price", "Internal price. Required for new parts."],
  ["sales_mode", "inherit | quote_only | direct"],
  ["min_order_quantity", "Whole number ≥ 1"],
  ["lead_time_days", "Whole number"],
  ["status", "active | draft | archived"],
  ["description", "Plain text (English)."],
];

const ACTION_LABEL = { create: "Create", update: "Update", unchanged: "No change" } as const;

export default function ProductImport() {
  const toast = useToast();
  const confirm = useConfirm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ProductImportResult | null>(null);
  const [busy, setBusy] = useState<"dry" | "apply" | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Field-level errors from a rejected upload (e.g. {file: [...], dry_run: [...]}).
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [showUnchanged, setShowUnchanged] = useState(false);

  function pick(f: File | null) {
    setReport(null);
    setError(null);
    setFieldErrors({});
    if (!f) return setFile(null);
    if (!/\.(csv|xlsx)$/i.test(f.name)) {
      setFile(null);
      return setError("Choose a .csv or .xlsx file.");
    }
    if (f.size > MAX_BYTES) {
      setFile(null);
      return setError(`File is ${formatBytes(f.size)} — the limit is 5 MB.`);
    }
    setFile(f);
  }

  async function run(dryRun: boolean) {
    if (!file) return;
    if (!dryRun) {
      const ok = await confirm({
        title: "Import these parts?",
        description: `${report?.created ?? 0} new, ${report?.updated ?? 0} updated. The import is all-or-nothing.`,
        confirmLabel: "Import",
      });
      if (!ok) return;
    }
    setBusy(dryRun ? "dry" : "apply");
    setError(null);
    setFieldErrors({});
    try {
      const r = await djangoAdmin.products.importFile(file, dryRun);
      setReport(r);
      if (!dryRun && r.applied) {
        toast.success("Import complete", `${r.created} created · ${r.updated} updated`);
      } else if (!dryRun && !r.applied) {
        toast.error("Nothing imported", `${r.error_count} row(s) have errors.`);
      }
    } catch (e) {
      if (e instanceof DjangoApiError && Object.keys(e.fields).length) {
        setFieldErrors(e.fields);
        setError(typeof e.body.detail === "string" ? e.body.detail : "The file was rejected:");
      } else {
        setError((e as Error).message);
      }
    } finally {
      setBusy(null);
    }
  }

  const rows = report?.rows.filter((r) => showUnchanged || r.action !== "unchanged") ?? [];
  const canApply = !!report && report.dry_run && report.error_count === 0 && report.created + report.updated > 0;

  return (
    <div className="pb-16">
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-[13px] text-re-blue-text hover:underline mb-3">
        <ArrowLeft size={14} aria-hidden /> Products
      </Link>
      <PageHeader
        eyebrow="Catalogue"
        title="Import parts"
        description="Upload a CSV or Excel sheet to create or update parts by SKU. You'll see a dry-run report first — nothing is written until you confirm."
        actions={
          <>
            <button type="button" className={btn.secondary} onClick={() => djangoAdmin.products.downloadImportTemplate().catch((e: Error) => toast.error("Couldn't download", e.message))}>
              <Download size={14} aria-hidden /> Template (.csv)
            </button>
            <button type="button" className={btn.secondary} onClick={() => djangoAdmin.products.exportImportLayout().then((f) => toast.success("Exported", f), (e: Error) => toast.error("Couldn't export", e.message))}>
              <Download size={14} aria-hidden /> Export current parts
            </button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
        <div className="space-y-6 min-w-0">
          {/* Step 1 — file */}
          <section className="bg-white border border-[var(--jmn-line)] re-rule p-5">
            <h2 className="text-[15px] text-navy mb-3">1 · Choose a file</h2>
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pick(e.dataTransfer.files?.[0] ?? null);
              }}
              className="flex flex-col items-center justify-center gap-2 border border-dashed border-re-steel-400 bg-re-steel-50 px-4 py-8 text-center cursor-pointer hover:border-re-blue has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-re-blue"
            >
              <FileSpreadsheet size={24} className="text-ink/55" aria-hidden />
              {file ? (
                <span className="text-sm text-navy">
                  <strong>{file.name}</strong> <span className="text-ink/60 tabular">· {formatBytes(file.size)}</span>
                </span>
              ) : (
                <span className="text-sm text-navy">Drop a .csv / .xlsx here or <span className="text-re-blue-text underline">browse</span></span>
              )}
              <span className="text-[12px] text-ink/60">Max 5 MB · 5,000 rows · first row = column headers</span>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                data-testid="import-file"
                onChange={(e) => {
                  pick(e.target.files?.[0] ?? null);
                  // Reset so choosing the same (fixed) file again fires onChange.
                  e.target.value = "";
                }}
              />
            </label>
            {error && (
              <div role="alert" className="mt-3 text-sm text-rose-700" data-testid="import-error">
                <p>{error}</p>
                {Object.keys(fieldErrors).length > 0 && (
                  <ul className="mt-1 list-disc pl-5">
                    {Object.entries(fieldErrors).map(([f, msgs]) => (
                      <li key={f}>
                        {f !== "non_field_errors" && f !== "__all__" && <span className="part-no text-[12px] mr-1">{f}:</span>}
                        {msgs.join(" ")}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className={btn.primary} disabled={!file || !!busy} onClick={() => run(true)} data-testid="import-dry-run">
                {busy === "dry" ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} aria-hidden />}
                Check file (dry run)
              </button>
              {file && (
                <button type="button" className={btn.ghost} onClick={() => { pick(null); if (inputRef.current) inputRef.current.value = ""; }}>
                  Clear
                </button>
              )}
            </div>
          </section>

          {/* Step 2 — report */}
          {report && (
            <section className="bg-white border border-[var(--jmn-line)] re-rule" data-testid="import-report" aria-live="polite">
              <div className="p-5 border-b border-[var(--jmn-line)]">
                <h2 className="text-[15px] text-navy mb-3">
                  2 · {report.applied ? "Import finished" : report.dry_run ? "Dry-run report" : "Import refused"}
                </h2>
                <dl className="grid grid-cols-2 sm:grid-cols-5 border border-[var(--jmn-line)]">
                  <Stat k="Rows" v={report.total_rows} />
                  <Stat k={report.applied ? "Created" : "To create"} v={report.created} tone="ok" />
                  <Stat k={report.applied ? "Updated" : "To update"} v={report.updated} tone="ok" />
                  <Stat k="Unchanged" v={report.unchanged} />
                  <Stat k="Errors" v={report.error_count} tone={report.error_count ? "bad" : undefined} />
                </dl>
                {report.applied ? (
                  <p className="mt-3 inline-flex items-center gap-2 text-sm text-re-stock-in">
                    <CheckCircle2 size={16} aria-hidden /> Saved. <Link href="/admin/products" className="text-re-blue-text underline">View products</Link>
                  </p>
                ) : report.error_count > 0 ? (
                  <p className="mt-3 inline-flex items-center gap-2 text-sm text-rose-700">
                    <XCircle size={16} aria-hidden /> Fix the rows below and check the file again — an import with errors writes nothing.
                  </p>
                ) : canApply ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button type="button" className={btn.primary} disabled={!!busy} onClick={() => run(false)} data-testid="import-apply">
                      {busy === "apply" ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} aria-hidden />}
                      Import {report.created + report.updated} part{report.created + report.updated === 1 ? "" : "s"}
                    </button>
                    <span className="text-[12px] text-ink/60">All-or-nothing, in one transaction.</span>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-ink/65">Nothing to change — every row matches the catalogue.</p>
                )}
              </div>

              {report.errors.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="import-errors">
                    <caption className="text-left px-5 pt-4 pb-2 text-[13px] font-semibold text-rose-800">Rows with errors</caption>
                    <thead>
                      <tr className="text-left text-[10px] tracking-[0.14em] uppercase text-ink/60 bg-re-steel-50 border-y border-[var(--jmn-line)]">
                        <th scope="col" className="px-5 py-2 font-semibold w-16">Row</th>
                        <th scope="col" className="px-3 py-2 font-semibold">SKU</th>
                        <th scope="col" className="px-3 py-2 font-semibold">Problem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.errors.map((e) => (
                        <tr key={e.row} className="border-b border-[var(--jmn-line)] align-top">
                          <td className="px-5 py-2 tabular">{e.row}</td>
                          <td className="px-3 py-2 part-no">{e.sku || "—"}</td>
                          <td className="px-3 py-2">
                            <ul>
                              {Object.entries(e.errors).map(([field, msg]) => (
                                <li key={field} className="text-rose-800">
                                  {field !== "__all__" && <span className="part-no text-[12px] text-navy mr-1">{field}:</span>}
                                  {msg}
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {report.rows.length > 0 && (
                <div className="overflow-x-auto">
                  <div className="flex items-center justify-between px-5 pt-4 pb-2">
                    <p className="text-[13px] font-semibold text-navy">Valid rows</p>
                    {report.unchanged > 0 && (
                      <label className="text-[12px] text-ink/65 inline-flex items-center gap-2">
                        <input type="checkbox" checked={showUnchanged} onChange={(e) => setShowUnchanged(e.target.checked)} className="h-4 w-4 accent-[#231F20]" />
                        Show unchanged
                      </label>
                    )}
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] tracking-[0.14em] uppercase text-ink/60 bg-re-steel-50 border-y border-[var(--jmn-line)]">
                        <th scope="col" className="px-5 py-2 font-semibold w-16">Row</th>
                        <th scope="col" className="px-3 py-2 font-semibold">SKU</th>
                        <th scope="col" className="px-3 py-2 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 500).map((r) => (
                        <tr key={r.row} className="border-b border-[var(--jmn-line)] last:border-0">
                          <td className="px-5 py-1.5 tabular">{r.row}</td>
                          <td className="px-3 py-1.5 part-no">{r.sku}</td>
                          <td className={cn("px-3 py-1.5", r.action === "create" ? "text-re-stock-in" : r.action === "update" ? "text-re-blue-text" : "text-ink/60")}>
                            {ACTION_LABEL[r.action]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rows.length > 500 && <p className="px-5 py-2 text-[12px] text-ink/60">Showing the first 500 of {rows.length} rows.</p>}
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="bg-white border border-[var(--jmn-line)] re-rule p-5">
          <h2 className="text-[15px] text-navy mb-3">Columns</h2>
          <dl className="space-y-2 text-[13px]">
            {COLUMNS.map(([c, d]) => (
              <div key={c}>
                <dt className="part-no text-navy font-medium">{c}</dt>
                <dd className="text-ink/65">{d}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[12px] text-ink/60">
            Empty cells leave the field unchanged on updates. Headers are case-insensitive; unknown columns are ignored.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Stat({ k, v, tone }: { k: string; v: number; tone?: "ok" | "bad" }) {
  return (
    <div className="p-3 border-r border-[var(--jmn-line)] last:border-r-0">
      <dt className="text-[10px] tracking-[0.14em] uppercase text-ink/60">{k}</dt>
      <dd className={cn("tabular text-xl", tone === "bad" ? "text-rose-700 font-semibold" : tone === "ok" ? "text-navy" : "text-navy")}>{v}</dd>
    </div>
  );
}
