"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, Upload, X } from "lucide-react";
import { djangoAdmin, type HomeBlockShape } from "@/lib/django-admin";
import type { HomeSectionDef } from "@/lib/admin/home-sections";
import AdminDialog, { btn, field } from "@/components/admin/ui/AdminDialog";
import { cn } from "@/lib/utils";

interface Option { id: string; label: string }

export type HomeBlockInput = Partial<
  Pick<
    HomeBlockShape,
    | "kind" | "name" | "eyebrow" | "title" | "subtitle" | "body" | "image"
    | "cta_label" | "cta_href" | "is_active" | "order" | "metadata"
    | "featured_products" | "featured_categories"
  >
>;

/** Create/edit one home-page section block. */
export default function HomeSectionEditor({
  def,
  block,
  categories,
  onClose,
  onSave,
}: {
  def: HomeSectionDef;
  block: HomeBlockShape | null;
  categories: Option[];
  onClose: () => void;
  onSave: (data: HomeBlockInput) => Promise<void>;
}) {
  const meta = (block?.metadata ?? {}) as Record<string, unknown>;
  const [v, setV] = useState(() => ({
    name: block?.name ?? "",
    eyebrow: block?.eyebrow ?? def.defaults.eyebrow ?? "",
    title: block?.title ?? def.defaults.title ?? "",
    subtitle: block?.subtitle ?? def.defaults.subtitle ?? "",
    body: block?.body ?? def.defaults.body ?? "",
    image: block?.image ?? "",
    cta_label: block?.cta_label ?? def.defaults.cta_label ?? "",
    cta_href: block?.cta_href ?? def.defaults.cta_href ?? "",
    is_active: block?.is_active ?? true,
    order: block?.order ?? 0,
  }));
  const [cats, setCats] = useState<string[]>(block?.featured_category_ids ?? block?.featured_categories ?? []);
  const [parts, setParts] = useState<string[]>(block?.featured_product_ids ?? block?.featured_products ?? []);
  const [partLabels, setPartLabels] = useState<Record<string, string>>(
    (meta.featured_product_labels as Record<string, string>) ?? {},
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((p) => ({ ...p, [k]: val }));
  const has = (f: HomeSectionDef["fields"][number]) => def.fields.includes(f);

  async function submit() {
    setError(null);
    if (has("cta") && v.cta_label && !v.cta_href) return setError("Add a link for the button.");
    if (v.cta_href && !/^(\/|https?:\/\/)/.test(v.cta_href)) return setError("Button link must start with / or https://");
    setSaving(true);
    try {
      const data: HomeBlockInput = {
        kind: def.kind,
        name: v.name || def.label,
        eyebrow: v.eyebrow,
        title: v.title,
        subtitle: v.subtitle,
        body: v.body,
        image: v.image,
        cta_label: v.cta_label,
        cta_href: v.cta_href,
        is_active: v.is_active,
        order: Number(v.order) || 0,
        metadata: {
          ...meta,
          ...(def.marker ? { section: def.marker } : {}),
          ...(def.picker === "products"
            ? { featured_product_labels: Object.fromEntries(parts.map((id) => [id, partLabels[id] ?? ""])) }
            : {}),
        },
      };
      if (def.picker === "categories") data.featured_categories = cats;
      if (def.picker === "products") data.featured_products = parts;
      await onSave(data);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const { url } = await djangoAdmin.uploads.create(f);
      set("image", url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <AdminDialog
      open
      wide
      onClose={onClose}
      title={`${block ? "Edit" : "Add"} · ${def.label}`}
      description={def.help}
      footer={
        <>
          <button type="button" className={btn.ghost} onClick={onClose}>Cancel</button>
          <button type="button" className={btn.primary} onClick={submit} disabled={saving} data-testid="home-section-save">
            {saving && <Loader2 size={14} className="animate-spin" />} Save section
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <div className="grid sm:grid-cols-2 gap-4">
          {has("eyebrow") && (
            <label className="block">
              <span className={field.label}>Eyebrow</span>
              <input className={field.input} value={v.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} maxLength={80} />
            </label>
          )}
          {has("title") && (
            <label className={cn("block", !has("eyebrow") && "sm:col-span-2")}>
              <span className={field.label}>Headline</span>
              <input className={field.input} value={v.title} onChange={(e) => set("title", e.target.value)} maxLength={200} />
            </label>
          )}
        </div>
        {has("subtitle") && (
          <label className="block">
            <span className={field.label}>Sub-headline</span>
            <input className={field.input} value={v.subtitle} onChange={(e) => set("subtitle", e.target.value)} maxLength={300} />
          </label>
        )}
        {has("body") && (
          <label className="block">
            <span className={field.label}>{def.key === "announcement" ? "Announcement text" : "Body"}</span>
            <textarea className={field.textarea} rows={def.key === "announcement" ? 2 : 3} value={v.body} onChange={(e) => set("body", e.target.value)} />
          </label>
        )}
        {has("image") && (
          <div>
            <span className={field.label}>Photo (optional)</span>
            <div className="flex gap-2">
              <input className={field.input} type="url" value={v.image} onChange={(e) => set("image", e.target.value)} placeholder="https://… real workshop / parts photo" aria-label="Image URL" />
              <label className={btn.secondary + " shrink-0 cursor-pointer"}>
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} aria-hidden />} Upload
                <input type="file" accept="image/*" className="sr-only" onChange={upload} />
              </label>
            </div>
            <p className={field.hint}>No stock people photos — use real parts, machines or the shop.</p>
          </div>
        )}
        {has("cta") && (
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className={field.label}>Button label</span>
              <input className={field.input} value={v.cta_label} onChange={(e) => set("cta_label", e.target.value)} maxLength={80} />
            </label>
            <label className="block">
              <span className={field.label}>Button link</span>
              <input className={field.input + " part-no"} value={v.cta_href} onChange={(e) => set("cta_href", e.target.value)} placeholder="/rfq" />
            </label>
          </div>
        )}

        {def.picker === "categories" && (
          <fieldset>
            <legend className={field.label}>Categories to show ({cats.length})</legend>
            <div className="max-h-56 overflow-y-auto border border-re-steel-200 divide-y divide-re-steel-200">
              {categories.map((c) => {
                const on = cats.includes(c.id);
                return (
                  <label key={c.id} className="flex items-center gap-2 px-3 h-10 text-sm text-navy cursor-pointer hover:bg-re-steel-50">
                    <input type="checkbox" checked={on} className="h-4 w-4 accent-[#231F20]"
                      onChange={() => setCats((p) => (on ? p.filter((x) => x !== c.id) : [...p, c.id]))} />
                    {c.label}
                    {on && <span className="ml-auto tabular text-[11px] text-ink/60">#{cats.indexOf(c.id) + 1}</span>}
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
        {def.picker === "products" && (
          <PartsPicker
            ids={parts}
            labels={partLabels}
            onChange={(ids, labels) => {
              setParts(ids);
              setPartLabels(labels);
            }}
          />
        )}

        <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-re-steel-200">
          <label className="flex items-center gap-2 text-sm text-navy">
            <input type="checkbox" checked={v.is_active} onChange={(e) => set("is_active", e.target.checked)} className="h-4 w-4 accent-[#231F20]" />
            Live on the site
          </label>
          <label className="flex items-center gap-2 text-sm text-navy">
            Order
            <input className={field.input + " w-20 tabular"} inputMode="numeric" value={v.order} onChange={(e) => set("order", Number(e.target.value.replace(/\D/g, "")) || 0)} />
          </label>
          <label className="flex-1 min-w-[180px] flex items-center gap-2 text-sm text-navy">
            Internal name
            <input className={field.input} value={v.name} onChange={(e) => set("name", e.target.value)} placeholder={def.label} />
          </label>
        </div>
      </div>
    </AdminDialog>
  );
}

function PartsPicker({
  ids,
  labels,
  onChange,
}: {
  ids: string[];
  labels: Record<string, string>;
  onChange: (ids: string[], labels: Record<string, string>) => void;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ q: string; rows: Array<{ id: string; name: string; part_number: string }> } | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      djangoAdmin.products
        .list({ search: term, status: "active" })
        .then((r) => !cancelled && setHits({ q: term, rows: r.results as Array<{ id: string; name: string; part_number: string }> }))
        .catch(() => {});
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [q]);

  const rows = q.trim().length >= 2 && hits?.q === q.trim() ? hits.rows : [];

  return (
    <fieldset>
      <legend className={field.label}>Parts to feature ({ids.length}/8)</legend>
      {ids.length > 0 && (
        <ol className="mb-2 border border-re-steel-200 divide-y divide-re-steel-200">
          {ids.map((id, i) => (
            <li key={id} className="flex items-center gap-2 px-3 h-10 text-sm">
              <span className="tabular text-ink/60 w-5">{i + 1}</span>
              <span className="flex-1 truncate text-navy">{labels[id] || `Part ${id.slice(0, 8)}`}</span>
              <button type="button" aria-label="Remove" className="h-8 w-8 grid place-items-center text-ink/60 hover:text-rose-700"
                onClick={() => onChange(ids.filter((x) => x !== id), labels)}>
                <X size={14} />
              </button>
            </li>
          ))}
        </ol>
      )}
      {ids.length < 8 && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/55" aria-hidden />
          <input className={field.input + " pl-9"} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search active parts by number or name" aria-label="Search parts to feature" />
        </div>
      )}
      {rows.length > 0 && (
        <ul className="mt-1 border border-re-blue max-h-48 overflow-y-auto">
          {rows.filter((r) => !ids.includes(r.id)).slice(0, 8).map((r) => (
            <li key={r.id}>
              <button type="button" className="w-full text-left px-3 py-2 hover:bg-re-steel-50 text-sm"
                onClick={() => {
                  const label = `${r.name}${r.part_number ? ` · ${r.part_number}` : ""}`;
                  onChange([...ids, r.id], { ...labels, [r.id]: label });
                  setQ("");
                }}>
                <span className="text-navy">{r.name}</span>{" "}
                <span className="part-no text-[12px] text-ink/60">{r.part_number}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
