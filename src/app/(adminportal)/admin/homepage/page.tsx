"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { djangoAdmin, type HomeBlockShape } from "@/lib/django-admin";
import {
  HOME_SECTIONS,
  LEGACY_KIND_LABEL,
  sectionOf,
  type HomeSectionDef,
} from "@/lib/admin/home-sections";
import { useConfirm, useToast } from "@/context/FeedbackContext";
import PageHeader from "@/components/admin/PageHeader";
import HomeSectionEditor, { type HomeBlockInput } from "@/components/admin/home/HomeSectionEditor";
import { btn } from "@/components/admin/ui/AdminDialog";
import { cn } from "@/lib/utils";

type Editing = { def: HomeSectionDef; block: HomeBlockShape | null } | null;

export default function AdminHomepage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [blocks, setBlocks] = useState<HomeBlockShape[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; label: string }>>([]);
  const [editing, setEditing] = useState<Editing>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    djangoAdmin.homeBlocks
      .list<{ results?: HomeBlockShape[] } | HomeBlockShape[]>({ page_size: 200 })
      .then(
        (d) => !cancelled && setBlocks(Array.isArray(d) ? d : d.results ?? []),
        (e: Error) => !cancelled && setError(e.message),
      );
    return () => {
      cancelled = true;
    };
  }, [tick]);

  useEffect(() => {
    djangoAdmin.categories
      .list<{ results?: Array<{ id: string; name: string; parent: string | null }> }>()
      .then((d) =>
        setCategories(
          (d.results ?? []).map((c) => ({ id: c.id, label: c.parent ? `↳ ${c.name}` : c.name })),
        ),
      )
      .catch(() => {});
  }, []);

  const reload = () => setTick((t) => t + 1);

  async function save(data: HomeBlockInput) {
    if (!editing) return;
    if (editing.block) await djangoAdmin.homeBlocks.update(editing.block.id, data);
    else await djangoAdmin.homeBlocks.create(data);
    toast.success(`${editing.def.label} saved`, "The public home page updates within a minute.");
    setEditing(null);
    reload();
  }

  async function toggle(b: HomeBlockShape) {
    try {
      await djangoAdmin.homeBlocks.update(b.id, { is_active: !b.is_active });
      reload();
    } catch (e) {
      toast.error("Couldn't update", (e as Error).message);
    }
  }

  async function remove(b: HomeBlockShape, label: string) {
    const ok = await confirm({ title: `Delete “${b.name || b.title || label}”?`, description: "This removes the block from the home page.", tone: "danger", confirmLabel: "Delete" });
    if (!ok) return;
    try {
      await djangoAdmin.homeBlocks.delete(b.id);
      toast.success("Block deleted");
      reload();
    } catch (e) {
      toast.error("Couldn't delete", (e as Error).message);
    }
  }

  const legacy = (blocks ?? []).filter((b) => !sectionOf(b));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Site"
        title="Home page"
        description="The sections of the public home page, top to bottom. Machine-brand tiles follow “Featured” in Machine brands; the search box is always shown."
        actions={
          <a href="/" target="_blank" rel="noopener noreferrer" className={btn.secondary}>
            <Eye size={14} aria-hidden /> View site
          </a>
        }
      />

      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {!blocks && !error && (
        <div className="grid place-items-center py-16"><Loader2 className="animate-spin text-ink/55" aria-label="Loading" /></div>
      )}

      {blocks && (
        <ol className="space-y-4" aria-label="Home page sections">
          {HOME_SECTIONS.map((def, i) => {
            const rows = blocks
              .filter((b) => sectionOf(b)?.key === def.key)
              .sort((a, b) => a.order - b.order);
            const live = rows.filter((r) => r.is_active);
            return (
              <li key={def.key} className="bg-white border border-[var(--jmn-line)] re-rule" data-testid={`home-section-${def.key}`}>
                <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                  <div className="min-w-0 max-w-2xl">
                    <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-ink/60">
                      <span className="tabular">{String(i + 1).padStart(2, "0")}</span> · {live.length ? "Live" : rows.length ? "Hidden" : "Not set — uses site defaults"}
                    </p>
                    <h2 className="text-lg text-navy">{def.label}</h2>
                    <p className="text-[13px] text-ink/65">{def.help}</p>
                    {def.key === "machine_brands" && (
                      <Link href="/admin/machine-brands" className="text-[13px] text-re-blue-text hover:underline">Choose featured brands →</Link>
                    )}
                  </div>
                  {(def.multiple || rows.length === 0) && (
                    <button type="button" className={btn.secondary} onClick={() => setEditing({ def, block: null })}>
                      <Plus size={14} aria-hidden /> {rows.length ? "Add slide" : "Set up"}
                    </button>
                  )}
                </div>
                {rows.length > 0 && (
                  <ul className="border-t border-[var(--jmn-line)] divide-y divide-[var(--jmn-line)]">
                    {rows.map((b) => (
                      <li key={b.id} className="px-5 py-3 flex items-center gap-3">
                        <span className={cn("h-2 w-2 shrink-0", b.is_active ? "bg-re-stock-in" : "bg-re-steel-400")} aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm text-navy truncate">{b.title || b.body || b.name || "Untitled"}</span>
                          <span className="block text-[12px] text-ink/60 truncate">
                            {[b.is_active ? "Live" : "Hidden", b.eyebrow, b.cta_label && `Button: ${b.cta_label} → ${b.cta_href}`, def.picker === "categories" && `${b.featured_categories.length} categories`, def.picker === "products" && `${b.featured_products.length} parts`]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                        <button type="button" className={btn.ghost + " h-9"} onClick={() => toggle(b)} aria-label={b.is_active ? "Hide" : "Show"}>
                          {b.is_active ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
                          <span className="hidden sm:inline">{b.is_active ? "Hide" : "Show"}</span>
                        </button>
                        <button type="button" className={btn.secondary + " h-9"} onClick={() => setEditing({ def, block: b })}>
                          <Pencil size={14} aria-hidden /> Edit
                        </button>
                        <button type="button" className={btn.ghost + " h-9 text-rose-800"} onClick={() => remove(b, def.label)} aria-label="Delete">
                          <Trash2 size={14} aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {legacy.length > 0 && (
        <details className="bg-white border border-[var(--jmn-line)]">
          <summary className="px-5 py-3 cursor-pointer text-sm text-navy">
            Legacy blocks from the old fashion site ({legacy.length}) — not shown on the new home page
          </summary>
          <ul className="border-t border-[var(--jmn-line)] divide-y divide-[var(--jmn-line)]">
            {legacy.map((b) => (
              <li key={b.id} className="px-5 py-3 flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-navy truncate">{b.name || b.title || "Untitled"}</span>
                  <span className="block text-[12px] text-ink/60">{LEGACY_KIND_LABEL[b.kind] ?? b.kind} · {b.is_active ? "active" : "hidden"}</span>
                </span>
                {b.is_active && (
                  <button type="button" className={btn.ghost + " h-9"} onClick={() => toggle(b)}>
                    <EyeOff size={14} aria-hidden /> Hide
                  </button>
                )}
                <button type="button" className={btn.ghost + " h-9 text-rose-800"} onClick={() => remove(b, "legacy block")} aria-label="Delete">
                  <Trash2 size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {editing && (
        <HomeSectionEditor
          key={editing.block?.id ?? editing.def.key}
          def={editing.def}
          block={editing.block}
          categories={categories}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}
