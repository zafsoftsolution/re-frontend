"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, Info, Loader2, Plus, Trash2, Upload } from "lucide-react";
import {
  djangoAdmin,
  type AvailabilityOverride,
  type ProductSalesModeSetting,
  type SiteSalesMode,
} from "@/lib/django-admin";
import { cn, slugify } from "@/lib/utils";
import { effectiveSalesMode } from "@/lib/admin/sales-mode";
import PageHeader from "@/components/admin/PageHeader";
import AltPartNumbersInput from "@/components/admin/products/AltPartNumbersInput";
import PriceTiersEditor, { validateTiers, type TierRow } from "@/components/admin/products/PriceTiersEditor";

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

/** Bangla copies of translated fields (sent only when changed). */
interface BnFields {
  name: string;
  short_description: string;
  description: string;
  seo_title: string;
  seo_description: string;
}
const EMPTY_BN: BnFields = { name: "", short_description: "", description: "", seo_title: "", seo_description: "" };

const unwrap = <T,>(d: { results?: T[] } | T[]): T[] => (Array.isArray(d) ? d : d.results ?? []);

/**
 * Admin part form (create + edit). Fashion-era fields (gender, fit,
 * material, care instructions, colour/size variants, collection) are not
 * shown and never sent, so existing values stay untouched.
 */
export default function AdminProductForm({ mode, slug }: Props) {
  const router = useRouter();

  // Reference data
  const [cats, setCats] = useState<Cat[]>([]);
  const [partsBrands, setPartsBrands] = useState<PartsBrand[]>([]);
  const [machineBrands, setMachineBrands] = useState<MBrand[]>([]);
  const [machineModels, setMachineModels] = useState<MModel[]>([]);
  const [siteMode, setSiteMode] = useState<SiteSalesMode | null>(null);
  const [loadingRef, setLoadingRef] = useState(true);

  // Identity
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [altPartNumbers, setAltPartNumbers] = useState<string[]>([]);
  const [slugField, setSlugField] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [status, setStatus] = useState("active");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  // Pricing (internal) + stock
  const [price, setPrice] = useState("");
  const [compareAt, setCompareAt] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [loadedStock, setLoadedStock] = useState<string | null>(null);
  const [tiers, setTiers] = useState<TierRow[]>([]);
  // Sales & availability
  const [salesMode, setSalesMode] = useState<ProductSalesModeSetting>("inherit");
  const [priceOnRequest, setPriceOnRequest] = useState(false);
  const [moq, setMoq] = useState("1");
  const [leadTime, setLeadTime] = useState("");
  const [availability, setAvailability] = useState<AvailabilityOverride>("auto");
  // Content
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [bn, setBn] = useState<BnFields>(EMPTY_BN);
  const [loadedBn, setLoadedBn] = useState<BnFields>(EMPTY_BN);
  const [images, setImages] = useState<string[]>([]);
  const [specs, setSpecs] = useState<SpecRow[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [flags, setFlags] = useState({ is_new: false, is_best_seller: false, is_featured: false });
  const [mbSlugs, setMbSlugs] = useState<string[]>([]);
  const [mmSlugs, setMmSlugs] = useState<string[]>([]);
  // SEO
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [ogImage, setOgImage] = useState("");

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"image" | "og" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imgUrl, setImgUrl] = useState("");

  // ── Load reference data (+ product on edit) ──────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const hydrate = (p: Record<string, unknown>, pBn: Record<string, unknown> | null) => {
      const s = (k: string) => (p[k] as string | null | undefined) ?? "";
      setName(s("name"));
      setSku(s("sku"));
      setPartNumber(s("part_number"));
      setAltPartNumbers((p.alt_part_numbers as string[]) ?? []);
      setSlugField(s("slug"));
      setSlugTouched(true);
      setStatus(s("status") || "active");
      const cat = p.category as { id?: string } | string | null;
      setCategoryId(typeof cat === "object" && cat ? cat.id ?? "" : "");
      const br = p.brand as { id?: string } | string | null;
      setBrandId(typeof br === "object" && br ? br.id ?? "" : "");
      setPrice(p.price != null ? String(p.price) : "");
      setCompareAt(p.compare_at_price ? String(p.compare_at_price) : "");
      setCostPrice(p.cost_price ? String(p.cost_price) : "");
      setStock(String(p.total_stock ?? 0));
      setLoadedStock(String(p.total_stock ?? 0));
      setTiers(
        ((p.price_tiers as Array<{ min_quantity: number; unit_price: string }>) ?? []).map((t) => ({
          min_quantity: String(t.min_quantity),
          unit_price: String(t.unit_price),
        })),
      );
      setSalesMode(((p.sales_mode_setting as ProductSalesModeSetting) ?? "inherit"));
      setPriceOnRequest(!!p.price_on_request);
      setMoq(String(p.min_order_quantity ?? 1));
      setLeadTime(p.lead_time_days != null ? String(p.lead_time_days) : "");
      setAvailability(((p.availability_override as AvailabilityOverride) ?? "auto"));
      setShortDescription(s("short_description"));
      setDescription(s("description"));
      setImages((p.images as string[]) ?? []);
      const sp = (p.specifications as Record<string, string>) ?? {};
      setSpecs(Object.entries(sp).map(([key, value]) => ({ key, value: String(value) })));
      setTags((p.tags as string[]) ?? []);
      setFlags({ is_new: !!p.is_new, is_best_seller: !!p.is_best_seller, is_featured: !!p.is_featured });
      setMbSlugs(((p.machine_brands as Array<{ slug: string }>) ?? []).map((x) => x.slug));
      setMmSlugs(((p.machine_models as Array<{ slug: string }>) ?? []).map((x) => x.slug));
      setSeoTitle(s("seo_title"));
      setSeoDescription(s("seo_description"));
      setOgImage(s("og_image"));
      // Bangla read falls back to English server-side — an identical value
      // means "no Bangla copy yet".
      const bnOf = (k: keyof BnFields) => {
        const v = (pBn?.[k] as string | null | undefined) ?? "";
        return v && v !== s(k) ? v : "";
      };
      const loaded: BnFields = {
        name: bnOf("name"),
        short_description: bnOf("short_description"),
        description: bnOf("description"),
        seo_title: bnOf("seo_title"),
        seo_description: bnOf("seo_description"),
      };
      setBn(loaded);
      setLoadedBn(loaded);
    };

    Promise.all([
      djangoAdmin.categories.list<{ results?: Cat[] } | Cat[]>({ page_size: 200 }),
      djangoAdmin.brands.list<{ results?: PartsBrand[] } | PartsBrand[]>({ page_size: 200 }),
      djangoAdmin.machineBrands.list<{ results?: MBrand[] } | MBrand[]>({ page_size: 200 }),
      djangoAdmin.machineModels.list(),
      djangoAdmin.siteSettings.get().catch(() => null),
      mode === "edit" && slug ? djangoAdmin.products.getLocalized(slug, "en") : Promise.resolve(null),
      mode === "edit" && slug ? djangoAdmin.products.getLocalized(slug, "bn").catch(() => null) : Promise.resolve(null),
    ])
      .then(([c, b, mb, mm, settings, p, pBn]) => {
        if (cancelled) return;
        setCats(unwrap(c));
        setPartsBrands(unwrap(b));
        setMachineBrands(unwrap(mb));
        setMachineModels(unwrap(mm as { results?: MModel[] } | MModel[]));
        setSiteMode(settings?.sales_mode ?? "quote_only");
        if (p) hydrate(p, pBn);
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoadingRef(false));
    return () => {
      cancelled = true;
    };
  }, [mode, slug]);

  // ── Cascade: parts brand scopes machine brands → models ──────────────────
  const scopeFor = (bId: string) => machineBrandsFor(partsBrands, machineBrands, bId);
  const availableMachineBrands = useMemo(
    () => machineBrandsFor(partsBrands, machineBrands, brandId),
    [machineBrands, partsBrands, brandId],
  );
  const availableModels = useMemo(
    () => machineModels.filter((m) => m.machine_brand_slug && mbSlugs.includes(m.machine_brand_slug)),
    [machineModels, mbSlugs],
  );

  /** Keep model selection consistent with a new machine-brand selection. */
  const applyMachineBrands = (next: string[]) => {
    setMbSlugs(next);
    const ok = new Set(
      machineModels.filter((m) => m.machine_brand_slug && next.includes(m.machine_brand_slug)).map((m) => m.slug),
    );
    setMmSlugs((prev) => prev.filter((s) => ok.has(s)));
  };
  const changePartsBrand = (bId: string) => {
    setBrandId(bId);
    const allowed = new Set(scopeFor(bId).map((b) => b.slug));
    applyMachineBrands(mbSlugs.filter((s) => allowed.has(s)));
  };

  const effectiveSlug = slugTouched ? slugField : slugify(name);
  const moqNum = Math.max(1, Number(moq) || 1);
  const tierCheck = validateTiers(tiers, moqNum);
  const effective = effectiveSalesMode(siteMode, salesMode, priceOnRequest);

  // ── Uploads ───────────────────────────────────────────────────────────────
  async function onUpload(e: React.ChangeEvent<HTMLInputElement>, target: "image" | "og") {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(target);
    setError(null);
    try {
      const { url } = await djangoAdmin.uploads.create(file);
      if (target === "image") setImages((prev) => [...prev, url]);
      else setOgImage(url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(null);
      e.target.value = "";
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Name is required.");
    if (!categoryId) return setError("Pick a part category.");
    if (price === "" || !Number.isFinite(Number(price)) || Number(price) < 0)
      return setError("Enter the internal price (0 or more). It's hidden on quote-only parts.");
    if (!description.trim()) return setError("A description is required.");
    if (!Number.isInteger(Number(moq)) || Number(moq) < 1) return setError("Minimum order quantity must be a whole number ≥ 1.");
    if (leadTime && (!Number.isInteger(Number(leadTime)) || Number(leadTime) < 0 || Number(leadTime) > 32767))
      return setError("Lead time must be a whole number of days.");
    if (Object.keys(tierCheck.errors).length) return setError("Fix the price tier rows marked in red.");

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
      alt_part_numbers: altPartNumbers,
      slug: (effectiveSlug || slugify(name)).slice(0, 100),
      status,
      category: categoryId,
      brand: brandId || null,
      price: Number(price).toFixed(2),
      compare_at_price: compareAt ? Number(compareAt).toFixed(2) : null,
      currency: "BDT",
      sales_mode: salesMode,
      price_on_request: priceOnRequest,
      min_order_quantity: moqNum,
      lead_time_days: leadTime === "" ? null : Number(leadTime),
      availability_override: availability,
      price_tiers: tiers.map((t) => ({
        min_quantity: Number(t.min_quantity),
        unit_price: Number(t.unit_price).toFixed(2),
      })),
      images,
      description: description.trim(),
      short_description: shortDescription.trim(),
      specifications: specObj,
      tags,
      ...flags,
      machine_brands: slugToIds(mbSlugs, machineBrands),
      machine_models: slugToIds(mmSlugs, machineModels),
      seo_title: seoTitle.trim(),
      seo_description: seoDescription.trim(),
      og_image: ogImage.trim(),
    };
    // Cost isn't returned by the detail endpoint — only write it when set.
    if (costPrice !== "") payload.cost_price = Number(costPrice).toFixed(2);
    else if (mode === "create") payload.cost_price = null;
    // Stock: seed on create, otherwise only when the number was changed.
    if (mode === "create" || stock !== loadedStock) payload.initial_stock = Number(stock) || 0;
    for (const k of Object.keys(bn) as (keyof BnFields)[]) {
      if (mode === "create" ? bn[k].trim() : bn[k] !== loadedBn[k]) payload[`${k}_bn`] = bn[k].trim();
    }

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
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  if (loadingRef) {
    return (
      <div className="grid place-items-center py-32 text-ink/50">
        <Loader2 className="animate-spin" aria-label="Loading" />
      </div>
    );
  }

  const setBnField = (k: keyof BnFields, v: string) => setBn((p) => ({ ...p, [k]: v }));

  return (
    <form onSubmit={submit} className="pb-24" data-testid="product-form">
      <PageHeader
        eyebrow="Catalogue"
        title={mode === "edit" ? "Edit part" : "New part"}
        description="Part identity, compatibility, how it's sold and SEO."
        actions={
          <>
            <Link href="/admin/products" className="h-10 px-4 inline-flex items-center border border-re-steel-300 bg-white text-[13px] text-navy hover:border-navy">
              Cancel
            </Link>
            <button type="submit" disabled={saving} className="h-10 px-5 inline-flex items-center gap-2 bg-re-red-cta text-white text-[13px] font-semibold hover:bg-re-red-hover disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {mode === "edit" ? "Save changes" : "Create part"}
            </button>
          </>
        }
      />

      {error && (
        <div role="alert" className="bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800 mb-6">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
        {/* ── Main column ── */}
        <div className="space-y-6 min-w-0">
          <Card title="Identity">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Part name" required>
                <input className={inputCls} value={name} name="name"
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Upper looper — Pegasus M700" />
              </Field>
              <Field label="Part name (বাংলা)">
                <input className={inputCls} value={bn.name} name="name_bn" lang="bn"
                  onChange={(e) => setBnField("name", e.target.value)} placeholder="ঐচ্ছিক" />
              </Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Part number (OEM)">
                <input className={inputCls + " part-no"} value={partNumber} name="part_number"
                  onChange={(e) => setPartNumber(e.target.value)} placeholder="R4305-M07-000" />
              </Field>
              <Field label="SKU (auto if blank)">
                <input className={inputCls + " part-no"} value={sku} name="sku"
                  onChange={(e) => setSku(e.target.value)} placeholder="RE-LPR-0010" />
              </Field>
            </div>
            <div>
              <span className={labelCls}>Alternate / superseded part numbers</span>
              <AltPartNumbersInput value={altPartNumbers} onChange={setAltPartNumbers} id="alt-part-numbers" />
              <p className={hintCls}>Searchable on the site. Enter or comma adds; paste a list to add many.</p>
            </div>
            <Field label="URL slug">
              <input className={inputCls + " part-no"} value={effectiveSlug}
                onChange={(e) => { setSlugTouched(true); setSlugField(slugify(e.target.value)); }} />
            </Field>
          </Card>

          <Card title="Compatibility">
            <Field label="Parts brand (scopes machine brands)">
              <select className={inputCls} value={brandId} onChange={(e) => changePartsBrand(e.target.value)}>
                <option value="">— none / universal —</option>
                {partsBrands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}{b.is_oem ? " (OEM)" : ""}
                  </option>
                ))}
              </select>
            </Field>

            <fieldset className="mt-4">
              <legend className={labelCls}>Machine brands this part fits</legend>
              <div className="flex flex-wrap gap-2">
                {availableMachineBrands.map((mb) => {
                  const on = mbSlugs.includes(mb.slug);
                  return (
                    <Chip key={mb.slug} active={on}
                      onClick={() => applyMachineBrands(on ? mbSlugs.filter((s) => s !== mb.slug) : [...mbSlugs, mb.slug])}>
                      {mb.name}
                    </Chip>
                  );
                })}
                {availableMachineBrands.length === 0 && (
                  <p className="text-xs text-ink/60">No machine brands available for this parts brand.</p>
                )}
              </div>
            </fieldset>

            {mbSlugs.length > 0 && (
              <fieldset className="mt-5">
                <legend className={labelCls}>Fits specific models (optional)</legend>
                <div className="space-y-3">
                  {mbSlugs.map((bs) => {
                    const brand = machineBrands.find((b) => b.slug === bs);
                    const models = availableModels.filter((m) => m.machine_brand_slug === bs);
                    if (models.length === 0) return null;
                    return (
                      <div key={bs}>
                        <p className="text-[12px] font-medium text-navy mb-1.5">{brand?.name}</p>
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
              </fieldset>
            )}
          </Card>

          <Card title="Description">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Short description">
                <input className={inputCls} value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="Upper looper for Pegasus M700 overlock." />
              </Field>
              <Field label="Short description (বাংলা)">
                <input className={inputCls} value={bn.short_description} lang="bn"
                  onChange={(e) => setBnField("short_description", e.target.value)} />
              </Field>
            </div>
            <Field label="Full description" required>
              <textarea rows={4} className={inputCls} value={description} name="description"
                onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <Field label="Full description (বাংলা)">
              <textarea rows={3} className={inputCls} value={bn.description} lang="bn"
                onChange={(e) => setBnField("description", e.target.value)} />
            </Field>
          </Card>

          <Card title="Specifications">
            <div className="space-y-2">
              {specs.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <input className={inputCls} placeholder="Key (e.g. Position)" value={row.key} aria-label={`Spec ${i + 1} key`}
                    onChange={(e) => setSpecs((p) => p.map((r, j) => j === i ? { ...r, key: e.target.value } : r))} />
                  <input className={inputCls} placeholder="Value (e.g. Upper looper)" value={row.value} aria-label={`Spec ${i + 1} value`}
                    onChange={(e) => setSpecs((p) => p.map((r, j) => j === i ? { ...r, value: e.target.value } : r))} />
                  <button type="button" onClick={() => setSpecs((p) => p.filter((_, j) => j !== i))}
                    aria-label={`Remove spec ${i + 1}`}
                    className="shrink-0 h-10 w-10 grid place-items-center text-ink/60 hover:text-rose-700">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => setSpecs((p) => [...p, { key: "", value: "" }])}
                className="text-[13px] font-medium text-re-blue-text hover:underline flex items-center gap-1.5">
                <Plus size={13} /> Add spec
              </button>
            </div>
          </Card>

          <Card title="SEO">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={`SEO title (${seoTitle.length}/200)`}>
                <input className={inputCls} value={seoTitle} maxLength={200} name="seo_title"
                  onChange={(e) => setSeoTitle(e.target.value)} placeholder="Defaults to part name + number" />
              </Field>
              <Field label="SEO title (বাংলা)">
                <input className={inputCls} value={bn.seo_title} maxLength={200} lang="bn"
                  onChange={(e) => setBnField("seo_title", e.target.value)} />
              </Field>
              <Field label={`Meta description (${seoDescription.length}/300)`}>
                <textarea rows={3} className={inputCls} value={seoDescription} maxLength={300} name="seo_description"
                  onChange={(e) => setSeoDescription(e.target.value)} />
              </Field>
              <Field label="Meta description (বাংলা)">
                <textarea rows={3} className={inputCls} value={bn.seo_description} maxLength={300} lang="bn"
                  onChange={(e) => setBnField("seo_description", e.target.value)} />
              </Field>
            </div>
            <div>
              <Field label="Social share image (OG)">
                <input className={inputCls} value={ogImage} name="og_image" type="url"
                  onChange={(e) => setOgImage(e.target.value)} placeholder="https://… (defaults to the first image)" />
              </Field>
              <label className="mt-2 inline-flex items-center gap-2 text-[13px] font-medium text-re-blue-text hover:underline cursor-pointer">
                {uploading === "og" ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                Upload OG image (1200×630)
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => onUpload(e, "og")} disabled={!!uploading} />
              </label>
            </div>
          </Card>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6 min-w-0">
          <Card title="Organise">
            <Field label="Part category" required>
              <select className={inputCls} value={categoryId} name="category" onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">— select —</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className={inputCls} value={status} name="status" onChange={(e) => setStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <div className="space-y-2 pt-1">
              <Toggle label="Featured (home page)" checked={flags.is_featured}
                onChange={(v) => setFlags((f) => ({ ...f, is_featured: v }))} />
              <Toggle label="New arrival" checked={flags.is_new}
                onChange={(v) => setFlags((f) => ({ ...f, is_new: v }))} />
              <Toggle label="Fast mover" checked={flags.is_best_seller}
                onChange={(v) => setFlags((f) => ({ ...f, is_best_seller: v }))} />
            </div>
          </Card>

          <Card title="How it's sold">
            <fieldset>
              <legend className={labelCls}>Sales mode</legend>
              <div className="grid grid-cols-3 border border-re-steel-300" role="radiogroup" aria-label="Sales mode">
                {(["inherit", "quote_only", "direct"] as const).map((m) => (
                  <label key={m} className={cn(
                    "h-10 grid place-items-center text-[13px] cursor-pointer border-r last:border-r-0 border-re-steel-300 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-re-blue",
                    salesMode === m ? "bg-re-ink text-white font-medium" : "bg-white text-navy hover:bg-re-steel-50",
                  )}>
                    <input type="radio" name="sales_mode" value={m} checked={salesMode === m}
                      onChange={() => setSalesMode(m)} className="sr-only" />
                    {m === "inherit" ? "Inherit" : m === "quote_only" ? "Quote only" : "Direct"}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex gap-2 text-[12px] text-ink/65 bg-re-steel-50 border border-re-steel-200 p-3" data-testid="sales-mode-explainer">
              <Info size={14} className="shrink-0 mt-0.5 text-re-blue" aria-hidden />
              <div className="space-y-1">
                <p>
                  Site is <strong className="text-navy">{siteMode === "mixed" ? "Mixed" : "Quote only"}</strong>.{" "}
                  <strong className="text-navy">Direct</strong> (public price + Add to cart) works only when the site
                  sales mode is <em>Mixed</em> and “Price on request” is off. <strong className="text-navy">Inherit</strong> follows
                  the site and is quote-only today.
                </p>
                <p>
                  This part shows as:{" "}
                  <strong className={effective === "direct" ? "text-re-stock-in" : "text-navy"}>
                    {effective === "direct" ? "Direct sale — price visible" : "Price on request — Add to quote"}
                  </strong>
                  {salesMode === "direct" && siteMode !== "mixed" && (
                    <> · <Link href="/admin/settings" className="text-re-blue-text underline">switch the site to Mixed</Link></>
                  )}
                </p>
              </div>
            </div>
            <Toggle label="Price on request (always hide the price)" checked={priceOnRequest} onChange={setPriceOnRequest} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Min. order qty">
                <input inputMode="numeric" className={inputCls + " tabular"} value={moq} name="min_order_quantity"
                  onChange={(e) => setMoq(e.target.value.replace(/\D/g, ""))} />
              </Field>
              <Field label="Lead time (days)">
                <input inputMode="numeric" className={inputCls + " tabular"} value={leadTime} name="lead_time_days"
                  onChange={(e) => setLeadTime(e.target.value.replace(/\D/g, ""))} placeholder="—" />
              </Field>
            </div>
            <Field label="Availability">
              <select className={inputCls} value={availability} name="availability_override"
                onChange={(e) => setAvailability(e.target.value as AvailabilityOverride)}>
                <option value="auto">Automatic (from stock)</option>
                <option value="on_request">Available on request</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </Field>
          </Card>

          <Card title="Internal pricing & stock (BDT)">
            <p className="text-[12px] text-ink/60 -mt-2">Used by POS, billing and quoting. Public only for direct-sale parts.</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price" required>
                <input inputMode="decimal" className={inputCls + " tabular"} value={price} name="price"
                  onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} />
              </Field>
              <Field label="Compare-at">
                <input inputMode="decimal" className={inputCls + " tabular"} value={compareAt}
                  onChange={(e) => setCompareAt(e.target.value.replace(/[^\d.]/g, ""))} />
              </Field>
              <Field label="Cost price">
                <input inputMode="decimal" className={inputCls + " tabular"} value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder={mode === "edit" ? "keep current" : ""} />
              </Field>
              <Field label="Stock qty">
                <input inputMode="numeric" className={inputCls + " tabular"} value={stock}
                  onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))} />
              </Field>
            </div>
            {mode === "edit" && (
              <p className={hintCls}>Changing stock here sets the on-hand quantity at the default warehouse.</p>
            )}
            <div className="pt-2 border-t border-re-steel-200">
              <p className={labelCls + " mt-2"}>Price tiers</p>
              <PriceTiersEditor rows={tiers} onChange={setTiers} moq={moqNum} basePrice={price} />
            </div>
          </Card>

          <Card title="Images">
            <div className="grid grid-cols-3 gap-2 mb-3">
              {images.map((url, i) => (
                <div key={i} className="relative aspect-square bg-bone overflow-hidden group">
                  <Image src={url} alt="" fill sizes="120px" className="object-cover" unoptimized />
                  <button type="button" onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                    aria-label={`Remove image ${i + 1}`}
                    className="absolute top-1 right-1 h-7 w-7 grid place-items-center bg-re-ink/85 text-white opacity-0 group-hover:opacity-100 focus:opacity-100">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input className={inputCls} placeholder="Paste image URL" value={imgUrl} aria-label="Image URL"
                onChange={(e) => setImgUrl(e.target.value)} />
              <button type="button" onClick={() => { if (imgUrl.trim()) { setImages((p) => [...p, imgUrl.trim()]); setImgUrl(""); } }}
                className="shrink-0 h-10 px-3 border border-re-steel-300 text-[13px] text-navy hover:border-navy">
                Add
              </button>
            </div>
            <label className="mt-2 inline-flex items-center gap-2 text-[13px] font-medium text-re-blue-text hover:underline cursor-pointer">
              {uploading === "image" ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              Upload file
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => onUpload(e, "image")} disabled={!!uploading} />
            </label>
          </Card>
        </div>
      </div>
    </form>
  );
}

// ─── Small UI helpers ────────────────────────────────────────────────────────

/** Machine brands a parts brand supplies (all of them when unscoped). */
function machineBrandsFor(partsBrands: PartsBrand[], machineBrands: MBrand[], bId: string): MBrand[] {
  const allowed = partsBrands.find((b) => b.id === bId)?.machine_brand_slugs;
  if (!allowed || allowed.length === 0) return machineBrands;
  return machineBrands.filter((m) => allowed.includes(m.slug));
}

const inputCls =
  "w-full bg-white border border-re-steel-300 px-3 py-2.5 text-sm text-navy outline-none focus:border-re-blue placeholder:text-ink/40 transition-colors";
const labelCls = "block text-[11px] font-semibold tracking-[0.08em] uppercase text-ink/65 mb-1.5";
const hintCls = "mt-1 text-[12px] text-ink/60";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-[var(--jmn-line)] re-rule p-5">
      <h2 className="text-[15px] text-navy mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelCls}>
        {label}{required && <span className="text-rose-700"> *</span>}
      </span>
      {children}
    </label>
  );
}

function Chip({ active, small, onClick, children }: {
  active: boolean; small?: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cn(
        "border transition-colors duration-150",
        small ? "px-2.5 h-8 text-[12px]" : "px-3.5 h-9 text-[13px]",
        active
          ? "bg-re-ink text-white border-re-ink"
          : "bg-white border-re-steel-300 text-navy hover:border-navy",
      )}>
      {children}
    </button>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 text-sm text-navy cursor-pointer group has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-re-blue has-[:focus-visible]:outline-offset-2">
      <span className={cn(
        "h-[18px] w-[18px] border grid place-items-center transition-colors shrink-0",
        checked ? "bg-re-ink border-re-ink" : "bg-white border-re-steel-400 group-hover:border-navy",
      )}>
        {checked && <Check size={12} className="text-white" strokeWidth={3} />}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      {label}
    </label>
  );
}
