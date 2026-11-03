"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { ImageOff, Loader2, Sparkles, Upload, X } from "lucide-react";
import { djangoAdmin, type HomeBlockKind } from "@/lib/django-admin";
import HomeBlockPreview, { type HomeBlockDraft } from "./HomeBlockPreview";

/**
 * Bespoke editor for `HomeBlock` rows.
 *
 * Two columns: form on the left (only the fields that matter for the chosen
 * `kind`), live preview on the right. The preview re-renders on every
 * keystroke so the owner can see exactly what will land on the storefront
 * before saving.
 */

export interface HomeBlockEditorValues {
  id?: string;
  kind: HomeBlockKind;
  name: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  body: string;
  image: string;
  secondary_image: string;
  cta_label: string;
  cta_href: string;
  text_color: string;
  linked_collection: string | null;
  linked_lookbook: string | null;
  featured_products: string[];
  featured_categories: string[];
  is_active: boolean;
  order: number;
  metadata: Record<string, unknown>;
}

interface Option {
  value: string;
  label: string;
}

interface Props {
  mode: "create" | "edit";
  initial?: Partial<HomeBlockEditorValues>;
  collections: Option[];
  lookbooks: Option[];
  onClose: () => void;
  onSubmit: (data: Partial<HomeBlockEditorValues>) => Promise<void>;
}

const KIND_LABELS: Record<HomeBlockKind, string> = {
  hero: "01 — Hero",
  marquee: "Marquee",
  category_grid: "02 — Category grid",
  featured_edit: "03 — Featured edit",
  manifesto: "04 — Manifesto",
  new_arrivals: "05 — New arrivals",
  lookbook_feature: "06 — Lookbook feature",
  best_sellers: "07 — Best sellers",
  testimonials: "08 — Testimonials",
  newsletter_cta: "10 — Newsletter close",
  custom: "Custom",
};

const KIND_HELP: Record<HomeBlockKind, string> = {
  hero: "The big full-screen image at the top of the homepage. Headline + subtitle + a button.",
  marquee: "The scrolling text strip just below the hero. Use the body to write the words, separated by · or new lines.",
  category_grid: "Drives the eyebrow + headline above the 4-tile category grid. The actual tiles come from your featured categories.",
  featured_edit: "The 'considered few' grid showing your handpicked products. Edit the eyebrow + headline; the products themselves come from the products you mark as featured.",
  manifesto: "The two-column 'about the house' section with an atelier photo and the brand story.",
  new_arrivals: "Drives the eyebrow + headline above the New In rail. The products themselves are pulled from products marked 'New'.",
  lookbook_feature: "Promotes a specific editorial / lookbook from the homepage.",
  best_sellers: "Drives the eyebrow + headline above the Best Sellers grid. The products themselves are pulled from products marked 'Best seller'.",
  testimonials: "Drives the eyebrow above the testimonial slideshow. The quotes themselves come from your published testimonials.",
  newsletter_cta: "The dark closing block with the newsletter signup. Use title + subtitle for the two-line headline (the second line shows in italic gold).",
  custom: "A free-form block — anything that doesn't fit the preset slots.",
};

/**
 * Per-kind field visibility. Keep this in sync with `HomeBlockPreview`.
 * Each field below is shown if the active kind appears in the array.
 */
const HEADER_KINDS: HomeBlockKind[] = [
  "category_grid", "new_arrivals", "best_sellers", "testimonials",
];

const KIND_FIELDS: Record<string, HomeBlockKind[]> = {
  eyebrow: ["hero", "featured_edit", "manifesto", "lookbook_feature", "newsletter_cta", "custom", ...HEADER_KINDS],
  title: ["hero", "featured_edit", "manifesto", "lookbook_feature", "newsletter_cta", "custom", ...HEADER_KINDS],
  subtitle: ["hero", "lookbook_feature", "newsletter_cta", "custom", ...HEADER_KINDS],
  body: ["hero", "marquee", "featured_edit", "manifesto", "lookbook_feature", "newsletter_cta", "custom"],
  image: ["hero", "manifesto", "featured_edit", "lookbook_feature", "custom"],
  secondary_image: ["manifesto", "lookbook_feature", "custom"],
  cta_label: ["hero", "manifesto", "featured_edit", "lookbook_feature", "custom", "category_grid"],
  cta_href: ["hero", "manifesto", "featured_edit", "lookbook_feature", "custom", "category_grid"],
  text_color: ["hero", "custom"],
  linked_collection: ["hero", "featured_edit", "manifesto", "custom"],
  linked_lookbook: ["lookbook_feature", "custom"],
};

const PER_KIND_BODY_HELP: Partial<Record<HomeBlockKind, string>> = {
  marquee: "The words shown in the scrolling strip. Separate items with · or new lines.",
  manifesto: "Brand story. Use a blank line to start a new paragraph.",
  newsletter_cta: "Body copy below the headline.",
};

const PER_KIND_TITLE_HELP: Partial<Record<HomeBlockKind, string>> = {
  hero: "Big headline above the fold. Keep it short — 4–6 words is the sweet spot.",
  newsletter_cta: "First line of the closing CTA. The next field (subtitle) becomes the second line in italic gold.",
};

const PER_KIND_SUBTITLE_HELP: Partial<Record<HomeBlockKind, string>> = {
  newsletter_cta: "Renders as the italic gold second line of the headline.",
  hero: "The smaller paragraph beneath the headline.",
};

export default function HomeBlockEditor({
  mode,
  initial,
  collections,
  lookbooks,
  onClose,
  onSubmit,
}: Props) {
  const [values, setValues] = useState<HomeBlockEditorValues>(() =>
    seed(initial ?? {}),
  );
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  function set<K extends keyof HomeBlockEditorValues>(
    key: K,
    v: HomeBlockEditorValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  const visible = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const [field, kinds] of Object.entries(KIND_FIELDS)) {
      map[field] = kinds.includes(values.kind);
    }
    return map;
  }, [values.kind]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setGlobalError(null);
    try {
      // Strip empty FK strings → null, drop hidden fields so we don't blow
      // away values that were set under a different kind.
      const cleaned: Partial<HomeBlockEditorValues> = {
        kind: values.kind,
        name: values.name,
        is_active: values.is_active,
        order: values.order,
        metadata: values.metadata,
      };
      const allFields: (keyof HomeBlockEditorValues)[] = [
        "eyebrow", "title", "subtitle", "body",
        "image", "secondary_image",
        "cta_label", "cta_href", "text_color",
        "linked_collection", "linked_lookbook",
        "featured_products", "featured_categories",
      ];
      for (const f of allFields) {
        if (!visible[f as string] && f !== "featured_products" && f !== "featured_categories") {
          continue;
        }
        const v = values[f];
        if (f === "linked_collection" || f === "linked_lookbook") {
          (cleaned as Record<string, unknown>)[f] = v ? v : null;
        } else {
          (cleaned as Record<string, unknown>)[f] = v;
        }
      }
      await onSubmit(cleaned);
    } catch (e) {
      const err = e as Error & { fields?: Record<string, string[]> };
      if (err.fields && Object.keys(err.fields).length) setErrors(err.fields);
      else setGlobalError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const draft: HomeBlockDraft = {
    kind: values.kind,
    eyebrow: values.eyebrow,
    title: values.title,
    subtitle: values.subtitle,
    body: values.body,
    image: values.image,
    secondary_image: values.secondary_image,
    cta_label: values.cta_label,
    cta_href: values.cta_href,
    text_color: values.text_color,
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-navy/40 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-white w-full max-w-[1200px] h-full overflow-hidden flex flex-col"
      >
        <header className="px-6 py-5 border-b border-[var(--jmn-line)] flex items-center justify-between shrink-0">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-gold mb-1">
              {mode === "edit" ? "Editing" : "New block"}
            </p>
            <h2 className="font-display text-2xl text-navy flex items-center gap-3">
              {KIND_LABELS[values.kind]}
              {values.name && (
                <span className="text-ink/45 text-base font-sans">— {values.name}</span>
              )}
            </h2>
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

        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* ── Left: form ───────────────────────────────────── */}
          <div className="overflow-y-auto px-6 py-5 space-y-5 border-r border-[var(--jmn-line)]">
            {/* Kind context card */}
            <div className="rounded-md bg-[#F8F4EC] border border-gold/30 p-4 flex gap-3">
              <Sparkles size={16} className="text-gold shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] tracking-[0.18em] uppercase text-navy font-medium">
                  This shows up as the {KIND_LABELS[values.kind].toLowerCase()} on your homepage
                </p>
                <p className="text-xs text-ink/65 mt-1 leading-relaxed">
                  {KIND_HELP[values.kind]}
                </p>
              </div>
            </div>

            <Section title="Setup">
              <FieldRow label="Block kind" hint="Which homepage section this drives.">
                <select
                  value={values.kind}
                  onChange={(e) => set("kind", e.target.value as HomeBlockKind)}
                  className={inputCls}
                >
                  {Object.entries(KIND_LABELS).map(([k, l]) => (
                    <option key={k} value={k}>{l}</option>
                  ))}
                </select>
              </FieldRow>

              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="Internal name" hint="So you can find this row in the list.">
                  <input
                    type="text"
                    value={values.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="e.g. Spring/Summer 26 hero"
                    className={inputCls}
                  />
                </FieldRow>
                <FieldRow label="Order" hint="Lower numbers render first.">
                  <input
                    type="number"
                    value={values.order}
                    onChange={(e) => set("order", Number(e.target.value) || 0)}
                    className={inputCls}
                  />
                </FieldRow>
              </div>

              <FieldRow label="Live on storefront">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={values.is_active}
                    onChange={(e) => set("is_active", e.target.checked)}
                    className="accent-navy h-4 w-4"
                  />
                  <span className="text-sm text-navy">
                    {values.is_active ? "Visible to customers" : "Hidden — draft only"}
                  </span>
                </label>
              </FieldRow>
            </Section>

            {(visible.eyebrow || visible.title || visible.subtitle || visible.body) && (
              <Section title="Content">
                {visible.eyebrow && (
                  <FieldRow
                    label="Eyebrow"
                    hint="Small label rendered above the headline."
                    error={errors.eyebrow?.[0]}
                  >
                    <input
                      type="text"
                      value={values.eyebrow}
                      onChange={(e) => set("eyebrow", e.target.value)}
                      placeholder="/03 · The Edit"
                      className={inputCls}
                    />
                  </FieldRow>
                )}
                {visible.title && (
                  <FieldRow
                    label="Headline"
                    hint={PER_KIND_TITLE_HELP[values.kind]}
                    error={errors.title?.[0]}
                  >
                    <input
                      type="text"
                      value={values.title}
                      onChange={(e) => set("title", e.target.value)}
                      className={inputCls}
                    />
                  </FieldRow>
                )}
                {visible.subtitle && (
                  <FieldRow
                    label="Subtitle"
                    hint={PER_KIND_SUBTITLE_HELP[values.kind]}
                    error={errors.subtitle?.[0]}
                  >
                    <input
                      type="text"
                      value={values.subtitle}
                      onChange={(e) => set("subtitle", e.target.value)}
                      className={inputCls}
                    />
                  </FieldRow>
                )}
                {visible.body && (
                  <FieldRow
                    label="Body"
                    hint={PER_KIND_BODY_HELP[values.kind]}
                    error={errors.body?.[0]}
                  >
                    <textarea
                      value={values.body}
                      onChange={(e) => set("body", e.target.value)}
                      rows={values.kind === "manifesto" ? 6 : 4}
                      className={`${inputCls} h-auto py-2 leading-relaxed`}
                    />
                  </FieldRow>
                )}
              </Section>
            )}

            {(visible.image || visible.secondary_image) && (
              <Section title="Imagery">
                {visible.image && (
                  <FieldRow label="Primary image" error={errors.image?.[0]}>
                    <ImagePicker
                      value={values.image}
                      onChange={(v) => set("image", v)}
                    />
                  </FieldRow>
                )}
                {visible.secondary_image && (
                  <FieldRow label="Secondary image" error={errors.secondary_image?.[0]}>
                    <ImagePicker
                      value={values.secondary_image}
                      onChange={(v) => set("secondary_image", v)}
                    />
                  </FieldRow>
                )}
              </Section>
            )}

            {(visible.cta_label || visible.cta_href || visible.text_color) && (
              <Section title="Call to action">
                <div className="grid grid-cols-2 gap-3">
                  {visible.cta_label && (
                    <FieldRow
                      label="Button label"
                      hint="Leave empty to hide the button."
                      error={errors.cta_label?.[0]}
                    >
                      <input
                        type="text"
                        value={values.cta_label}
                        onChange={(e) => set("cta_label", e.target.value)}
                        placeholder="Shop the collection"
                        className={inputCls}
                      />
                    </FieldRow>
                  )}
                  {visible.cta_href && (
                    <FieldRow label="Button link" error={errors.cta_href?.[0]}>
                      <input
                        type="text"
                        value={values.cta_href}
                        onChange={(e) => set("cta_href", e.target.value)}
                        placeholder="/products"
                        className={inputCls}
                      />
                    </FieldRow>
                  )}
                </div>
                {visible.text_color && (
                  <FieldRow
                    label="Text color override"
                    hint="Only needed if the default cream/navy doesn't sit well on your image."
                    error={errors.text_color?.[0]}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={values.text_color || "#FAF7F1"}
                        onChange={(e) => set("text_color", e.target.value)}
                        className="h-10 w-12 rounded-md border border-[var(--jmn-line)] cursor-pointer"
                      />
                      <input
                        type="text"
                        value={values.text_color}
                        onChange={(e) => set("text_color", e.target.value)}
                        placeholder="#FAF7F1"
                        className={inputCls}
                      />
                      {values.text_color && (
                        <button
                          type="button"
                          onClick={() => set("text_color", "")}
                          className="text-[11px] tracking-[0.18em] uppercase text-ink/55 hover:text-rose-700 px-2"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </FieldRow>
                )}
              </Section>
            )}

            {(visible.linked_collection || visible.linked_lookbook) && (
              <Section title="Links">
                {visible.linked_collection && (
                  <FieldRow
                    label="Linked collection"
                    hint="When set, the CTA can deep-link straight to this collection."
                    error={errors.linked_collection?.[0]}
                  >
                    <select
                      value={values.linked_collection ?? ""}
                      onChange={(e) =>
                        set("linked_collection", e.target.value || null)
                      }
                      className={inputCls}
                    >
                      <option value="">— None —</option>
                      {collections.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </FieldRow>
                )}
                {visible.linked_lookbook && (
                  <FieldRow
                    label="Linked lookbook"
                    error={errors.linked_lookbook?.[0]}
                  >
                    <select
                      value={values.linked_lookbook ?? ""}
                      onChange={(e) =>
                        set("linked_lookbook", e.target.value || null)
                      }
                      className={inputCls}
                    >
                      <option value="">— None —</option>
                      {lookbooks.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </FieldRow>
                )}
              </Section>
            )}

            {globalError && (
              <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
                {globalError}
              </p>
            )}
          </div>

          {/* ── Right: live preview ──────────────────────────── */}
          <div className="overflow-y-auto bg-[#FAFAF9] px-6 py-5">
            <div className="sticky top-0 -mt-5 -mx-6 px-6 py-4 mb-4 bg-[#FAFAF9]/95 backdrop-blur-sm border-b border-[var(--jmn-line)] flex items-center justify-between">
              <p className="text-[11px] tracking-[0.3em] uppercase text-ink/55">
                Live preview
              </p>
              <span className="text-[10px] text-ink/40">updates as you type</span>
            </div>
            <HomeBlockPreview block={draft} />
            <p className="mt-4 text-[11px] text-ink/45 leading-relaxed">
              This is a scaled representation of how this block will look on
              the storefront. The real page uses your full theme — animations,
              fonts, and grid included.
            </p>
          </div>
        </div>

        <footer className="px-6 py-4 border-t border-[var(--jmn-line)] flex justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-md border border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-ink/65 hover:text-navy hover:border-navy/30 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-9 px-4 rounded-md bg-navy text-cream text-[12px] tracking-[0.1em] uppercase hover:bg-navy-deep disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {submitting && <Loader2 size={13} className="animate-spin" />}
            {mode === "edit" ? "Save changes" : "Create block"}
          </button>
        </footer>
      </form>
    </div>
  );
}

// ─── Layout primitives ──────────────────────────────────────────────────────

const inputCls =
  "w-full bg-white border border-[var(--jmn-line)] rounded-md px-3 h-10 text-sm text-navy placeholder:text-ink/40 focus:border-navy/40 outline-none transition-colors";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[10px] tracking-[0.3em] uppercase text-ink/45 border-b border-[var(--jmn-line)] pb-2">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function FieldRow({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] tracking-[0.2em] uppercase text-ink/55 mb-1.5">
        {label}
      </span>
      {children}
      {hint && !error && (
        <span className="block mt-1 text-[11px] text-ink/45 leading-relaxed">{hint}</span>
      )}
      {error && (
        <span className="block mt-1 text-[11px] text-rose-700">{error}</span>
      )}
    </label>
  );
}

// ─── Image input (URL + upload) ─────────────────────────────────────────────

function ImagePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const res = await djangoAdmin.uploads.create(file);
      onChange(res.url);
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… or upload below"
          className={inputCls}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="h-10 px-3 rounded-md border border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-navy hover:bg-navy hover:text-cream transition-colors flex items-center gap-2 shrink-0 disabled:opacity-50"
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          Upload
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="h-10 px-3 rounded-md border border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-ink/55 hover:text-rose-700 transition-colors flex items-center gap-1 shrink-0"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
        className="hidden"
      />
      <div className="relative aspect-[16/9] w-full max-w-md rounded-md overflow-hidden bg-[#F4F5F7] border border-[var(--jmn-line)]">
        {value ? (
          <Image src={value} alt="" fill className="object-cover" sizes="600px" unoptimized />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-ink/35 text-[11px] tracking-[0.2em] uppercase">
            <ImageOff size={20} className="mb-1" />
            No image
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 grid place-items-center bg-white/70">
            <Loader2 size={20} className="animate-spin text-navy" />
          </div>
        )}
      </div>
      {uploadError && (
        <p className="text-[11px] text-rose-700">{uploadError}</p>
      )}
    </div>
  );
}

// ─── Defaults ───────────────────────────────────────────────────────────────

function seed(initial: Partial<HomeBlockEditorValues>): HomeBlockEditorValues {
  return {
    id: initial.id,
    kind: initial.kind ?? "hero",
    name: initial.name ?? "",
    eyebrow: initial.eyebrow ?? "",
    title: initial.title ?? "",
    subtitle: initial.subtitle ?? "",
    body: initial.body ?? "",
    image: initial.image ?? "",
    secondary_image: initial.secondary_image ?? "",
    cta_label: initial.cta_label ?? "",
    cta_href: initial.cta_href ?? "",
    text_color: initial.text_color ?? "",
    linked_collection: initial.linked_collection ?? null,
    linked_lookbook: initial.linked_lookbook ?? null,
    featured_products: initial.featured_products ?? [],
    featured_categories: initial.featured_categories ?? [],
    is_active: initial.is_active ?? true,
    order: initial.order ?? 0,
    metadata: initial.metadata ?? {},
  };
}
