"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Plus, Trash2, Upload, Check } from "lucide-react";
import { djangoAdmin } from "@/lib/django-admin";
import { cn, slugify } from "@/lib/utils";
import PageHeader from "@/components/admin/PageHeader";

// ─── Reference-data shapes (raw Django JSON) ─────────────────────────────────

interface Cat { id: string; name: string; slug: string }
interface PartsBrand {
  id: string; name: string; slug: string; is_oem?: boolean;
  machine_brand_slugs?: string[];
}
interface MBrand { id: string; name: string; slug: string }
interface MModel {
  id: string; name: string; slug: string;
  machine_brand_slug?: string; machine_type?: string; machine_type_display?: string;
}

interface Props {
  mode: "create" | "edit";
  /** slug of the product to edit */
  slug?: string;
}

type SpecRow = { key: string; value: string };

export default function AdminProductForm({ mode, slug }: Props) {
  const router = useRouter();

  // Reference data
  const [cats, setCats] = useState<Cat[]>([]);
  const [partsBrands, setPartsBrands] = useState<PartsBrand[]>([]);
  const [machineBrands, setMachineBrands] = useState<MBrand[]>([]);
  const [machineModels, setMachineModels] = useState<MModel[]>([]);
  const [loadingRef, setLoadingRef] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [slugField, setSlugField] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [status, setStatus] = useState("active");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [price, setPrice] = useState("");
  const [compareAt, setCompareAt] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [specs, setSpecs] = useState<SpecRow[]>([]);
  const [flags, setFlags] = useState({ is_new: false, is_best_seller: false, is_featured: false });
  const [mbSlugs, setMbSlugs] = useState<string[]>([]);
  const [mmSlugs, setMmSlugs] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgUrl, setImgUrl] = useState("");

  // ── Load reference data (+ product on edit) ──────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [c, b, mb, mm] = await Promise.all([
          djangoAdmin.categories.list<{ results?: Cat[] } | Cat[]>({ page_size: 200 }),
          djangoAdmin.brands.list<{ results?: PartsBrand[] } | PartsBrand[]>({ page_size: 200 }),
          djangoAdmin.machineBrands.list<{ results?: MBrand[] } | MBrand[]>({ page_size: 200 }),
          djangoAdmin.machineModels.list(),
        ]);
        const unwrap = <T,>(d: { results?: T[] } | T[]): T[] =>
          Array.isArray(d) ? d : d.results ?? [];
        setCats(unwrap(c));
        setPartsBrands(unwrap(b));
        setMachineBrands(unwrap(mb));
        setMachineModels(unwrap(mm as { results?: MModel[] } | MModel[]));

        if (mode === "edit" && slug) {
          const p = await djangoAdmin.products.get(slug) as Record<string, unknown>;
          hydrate(p);
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoadingRef(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, slug]);

  function hydrate(p: Record<string, unknown>) {
    setName((p.name as string) ?? "");
    setSku((p.sku as string) ?? "");
    setPartNumber((p.part_number as string) ?? "");
    setSlugField((p.slug as string) ?? "");
    setSlugTouched(true);
    setStatus((p.status as string) ?? "active");
    const cat = p.category as { id?: string } | string | null;
    setCategoryId(typeof cat === "object" && cat ? cat.id ?? "" : "");
    const br = p.brand as { id?: string } | string | null;
    setBrandId(typeof br === "object" && br ? br.id ?? "" : "");
    setPrice(String(p.price ?? ""));
    setCompareAt(p.compare_at_price ? String(p.compare_at_price) : "");
    setCostPrice(p.cost_price ? String(p.cost_price) : "");
    setStock(String(p.total_stock ?? 0));
    setShortDescription((p.short_description as string) ?? "");
    setDescription((p.description as string) ?? "");
    setImages((p.images as string[]) ?? []);
    const sp = (p.specifications as Record<string, string>) ?? {};
    setSpecs(Object.entries(sp).map(([key, value]) => ({ key, value })));
    setFlags({
      is_new: !!p.is_new, is_best_seller: !!p.is_best_seller, is_featured: !!p.is_featured,
    });
    const mbs = (p.machine_brands as Array<{ slug: string }>) ?? [];
    const mms = (p.machine_models as Array<{ slug: string }>) ?? [];
    setMbSlugs(mbs.map((x) => x.slug));
    setMmSlugs(mms.map((x) => x.slug));
  }

  // ── Cascade: parts brand scopes machine brands ───────────────────────────
  const selectedPartsBrand = partsBrands.find((b) => b.id === brandId);
  const availableMachineBrands = useMemo(() => {
    const allowed = selectedPartsBrand?.machine_brand_slugs;
    if (!allowed || allowed.length === 0) return machineBrands; // universal / no scope
    return machineBrands.filter((mb) => allowed.includes(mb.slug));
  }, [machineBrands, selectedPartsBrand]);

  // When the parts brand changes, prune machine brands/models no longer allowed.
  useEffect(() => {
    const allowedSlugs = new Set(availableMachineBrands.map((b) => b.slug));
    setMbSlugs((prev) => prev.filter((s) => allowedSlugs.has(s)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId]);

  // Machine models available = those under the selected machine brands.
  const availableModels = useMemo(
    () => machineModels.filter((m) => m.machine_brand_slug && mbSlugs.includes(m.machine_brand_slug)),
    [machineModels, mbSlugs],
  );
  // Keep selected models valid when machine brands change.
  useEffect(() => {
    const ok = new Set(availableModels.map((m) => m.slug));
    setMmSlugs((prev) => prev.filter((s) => ok.has(s)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mbSlugs]);

  const effectiveSlug = slugTouched ? slugField : slugify(name);

  // ── Image upload ──────────────────────────────────────────────────────────
  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { url } = await djangoAdmin.uploads.create(file);
      setImages((prev) => [...prev, url]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Name is required.");
    if (!categoryId) return setError("Pick a part category.");
    if (!price || Number(price) <= 0) return setError("Enter a valid price.");
    if (!description.trim()) return setError("A description is required.");

    const slugToIds = (slugs: string[], list: { id: string; slug: string }[]) =>
      slugs.map((s) => list.find((x) => x.slug === s)?.id).filter(Boolean) as string[];

    const specObj: Record<string, string> = {};
    for (const r of specs) if (r.key.trim()) specObj[r.key.trim()] = r.value;

    const autoSku =
      sku.trim() ||
      `RE-${(cats.find((c) => c.id === categoryId)?.slug ?? "part").slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;

    const payload: Record<string, unknown> = {
      name: name.trim(),
      sku: autoSku,
      part_number: partNumber.trim(),
      slug: (effectiveSlug || slugify(name)).slice(0, 100),
      status,
      category: categoryId,
      brand: brandId || null,
      price: Number(price),
      compare_at_price: compareAt ? Number(compareAt) : null,
      cost_price: costPrice ? Number(costPrice) : null,
      currency: "BDT",
      images,
      description: description.trim(),
      short_description: shortDescription.trim(),
      specifications: specObj,
      tags: [],
      ...flags,
      machine_brands: slugToIds(mbSlugs, machineBrands),
      machine_models: slugToIds(mmSlugs, machineModels),
      initial_stock: Number(stock) || 0,
    };

    setSaving(true);
    try {
      if (mode === "edit" && slug) {
        await djangoAdmin.products.update(slug, payload);
      } else {
        await djangoAdmin.products.create(payload);
      }
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  if (loadingRef) {
    return (
      <div className="grid place-items-center py-32 text-ink/50">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="pb-24">
      <PageHeader
        eyebrow="Catalog"
        title={mode === "edit" ? "Edit part" : "New part"}
        description="Part identity, pricing, and machine compatibility."
        actions={
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {mode === "edit" ? "Save changes" : "Create part"}
          </button>
        }
      />

      {error && (
        <div className="rounded-md bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 mb-6">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
        {/* ── Main column ── */}
        <div className="space-y-6">
          <Card title="Identity">
            <Field label="Part name" required>
              <input className={inputCls} value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Upper Looper — Pegasus M700" />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Part number">
                <input className={inputCls} value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)} placeholder="R4305-M07-000" />
              </Field>
              <Field label="SKU (auto if blank)">
                <input className={inputCls} value={sku}
                  onChange={(e) => setSku(e.target.value)} placeholder="RE-LPR-0010" />
              </Field>
            </div>
            <Field label="URL slug">
              <input className={inputCls} value={effectiveSlug}
                onChange={(e) => { setSlugTouched(true); setSlugField(slugify(e.target.value)); }} />
            </Field>
          </Card>

          <Card title="Compatibility">
            <Field label="Parts brand (scopes machine brands)">
              <select className={inputCls} value={brandId}
                onChange={(e) => setBrandId(e.target.value)}>
                <option value="">— none / universal —</option>
                {partsBrands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}{b.is_oem ? " (OEM)" : ""}
                  </option>
                ))}
              </select>
            </Field>

            <div className="mt-4">
              <p className="text-[10px] tracking-[0.25em] uppercase text-ink/50 mb-2">
                Machine brands this part fits
              </p>
              <div className="flex flex-wrap gap-2">
                {availableMachineBrands.map((mb) => {
                  const on = mbSlugs.includes(mb.slug);
                  return (
                    <Chip key={mb.slug} active={on}
                      onClick={() => setMbSlugs((p) => on ? p.filter((s) => s !== mb.slug) : [...p, mb.slug])}>
                      {mb.name}
                    </Chip>
                  );
                })}
                {availableMachineBrands.length === 0 && (
                  <p className="text-xs text-ink/45">No machine brands available for this parts brand.</p>
                )}
              </div>
            </div>

            {mbSlugs.length > 0 && (
              <div className="mt-5">
                <p className="text-[10px] tracking-[0.25em] uppercase text-ink/50 mb-2">
                  Fits specific models (optional)
                </p>
                <div className="space-y-3">
                  {mbSlugs.map((bs) => {
                    const brand = machineBrands.find((b) => b.slug === bs);
                    const models = availableModels.filter((m) => m.machine_brand_slug === bs);
                    if (models.length === 0) return null;
                    return (
                      <div key={bs}>
                        <p className="text-[11px] text-navy mb-1.5">{brand?.name}</p>
                        <div className="flex flex-wrap gap-2">
                          {models.map((m) => {
                            const on = mmSlugs.includes(m.slug);
                            return (
                              <Chip key={m.slug} active={on} small
                                onClick={() => setMmSlugs((p) => on ? p.filter((s) => s !== m.slug) : [...p, m.slug])}>
                                {m.name}
                                {m.machine_type_display ? ` · ${m.machine_type_display.split(" ")[0]}` : ""}
                              </Chip>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          <Card title="Description">
            <Field label="Short description">
              <input className={inputCls} value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Upper looper for Pegasus M700 overlock." />
            </Field>
            <Field label="Full description" required>
              <textarea rows={4} className={inputCls} value={description}
                onChange={(e) => setDescription(e.target.value)} />
            </Field>
          </Card>

          <Card title="Specifications">
            <div className="space-y-2">
              {specs.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <input className={inputCls} placeholder="Key (e.g. Position)" value={row.key}
                    onChange={(e) => setSpecs((p) => p.map((r, j) => j === i ? { ...r, key: e.target.value } : r))} />
                  <input className={inputCls} placeholder="Value (e.g. Upper looper)" value={row.value}
                    onChange={(e) => setSpecs((p) => p.map((r, j) => j === i ? { ...r, value: e.target.value } : r))} />
                  <button type="button" onClick={() => setSpecs((p) => p.filter((_, j) => j !== i))}
                    className="shrink-0 h-10 w-10 grid place-items-center text-ink/50 hover:text-rose-700">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => setSpecs((p) => [...p, { key: "", value: "" }])}
                className="text-[11px] tracking-[0.2em] uppercase text-navy hover:text-gold flex items-center gap-1.5">
                <Plus size={13} /> Add spec
              </button>
            </div>
          </Card>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6">
          <Card title="Organise">
            <Field label="Part category" required>
              <select className={inputCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">— select —</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <div className="space-y-2 pt-1">
              <Toggle label="New arrival" checked={flags.is_new}
                onChange={(v) => setFlags((f) => ({ ...f, is_new: v }))} />
              <Toggle label="Best seller" checked={flags.is_best_seller}
                onChange={(v) => setFlags((f) => ({ ...f, is_best_seller: v }))} />
              <Toggle label="Featured" checked={flags.is_featured}
                onChange={(v) => setFlags((f) => ({ ...f, is_featured: v }))} />
            </div>
          </Card>

          <Card title="Pricing & stock (BDT)">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price" required>
                <input type="number" min={0} step="0.01" className={inputCls} value={price}
                  onChange={(e) => setPrice(e.target.value)} />
              </Field>
              <Field label="Compare-at">
                <input type="number" min={0} step="0.01" className={inputCls} value={compareAt}
                  onChange={(e) => setCompareAt(e.target.value)} />
              </Field>
              <Field label="Cost price">
                <input type="number" min={0} step="0.01" className={inputCls} value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)} />
              </Field>
              <Field label="Stock qty">
                <input type="number" min={0} className={inputCls} value={stock}
                  onChange={(e) => setStock(e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card title="Images">
            <div className="grid grid-cols-3 gap-2 mb-3">
              {images.map((url, i) => (
                <div key={i} className="relative aspect-square rounded bg-bone overflow-hidden group">
                  <Image src={url} alt="" fill sizes="120px" className="object-cover" unoptimized />
                  <button type="button" onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 h-6 w-6 grid place-items-center rounded-full bg-navy/80 text-cream opacity-0 group-hover:opacity-100">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input className={inputCls} placeholder="Paste image URL" value={imgUrl}
                onChange={(e) => setImgUrl(e.target.value)} />
              <button type="button" onClick={() => { if (imgUrl.trim()) { setImages((p) => [...p, imgUrl.trim()]); setImgUrl(""); } }}
                className="shrink-0 h-10 px-3 rounded-md border border-[var(--jmn-line)] text-[11px] uppercase tracking-[0.15em] text-navy hover:bg-navy hover:text-cream">
                Add
              </button>
            </div>
            <label className="mt-2 inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-navy hover:text-gold cursor-pointer">
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              Upload file
              <input type="file" accept="image/*" className="sr-only" onChange={onUpload} disabled={uploading} />
            </label>
          </Card>
        </div>
      </div>
    </form>
  );
}

// ─── Small UI helpers ────────────────────────────────────────────────────────

const inputCls =
  "w-full bg-transparent border border-navy/15 rounded-md px-3 py-2.5 text-sm text-navy outline-none focus:border-navy placeholder:text-ink/35 transition-colors";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-[var(--jmn-line)] rounded-lg p-5">
      <h3 className="text-[11px] tracking-[0.25em] uppercase text-ink/55 mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] tracking-[0.22em] uppercase text-ink/55 mb-1.5">
        {label}{required && <span className="text-rose-600"> *</span>}
      </span>
      {children}
    </label>
  );
}

function Chip({ active, small, onClick, children }: {
  active: boolean; small?: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        "rounded-full border transition-colors",
        small ? "px-2.5 py-1 text-[11px]" : "px-3.5 py-1.5 text-[12px]",
        active
          ? "bg-navy text-cream border-navy"
          : "border-navy/20 text-navy hover:border-navy",
      )}>
      {children}
    </button>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 text-sm text-ink/80 cursor-pointer group">
      <span className={cn(
        "h-[18px] w-[18px] rounded border grid place-items-center transition-all",
        checked ? "bg-navy border-navy" : "border-navy/30 group-hover:border-navy/60",
      )}>
        {checked && <Check size={12} className="text-cream" strokeWidth={3} />}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      {label}
    </label>
  );
}
