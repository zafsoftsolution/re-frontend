"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  ImageOff,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { djangoAdmin } from "@/lib/django-admin";
import { useToast } from "@/context/FeedbackContext";
import { cn } from "@/lib/utils";

export type FormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "url"
  | "slug"
  | "date"
  | "datetime"
  | "email"
  | "password"
  | "tags" // comma-separated → string[] (legacy; chips below is nicer)
  | "chips" // chip-based tag editor → string[]
  | "json" // raw JSON textarea (escape hatch)
  | "color" // hex color picker
  | "imageUrl" // string — single image URL with paste / upload / preview
  | "imageList" // string[] — list of URLs with thumbnails
  | "stringList" // string[] — list of plain text rows
  | "keyValue" // Record<string, string> — repeating key/value pairs
  | "colorVariants" // [{name, hex, image, order}]
  | "sizeVariants"; // [{label, order}]

export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  rows?: number;
  hint?: string;
  full?: boolean;
  readOnlyOnEdit?: boolean;
  /**
   * Auto-fill from another field's value as the user types.
   * Stops once the user manually edits this field.
   *
   *   { name: "slug", autoFrom: "name" }
   *   { name: "sku",  autoFrom: "name", autoDerive: "sku" }
   *
   * Default transform is `"slug"` — kebab-case ASCII-safe text. SKU generates
   * once when the source first becomes non-empty (so it doesn't shuffle on
   * every keystroke).
   */
  autoFrom?: string;
  autoDerive?: "slug" | "sku";
}

interface Props {
  title: string;
  fields: FormField[];
  initialValues?: Record<string, unknown>;
  mode: "create" | "edit";
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  /**
   * Stable identifier for this form instance — used to persist a draft of
   * the user's typed values to localStorage so a refresh restores them and
   * an accidental backdrop click can't lose work. Pass the same key for
   * the same logical edit session (e.g. `"product:edit:abc-123"` or
   * `"product:create"`). Omit to disable persistence.
   */
  draftKey?: string;
}

interface DraftPayload {
  mode: "create" | "edit";
  values: Record<string, unknown>;
  touched: Record<string, boolean>;
  ts: number;
}

const DRAFT_PREFIX = "jmn:draft:";
/** Drafts older than this are ignored on restore so stale data doesn't haunt forever. */
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function readDraft(key: string | undefined): DraftPayload | null {
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftPayload;
    if (!parsed || typeof parsed !== "object") return null;
    if (Date.now() - parsed.ts > DRAFT_TTL_MS) {
      localStorage.removeItem(DRAFT_PREFIX + key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeDraft(key: string | undefined, payload: DraftPayload): void {
  if (!key || typeof window === "undefined") return;
  try {
    localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify(payload));
  } catch {
    /* quota / private mode — best-effort */
  }
}

function clearDraft(key: string | undefined): void {
  if (!key || typeof window === "undefined") return;
  try {
    localStorage.removeItem(DRAFT_PREFIX + key);
  } catch {
    /* ignore */
  }
}

/**
 * Quick check: is there a saved draft for this key? ResourceManager uses
 * this to decide whether to auto-reopen the modal on mount.
 */
export function hasDraft(key: string): boolean {
  return readDraft(key) !== null;
}

export default function ResourceForm({
  title,
  fields,
  initialValues,
  mode,
  onClose,
  onSubmit,
  draftKey,
}: Props) {
  // Hydrate from a previously-saved draft if one exists, otherwise from
  // initialValues. This is the bit that makes a refresh non-destructive.
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const draft = readDraft(draftKey);
    if (draft && draft.mode === mode) return draft.values;
    return seed(fields, initialValues);
  });
  // Tracks which fields the user has manually edited. Used so auto-derived
  // fields (slug, sku) stop following their source once the user takes over.
  const [touched, setTouched] = useState<Record<string, boolean>>(() => {
    const draft = readDraft(draftKey);
    if (draft && draft.mode === mode) return draft.touched ?? {};
    return initialTouched(fields, initialValues);
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  // State (not a ref) because the header renders it.
  const [restoredFromDraft, setRestoredFromDraft] = useState<boolean>(
    () => !!draftKey && readDraft(draftKey) !== null,
  );
  const toast = useToast();

  // Persist the draft whenever the user types. We write on every change —
  // it's a single localStorage call and the form state is small.
  useEffect(() => {
    if (!draftKey) return;
    writeDraft(draftKey, { mode, values, touched, ts: Date.now() });
  }, [draftKey, mode, values, touched]);

  // Make sure a freshly-opened form (no prior draft) writes an empty draft
  // immediately. ResourceManager uses presence-of-draft as the signal to
  // re-open the modal on refresh.
  useEffect(() => {
    if (!draftKey) return;
    if (readDraft(draftKey) === null) {
      writeDraft(draftKey, { mode, values, touched, ts: Date.now() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function reset() {
    setValues(seed(fields, initialValues));
    setTouched(initialTouched(fields, initialValues));
    setErrors({});
    setGlobalError(null);
    clearDraft(draftKey);
    setRestoredFromDraft(false);
    // Re-write an empty marker so refresh still re-opens the modal.
    if (draftKey) {
      writeDraft(draftKey, {
        mode,
        values: seed(fields, initialValues),
        touched: initialTouched(fields, initialValues),
        ts: Date.now(),
      });
    }
  }

  function handleClose() {
    // Explicit close = user is done with this form. Drop the draft so a
    // refresh after closing doesn't re-open the modal.
    clearDraft(draftKey);
    onClose();
  }

  function set(name: string, value: unknown) {
    setTouched((t) => ({ ...t, [name]: true }));
    setValues((v) => {
      const next: Record<string, unknown> = { ...v, [name]: value };
      // Cascade: any field that derives from `name` and hasn't been edited
      // by the user picks up the fresh value.
      for (const f of fields) {
        if (f.autoFrom !== name) continue;
        if (touched[f.name]) continue;
        if (f.autoDerive === "sku") {
          // SKU only generates the first time — once it has a value it stays
          // until the user clears or edits it.
          if (!next[f.name]) {
            const derived = deriveSku(String(value ?? ""));
            if (derived) next[f.name] = derived;
          }
        } else {
          // Default: slug. Re-derive on every keystroke until user touches it.
          next[f.name] = deriveSlug(String(value ?? ""));
        }
      }
      return next;
    });
  }

  /** Required-field check: returns labels of empty required fields. */
  function findMissingRequired(): string[] {
    const out: string[] = [];
    for (const f of fields) {
      if (!f.required) continue;
      const v = values[f.name];
      const empty =
        v === undefined ||
        v === null ||
        v === "" ||
        (Array.isArray(v) && v.length === 0);
      if (empty) out.push(f.label);
    }
    return out;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError(null);

    // Client-side check first — surface every missing required field at once
    // via toast + inline highlight rather than letting the browser pop its
    // own validation tooltip on the first offending input.
    const missing = findMissingRequired();
    if (missing.length > 0) {
      const fieldErrors: Record<string, string[]> = {};
      for (const f of fields) {
        if (f.required) {
          const v = values[f.name];
          const isEmpty =
            v === undefined ||
            v === null ||
            v === "" ||
            (Array.isArray(v) && v.length === 0);
          if (isEmpty) fieldErrors[f.name] = ["Required"];
        }
      }
      setErrors(fieldErrors);
      toast.error(
        missing.length === 1
          ? `${missing[0]} is required`
          : `Please fill in: ${missing.join(", ")}`,
      );
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const cleaned = clean(fields, values);
      await onSubmit(cleaned);
      toast.success(
        mode === "edit" ? `${title} updated` : `${title} created`,
      );
      // Successful save = the user is committed; the parent will close us.
      // Drop the draft so a refresh after this doesn't reopen the modal.
      clearDraft(draftKey);
    } catch (e) {
      const err = e as Error & { fields?: Record<string, string[]> };
      if (err.fields && Object.keys(err.fields).length) {
        setErrors(err.fields);
        // Surface the first field error in the toast so the user sees
        // something even if the broken field scrolled out of view.
        const firstKey = Object.keys(err.fields)[0];
        const firstMsg = err.fields[firstKey]?.[0] ?? "Please check your inputs";
        const fieldLabel =
          fields.find((f) => f.name === firstKey)?.label ?? firstKey;
        toast.error(
          `Couldn't ${mode === "edit" ? "save" : "create"}`,
          `${fieldLabel}: ${firstMsg}`,
        );
      } else {
        const msg = err.message || "Please try again.";
        setGlobalError(msg);
        toast.error(
          `Couldn't ${mode === "edit" ? "save" : "create"} ${title}`,
          msg,
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      // Backdrop click does NOT close the modal — explicit X / Cancel /
      // Reset only. Prevents accidental loss of typed data.
      className="fixed inset-0 z-[80] bg-navy/40 backdrop-blur-sm flex justify-end"
    >
      <form
        onSubmit={submit}
        // We do our own required-field validation and surface it via toast
        // + inline error rather than letting the browser pop its native
        // tooltip on the first offending input.
        noValidate
        className="bg-white w-full max-w-2xl h-full overflow-hidden flex flex-col shadow-2xl shadow-navy/20 jmn-drawer-in"
      >
        <header className="px-6 py-5 border-b border-[var(--jmn-line)] flex items-center justify-between shrink-0">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-gold mb-1">
              {mode === "edit" ? "Edit" : "New"}
              {restoredFromDraft && (
                <span className="ml-2 text-amber-700 font-medium">
                  · Draft restored
                </span>
              )}
            </p>
            <h2 className="font-display text-2xl text-navy">{title}</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="h-9 w-9 grid place-items-center rounded-md hover:bg-[#F4F5F7] transition-colors"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((f) => (
              <Field
                key={f.name}
                field={f}
                mode={mode}
                value={values[f.name]}
                onChange={(v) => set(f.name, v)}
                error={errors[f.name]?.[0]}
              />
            ))}
          </div>
          {globalError && (
            <p className="mt-4 text-sm text-rose-700">{globalError}</p>
          )}
          {errors._ && errors._[0] && (
            <p className="mt-4 text-sm text-rose-700">{errors._[0]}</p>
          )}
        </div>

        <footer className="px-6 py-4 border-t border-[var(--jmn-line)] flex justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={reset}
            title="Clear typed values and drop the saved draft"
            className="h-9 px-3 rounded-md text-[11px] tracking-[0.18em] uppercase text-ink/55 hover:text-rose-700 hover:bg-rose-50 transition-colors inline-flex items-center gap-1.5"
          >
            <RotateCcw size={12} />
            Reset
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
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
              {mode === "edit" ? "Save changes" : "Create"}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

// ─── Field router ────────────────────────────────────────────────────────────

function Field({
  field,
  mode,
  value,
  onChange,
  error,
}: {
  field: FormField;
  mode: "create" | "edit";
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
}) {
  const readOnly = mode === "edit" && field.readOnlyOnEdit;
  const wrapClass = field.full || isWideType(field.type) ? "sm:col-span-2" : "";
  const baseInput =
    "w-full bg-white border border-[var(--jmn-line)] rounded-md px-3 h-10 text-sm text-navy placeholder:text-ink/40 focus:border-navy/40 outline-none transition-colors disabled:bg-[#F4F5F7] disabled:text-ink/55";

  let body: React.ReactNode;

  if (field.type === "boolean") {
    body = (
      <label className="inline-flex items-center gap-2 h-10 px-3 rounded-md border border-[var(--jmn-line)] cursor-pointer bg-white">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          disabled={readOnly}
          className="accent-navy h-4 w-4"
        />
        <span className="text-sm text-navy">{field.placeholder ?? "Yes"}</span>
      </label>
    );
  } else if (field.type === "textarea" || field.type === "json") {
    body = (
      <textarea
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        rows={field.rows ?? (field.type === "json" ? 6 : 4)}
        required={field.required}
        readOnly={readOnly}
        placeholder={field.placeholder}
        className="w-full bg-white border border-[var(--jmn-line)] rounded-md p-3 text-sm text-navy placeholder:text-ink/40 focus:border-navy/40 outline-none transition-colors"
        style={
          field.type === "json"
            ? { fontFamily: "ui-monospace, monospace" }
            : undefined
        }
      />
    );
  } else if (field.type === "select") {
    body = (
      <select
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
        disabled={readOnly}
        className={baseInput}
      >
        <option value="">— select —</option>
        {field.options?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  } else if (field.type === "color") {
    body = (
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={(value as string) || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          className="h-10 w-12 rounded-md border border-[var(--jmn-line)] cursor-pointer"
        />
        <input
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#0E1A3A"
          disabled={readOnly}
          className={baseInput}
        />
      </div>
    );
  } else if (field.type === "tags") {
    body = (
      <input
        type="text"
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder ?? "comma, separated, values"}
        disabled={readOnly}
        className={baseInput}
      />
    );
  } else if (field.type === "imageUrl") {
    body = (
      <ImageUrlInput
        value={typeof value === "string" ? value : ""}
        onChange={(v) => onChange(v)}
        disabled={readOnly}
        placeholder={field.placeholder}
      />
    );
  } else if (field.type === "chips") {
    body = (
      <ChipsInput
        value={normaliseStringArray(value)}
        onChange={(v) => onChange(v)}
        placeholder={field.placeholder ?? "Type and press Enter"}
        disabled={readOnly}
      />
    );
  } else if (field.type === "imageList") {
    body = (
      <ImageListInput
        value={normaliseStringArray(value)}
        onChange={(v) => onChange(v)}
        disabled={readOnly}
      />
    );
  } else if (field.type === "stringList") {
    body = (
      <StringListInput
        value={normaliseStringArray(value)}
        onChange={(v) => onChange(v)}
        placeholder={field.placeholder}
        disabled={readOnly}
      />
    );
  } else if (field.type === "keyValue") {
    body = (
      <KeyValueInput
        value={normaliseDict(value)}
        onChange={(v) => onChange(v)}
        disabled={readOnly}
      />
    );
  } else if (field.type === "colorVariants") {
    body = (
      <ColorVariantsInput
        value={normaliseColorVariants(value)}
        onChange={(v) => onChange(v)}
        disabled={readOnly}
      />
    );
  } else if (field.type === "sizeVariants") {
    body = (
      <SizeVariantsInput
        value={normaliseSizeVariants(value)}
        onChange={(v) => onChange(v)}
        disabled={readOnly}
      />
    );
  } else {
    body = (
      <input
        type={htmlType(field.type)}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
        readOnly={readOnly}
        placeholder={field.placeholder}
        className={baseInput}
        step={field.type === "number" ? "any" : undefined}
      />
    );
  }

  return (
    <label className={`block ${wrapClass}`}>
      <span className="block text-[11px] tracking-[0.2em] uppercase text-ink/55 mb-1.5">
        {field.label}
        {field.required && <span className="text-rose-700"> *</span>}
      </span>
      {body}
      {field.hint && !error && (
        <span className="block mt-1 text-[11px] text-ink/45">{field.hint}</span>
      )}
      {error && (
        <span className="block mt-1 text-[11px] text-rose-700">{error}</span>
      )}
    </label>
  );
}

// ─── Chips ───────────────────────────────────────────────────────────────────

function ChipsInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const v = draft.trim();
    if (!v) return;
    if (!value.includes(v)) onChange([...value, v]);
    setDraft("");
  }

  return (
    <div className="border border-[var(--jmn-line)] rounded-md px-2 py-2 bg-white flex flex-wrap items-center gap-1.5 focus-within:border-navy/40">
      {value.map((tag, i) => (
        <span
          key={tag + i}
          className="inline-flex items-center gap-1 rounded-full bg-navy/5 px-2.5 py-1 text-[11px] tracking-[0.1em] uppercase text-navy"
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              className="text-ink/45 hover:text-rose-700 transition-colors"
              aria-label={`Remove ${tag}`}
            >
              <X size={10} />
            </button>
          )}
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder={value.length ? "" : placeholder}
        disabled={disabled}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm py-1 px-1"
      />
    </div>
  );
}

// ─── Single image (URL or upload) ────────────────────────────────────────────

function ImageUrlInput({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const { url } = await djangoAdmin.uploads.create(file);
      onChange(url);
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  return (
    <div
      className={cn(
        "rounded-md border bg-white transition-colors",
        dragOver
          ? "border-navy/40 bg-navy/5"
          : "border-[var(--jmn-line)]",
      )}
      onDragEnter={() => !disabled && setDragOver(true)}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div className="flex items-stretch gap-2 p-2">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-bone grid place-items-center">
          {value ? (
            <Image
              src={value}
              alt=""
              width={48}
              height={48}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <ImageOff size={14} className="text-ink/30" />
          )}
        </div>
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "https://…/image.jpg or drop a file"}
          disabled={disabled}
          className="flex-1 bg-transparent border border-[var(--jmn-line)] rounded h-10 px-2 text-sm text-navy focus:border-navy/40 outline-none"
        />
        {!disabled && (
          <>
            <input
              ref={fileRef}
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="h-10 px-3 rounded-md border border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-ink/65 hover:text-navy hover:border-navy/30 disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0"
              aria-label="Upload image"
            >
              {uploading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Upload size={12} />
              )}
              Upload
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="h-10 w-10 grid place-items-center rounded-md text-rose-700 hover:bg-rose-50 transition-colors shrink-0"
                aria-label="Clear image"
              >
                <Trash2 size={13} />
              </button>
            )}
          </>
        )}
      </div>
      {uploadError && (
        <p className="px-3 pb-2 text-[11px] text-rose-700">{uploadError}</p>
      )}
    </div>
  );
}

// ─── Image list ──────────────────────────────────────────────────────────────

function ImageListInput({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function update(i: number, url: string) {
    const next = [...value];
    next[i] = url;
    onChange(next);
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  async function handleFiles(fileList: FileList | File[] | null) {
    if (!fileList) return;
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const uploaded: string[] = [];
      for (const f of files) {
        const { url } = await djangoAdmin.uploads.create(f);
        uploaded.push(url);
      }
      onChange([...value, ...uploaded]);
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  }

  return (
    <div
      className="space-y-2"
      onDragEnter={() => !disabled && setDragOver(true)}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      {value.length === 0 && (
        <div
          className={`grid place-items-center text-center px-4 py-8 rounded-md border-2 border-dashed transition-colors ${
            dragOver ? "border-navy/60 bg-navy/5" : "border-[var(--jmn-line)]"
          }`}
        >
          <Upload size={20} className="text-ink/35 mb-2" />
          <p className="text-sm text-ink/65">
            Drag images here or use the buttons below
          </p>
          <p className="text-[11px] text-ink/45 mt-0.5">
            First image becomes the cover.
          </p>
        </div>
      )}

      {value.map((url, i) => (
        <div
          key={i}
          className="flex items-center gap-2 bg-white border border-[var(--jmn-line)] rounded-md p-2"
        >
          <span className="text-ink/30 cursor-grab" aria-hidden>
            <GripVertical size={14} />
          </span>
          <div className="h-12 w-10 shrink-0 overflow-hidden rounded bg-bone grid place-items-center">
            {url ? (
              <Image
                src={url}
                alt=""
                width={40}
                height={48}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <ImageOff size={14} className="text-ink/30" />
            )}
          </div>
          <input
            type="url"
            value={url}
            onChange={(e) => update(i, e.target.value)}
            placeholder="https://…/image.jpg"
            disabled={disabled}
            className="flex-1 bg-transparent border border-[var(--jmn-line)] rounded h-9 px-2 text-sm text-navy focus:border-navy/40 outline-none"
          />
          <RowControls
            disabled={disabled}
            canUp={i > 0}
            canDown={i < value.length - 1}
            onUp={() => move(i, -1)}
            onDown={() => move(i, 1)}
            onRemove={() => remove(i)}
          />
        </div>
      ))}

      {!disabled && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-9 px-3 rounded-md bg-navy text-cream text-[11px] tracking-[0.18em] uppercase hover:bg-navy-deep disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {uploading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Upload size={13} />
              )}
              {uploading ? "Uploading…" : "Upload from device"}
            </button>
            <button
              type="button"
              onClick={() => onChange([...value, ""])}
              className="h-9 px-3 rounded-md border border-dashed border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-ink/65 hover:text-navy hover:border-navy/30 transition-colors flex items-center gap-2"
            >
              <Plus size={13} /> Add by URL
            </button>
          </div>
        </>
      )}

      {uploadError && (
        <p className="text-sm text-rose-700 mt-1">{uploadError}</p>
      )}
    </div>
  );
}

// ─── String list ─────────────────────────────────────────────────────────────

function StringListInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  function update(i: number, v: string) {
    const next = [...value];
    next[i] = v;
    onChange(next);
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {value.map((v, i) => (
        <div
          key={i}
          className="flex items-center gap-2 bg-white border border-[var(--jmn-line)] rounded-md p-1.5"
        >
          <span className="text-ink/30 px-1" aria-hidden>
            <GripVertical size={14} />
          </span>
          <input
            value={v}
            onChange={(e) => update(i, e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 bg-transparent h-9 px-2 text-sm text-navy outline-none"
          />
          <RowControls
            disabled={disabled}
            canUp={i > 0}
            canDown={i < value.length - 1}
            onUp={() => move(i, -1)}
            onDown={() => move(i, 1)}
            onRemove={() => remove(i)}
          />
        </div>
      ))}
      {!disabled && (
        <button
          type="button"
          onClick={() => onChange([...value, ""])}
          className="h-9 px-3 rounded-md border border-dashed border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-ink/65 hover:text-navy hover:border-navy/30 transition-colors flex items-center gap-2"
        >
          <Plus size={13} /> Add row
        </button>
      )}
    </div>
  );
}

// ─── Key/value (specifications etc.) ─────────────────────────────────────────

function KeyValueInput({
  value,
  onChange,
  disabled,
}: {
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  disabled?: boolean;
}) {
  // Maintain an ordered array of pairs while editing so adding "" keys doesn't
  // immediately collapse.
  const [pairs, setPairs] = useState<Array<[string, string]>>(() =>
    Object.entries(value),
  );

  function emit(next: Array<[string, string]>) {
    setPairs(next);
    const dict: Record<string, string> = {};
    for (const [k, v] of next) {
      if (k.trim()) dict[k.trim()] = v;
    }
    onChange(dict);
  }

  function update(i: number, k: string, v: string) {
    const next = [...pairs];
    next[i] = [k, v];
    emit(next);
  }
  function remove(i: number) {
    emit(pairs.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      {pairs.map((pair, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_1.4fr_auto] items-center gap-2 bg-white border border-[var(--jmn-line)] rounded-md p-1.5"
        >
          <input
            value={pair[0]}
            onChange={(e) => update(i, e.target.value, pair[1])}
            placeholder="key"
            disabled={disabled}
            className="bg-transparent h-9 px-2 text-sm text-navy outline-none"
          />
          <input
            value={pair[1]}
            onChange={(e) => update(i, pair[0], e.target.value)}
            placeholder="value"
            disabled={disabled}
            className="bg-transparent h-9 px-2 text-sm text-navy outline-none border-l border-[var(--jmn-line)]"
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => remove(i)}
              className="h-8 w-8 grid place-items-center rounded text-rose-700 hover:bg-rose-50 transition-colors"
              aria-label="Remove"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <button
          type="button"
          onClick={() => emit([...pairs, ["", ""]])}
          className="h-9 px-3 rounded-md border border-dashed border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-ink/65 hover:text-navy hover:border-navy/30 transition-colors flex items-center gap-2"
        >
          <Plus size={13} /> Add row
        </button>
      )}
    </div>
  );
}

// ─── Color variants ──────────────────────────────────────────────────────────

interface ColorVariant {
  name: string;
  hex: string;
  image?: string;
  order?: number;
}

function ColorVariantsInput({
  value,
  onChange,
  disabled,
}: {
  value: ColorVariant[];
  onChange: (v: ColorVariant[]) => void;
  disabled?: boolean;
}) {
  function update(i: number, patch: Partial<ColorVariant>) {
    const next = [...value];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {value.map((c, i) => (
        <ColorVariantRow
          key={i}
          color={c}
          disabled={disabled}
          canUp={i > 0}
          canDown={i < value.length - 1}
          onUpdate={(patch) => update(i, patch)}
          onRemove={() => remove(i)}
          onUp={() => move(i, -1)}
          onDown={() => move(i, 1)}
        />
      ))}
      {!disabled && (
        <button
          type="button"
          onClick={() => onChange([...value, { name: "", hex: "#000000" }])}
          className="h-9 px-3 rounded-md border border-dashed border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-ink/65 hover:text-navy hover:border-navy/30 transition-colors flex items-center gap-2"
        >
          <Plus size={13} /> Add color
        </button>
      )}
    </div>
  );
}

function ColorVariantRow({
  color,
  disabled,
  canUp,
  canDown,
  onUpdate,
  onRemove,
  onUp,
  onDown,
}: {
  color: ColorVariant;
  disabled?: boolean;
  canUp: boolean;
  canDown: boolean;
  onUpdate: (patch: Partial<ColorVariant>) => void;
  onRemove: () => void;
  onUp: () => void;
  onDown: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const { url } = await djangoAdmin.uploads.create(file);
      onUpdate({ image: url });
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="bg-white border border-[var(--jmn-line)] rounded-md p-3 space-y-2">
      <div className="flex items-start gap-2">
        <input
          type="color"
          value={color.hex || "#000000"}
          onChange={(e) => onUpdate({ hex: e.target.value })}
          disabled={disabled}
          className="h-10 w-12 rounded-md border border-[var(--jmn-line)] cursor-pointer shrink-0"
        />
        <div className="flex-1 grid grid-cols-2 gap-2">
          <input
            value={color.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Color name (e.g. Ink Black)"
            disabled={disabled}
            className="bg-transparent border border-[var(--jmn-line)] rounded h-9 px-2 text-sm text-navy focus:border-navy/40 outline-none"
          />
          <input
            value={color.hex}
            onChange={(e) => onUpdate({ hex: e.target.value })}
            placeholder="#0A0A0A"
            disabled={disabled}
            className="bg-transparent border border-[var(--jmn-line)] rounded h-9 px-2 text-sm text-navy focus:border-navy/40 outline-none tabular"
          />
        </div>
        <RowControls
          disabled={disabled}
          canUp={canUp}
          canDown={canDown}
          onUp={onUp}
          onDown={onDown}
          onRemove={onRemove}
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded bg-bone grid place-items-center">
          {color.image ? (
            <Image
              src={color.image}
              alt=""
              width={36}
              height={36}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <ImageOff size={12} className="text-ink/30" />
          )}
        </div>
        <input
          type="url"
          value={color.image ?? ""}
          onChange={(e) => onUpdate({ image: e.target.value })}
          placeholder="Color-specific image URL (optional)"
          disabled={disabled}
          className="flex-1 bg-transparent border border-[var(--jmn-line)] rounded h-9 px-2 text-sm text-navy focus:border-navy/40 outline-none"
        />
        {!disabled && (
          <>
            <input
              ref={fileRef}
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="h-9 px-3 rounded-md border border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-ink/65 hover:text-navy hover:border-navy/30 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              aria-label="Upload color image"
            >
              {uploading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Upload size={12} />
              )}
              Upload
            </button>
          </>
        )}
      </div>

      {uploadError && (
        <p className="text-[11px] text-rose-700">{uploadError}</p>
      )}
    </div>
  );
}

// ─── Size variants ───────────────────────────────────────────────────────────

interface SizeVariant {
  label: string;
  order?: number;
}

const SIZE_PRESETS: Record<string, string[]> = {
  Apparel: ["XS", "S", "M", "L", "XL", "XXL"],
  Trousers: ["28", "30", "32", "34", "36", "38"],
  "One size": ["ONE"],
};

function SizeVariantsInput({
  value,
  onChange,
  disabled,
}: {
  value: SizeVariant[];
  onChange: (v: SizeVariant[]) => void;
  disabled?: boolean;
}) {
  function update(i: number, patch: Partial<SizeVariant>) {
    const next = [...value];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  function applyPreset(labels: string[]) {
    onChange(labels.map((label, i) => ({ label, order: i })));
  }

  return (
    <div className="space-y-2">
      {value.length === 0 && !disabled && (
        <div className="flex flex-wrap items-center gap-2 px-1 mb-1">
          <span className="text-[11px] tracking-[0.18em] uppercase text-ink/55">
            Quick fill:
          </span>
          {Object.entries(SIZE_PRESETS).map(([name, labels]) => (
            <button
              key={name}
              type="button"
              onClick={() => applyPreset(labels)}
              className="text-[11px] tracking-[0.1em] uppercase px-2.5 py-1 rounded-full bg-navy/5 text-navy hover:bg-navy/10 transition-colors"
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {value.map((s, i) => (
        <div
          key={i}
          className="flex items-center gap-2 bg-white border border-[var(--jmn-line)] rounded-md p-1.5"
        >
          <span className="w-7 text-center text-[10px] tracking-[0.18em] uppercase text-ink/40 tabular">
            {String(i + 1).padStart(2, "0")}
          </span>
          <input
            value={s.label}
            onChange={(e) => update(i, { label: e.target.value })}
            placeholder="Size label (e.g. M, 32, ONE)"
            disabled={disabled}
            className="flex-1 bg-transparent h-9 px-2 text-sm text-navy outline-none"
          />
          <RowControls
            disabled={disabled}
            canUp={i > 0}
            canDown={i < value.length - 1}
            onUp={() => move(i, -1)}
            onDown={() => move(i, 1)}
            onRemove={() => remove(i)}
          />
        </div>
      ))}

      {!disabled && (
        <button
          type="button"
          onClick={() => onChange([...value, { label: "", order: value.length }])}
          className="h-9 px-3 rounded-md border border-dashed border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-ink/65 hover:text-navy hover:border-navy/30 transition-colors flex items-center gap-2"
        >
          <Plus size={13} /> Add size
        </button>
      )}
    </div>
  );
}

// ─── Row controls (up / down / remove) ───────────────────────────────────────

function RowControls({
  disabled,
  canUp,
  canDown,
  onUp,
  onDown,
  onRemove,
}: {
  disabled?: boolean;
  canUp: boolean;
  canDown: boolean;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  if (disabled) return null;
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <button
        type="button"
        onClick={onUp}
        disabled={!canUp}
        className="h-8 w-7 grid place-items-center rounded text-ink/55 hover:text-navy hover:bg-[#F4F5F7] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        aria-label="Move up"
      >
        <ChevronUp size={14} />
      </button>
      <button
        type="button"
        onClick={onDown}
        disabled={!canDown}
        className="h-8 w-7 grid place-items-center rounded text-ink/55 hover:text-navy hover:bg-[#F4F5F7] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        aria-label="Move down"
      >
        <ChevronDown size={14} />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="h-8 w-7 grid place-items-center rounded text-rose-700 hover:bg-rose-50 transition-colors"
        aria-label="Remove"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function htmlType(t: FormFieldType): string {
  switch (t) {
    case "email":
      return "email";
    case "url":
      return "url";
    case "number":
      return "number";
    case "password":
      return "password";
    case "date":
      return "date";
    case "datetime":
      return "datetime-local";
    case "slug":
    case "text":
    default:
      return "text";
  }
}

function isWideType(t: FormFieldType): boolean {
  return (
    t === "textarea" ||
    t === "json" ||
    t === "tags" ||
    t === "chips" ||
    t === "imageUrl" ||
    t === "imageList" ||
    t === "stringList" ||
    t === "keyValue" ||
    t === "colorVariants" ||
    t === "sizeVariants"
  );
}

function normaliseStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  return [];
}

function normaliseDict(v: unknown): Record<string, string> {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = String(val ?? "");
    }
    return out;
  }
  return {};
}

function normaliseColorVariants(v: unknown): ColorVariant[] {
  if (!Array.isArray(v)) return [];
  return v.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      name: String(r?.name ?? ""),
      hex: String(r?.hex ?? "#000000"),
      image: r?.image ? String(r.image) : undefined,
      order: typeof r?.order === "number" ? r.order : undefined,
    };
  });
}

function normaliseSizeVariants(v: unknown): SizeVariant[] {
  if (!Array.isArray(v)) return [];
  return v.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      label: String(r?.label ?? ""),
      order: typeof r?.order === "number" ? r.order : undefined,
    };
  });
}

// ─── Auto-derive helpers (slug, sku) ─────────────────────────────────────────

/** Convert any string into a URL-safe kebab-case slug. */
export function deriveSlug(input: string): string {
  return String(input ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate a recognisable SKU from a name:
 *   "Eastgate Trench"  →  "RE-EAS-7842"
 * Three-letter prefix + four random digits keeps it unique enough for an
 * initial draft. The user can still type their own value to override.
 */
export function deriveSku(input: string): string {
  const cleaned = String(input ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!cleaned) return "";
  const prefix = cleaned.slice(0, 3).padEnd(3, "X");
  const suffix = String(1000 + Math.floor(Math.random() * 9000));
  return `RE-${prefix}-${suffix}`;
}

/**
 * On open, treat any field that already has a non-empty value as "touched"
 * so we don't overwrite it on the first source-field keystroke. This is the
 * editor-mode case — existing rows shouldn't have their slug/sku reshuffled.
 */
function initialTouched(
  fields: FormField[],
  existing?: Record<string, unknown>,
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (!existing) return out;
  for (const f of fields) {
    if (!f.autoFrom) continue;
    const v = existing[f.name];
    if (v !== undefined && v !== null && v !== "") {
      out[f.name] = true;
    }
  }
  return out;
}

// ─── Seed / clean ────────────────────────────────────────────────────────────

function seed(
  fields: FormField[],
  existing?: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    let v = existing?.[f.name];
    if (v === undefined || v === null) v = defaultFor(f.type);

    if (f.type === "tags" && Array.isArray(v)) v = v.join(", ");
    else if (f.type === "chips") v = normaliseStringArray(v);
    else if (f.type === "imageList" || f.type === "stringList")
      v = normaliseStringArray(v);
    else if (f.type === "keyValue") v = normaliseDict(v);
    else if (f.type === "colorVariants") v = normaliseColorVariants(v);
    else if (f.type === "sizeVariants") v = normaliseSizeVariants(v);
    else if (f.type === "json" && typeof v !== "string")
      v = JSON.stringify(v ?? null, null, 2);
    else if (f.type === "boolean") v = !!v;
    else if (f.type === "number" && typeof v === "string")
      v = v === "" ? "" : Number(v);
    else if (f.type === "date" && typeof v === "string") v = v.slice(0, 10);
    else if (f.type === "datetime" && typeof v === "string") v = v.slice(0, 16);

    out[f.name] = v;
  }
  return out;
}

function defaultFor(t: FormFieldType): unknown {
  switch (t) {
    case "boolean":
      return false;
    case "tags":
      return "";
    case "json":
      return "{}";
    case "number":
      return "";
    case "chips":
    case "imageList":
    case "stringList":
      return [];
    case "keyValue":
      return {};
    case "colorVariants":
    case "sizeVariants":
      return [];
    default:
      return "";
  }
}

function clean(
  fields: FormField[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const raw = values[f.name];

    if (f.type === "number") {
      out[f.name] =
        raw === "" || raw === null || raw === undefined ? null : Number(raw);
    } else if (f.type === "boolean") {
      out[f.name] = !!raw;
    } else if (f.type === "tags") {
      out[f.name] = String(raw ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (f.type === "chips" || f.type === "imageList" || f.type === "stringList") {
      out[f.name] = (Array.isArray(raw) ? raw : [])
        .map((s) => String(s).trim())
        .filter(Boolean);
    } else if (f.type === "keyValue") {
      const d = (raw && typeof raw === "object") ? (raw as Record<string, unknown>) : {};
      const cleaned: Record<string, string> = {};
      for (const [k, v] of Object.entries(d)) {
        const kt = k.trim();
        if (kt) cleaned[kt] = String(v ?? "");
      }
      out[f.name] = cleaned;
    } else if (f.type === "colorVariants") {
      const arr = Array.isArray(raw) ? raw : [];
      out[f.name] = (arr as ColorVariant[])
        .filter((c) => c.name && c.name.trim() && c.hex && c.hex.trim())
        .map((c, i) => ({
          name: c.name.trim(),
          hex: c.hex.trim(),
          image: c.image && c.image.trim() ? c.image.trim() : undefined,
          order: i,
        }));
    } else if (f.type === "sizeVariants") {
      const arr = Array.isArray(raw) ? raw : [];
      out[f.name] = (arr as SizeVariant[])
        .filter((s) => s.label && s.label.trim())
        .map((s, i) => ({ label: s.label.trim(), order: i }));
    } else if (f.type === "json") {
      const text = String(raw ?? "").trim();
      if (!text) {
        out[f.name] = null;
      } else {
        try {
          out[f.name] = JSON.parse(text);
        } catch {
          throw Object.assign(new Error(`Invalid JSON in ${f.label}`), {
            fields: { [f.name]: ["Invalid JSON"] },
          });
        }
      }
    } else if (raw === "" || raw === null || raw === undefined) {
      out[f.name] = f.required ? raw : null;
    } else {
      out[f.name] = raw;
    }
  }
  return out;
}
