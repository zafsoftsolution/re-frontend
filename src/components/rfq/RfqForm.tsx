"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { Camera, FileSpreadsheet, FileText, ImageIcon, Loader2, Minus, Plus, Trash2, Upload, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { QUOTE_MAX_QTY, quoteItemKey, useQuoteList } from "@/lib/stores/quote-list";
import { DELIVERY_AREAS } from "@/lib/forms/areas";
import { checkFiles, fieldErrors, RFQ_ACCEPT, RFQ_MAX_FILES, rfqContactSchema, type FileError } from "@/lib/forms/schemas";
import { rfqContactFromForm } from "@/lib/forms/forward";
import { PartNumber } from "@/components/ui/PartNumber";
import { QtyInput } from "@/components/ui/QtyInput";
import { clampQty, qtyDraft } from "@/lib/qty";
import { inputClass } from "@/components/ui/Input";
import { buttonClass } from "@/components/ui/button-styles";
import { cn } from "@/lib/utils";
import { whatsappHref } from "@/lib/format";
import { describedBy, FormField, FormSection, selectClass, textareaClass } from "./FormField";
import { RfqProgress } from "./RfqProgress";

/** Phones: 48px fields (thumb + gloves), desktop keeps the 44px rhythm. */
const big = "max-md:h-12";

/** Field names are the wire names the route handler reads (also for no-JS posts). */
type Values = {
  phone: string;
  contact_name: string;
  company_name: string;
  email: string;
  bin_number: string;
  delivery_area: string;
  delivery_area_other: string;
  preferred_contact: "whatsapp" | "call" | "email";
  notes: string;
  website: string;
};

const SNAKE: Record<string, keyof Values> = {
  phone: "phone",
  contactName: "contact_name",
  companyName: "company_name",
  email: "email",
  binNumber: "bin_number",
  deliveryArea: "delivery_area",
  preferredContact: "preferred_contact",
  notes: "notes",
};

function toFormData(v: Values): FormData {
  const fd = new FormData();
  for (const [k, val] of Object.entries(v)) fd.append(k, val ?? "");
  return fd;
}

/** zod (camelCase, shared with the route handler) behind snake_case fields. */
const resolver: Resolver<Values> = async (values) => {
  const parsed = rfqContactSchema.safeParse(rfqContactFromForm(toFormData(values)));
  if (parsed.success) return { values, errors: {} };
  const errors: Record<string, { type: string; message: string }> = {};
  for (const [path, code] of Object.entries(fieldErrors(parsed.error))) {
    const name = SNAKE[path] ?? path;
    errors[name] = { type: "validation", message: code };
  }
  return { values: {}, errors };
};

type Line = { id: number; pn: string; desc: string; qty: string; model: string };
const blankLine = (id: number): Line => ({ id, pn: "", desc: "", qty: "1", model: "" });

const fileIcon = (name: string) =>
  /\.(xlsx?|csv)$/i.test(name) ? FileSpreadsheet : /\.(jpe?g|png|webp)$/i.test(name) ? ImageIcon : FileText;

const fmtSize = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/**
 * /rfq — the primary conversion. Line items come from the persistent quote
 * list (qty, note, remove) plus free-text lines; Excel/PDF/photo uploads;
 * contact block; honeypot. Submits multipart to /api/rfq.
 *
 * Progressive enhancement: the markup is a real multipart <form> posting to
 * /api/rfq with wire-named fields, so before hydration (or without JS) the
 * free-text lines, files and contact fields still submit and the handler
 * redirects to /rfq/sent. With JS, react-hook-form validates in place and
 * the quote-list lines are added.
 */
export function RfqForm({ whatsapp }: { whatsapp: string }) {
  const t = useTranslations("rfq");
  const tf = useTranslations("fixes.rfq");
  const locale = useLocale();
  const router = useRouter();
  const uid = useId();
  const quote = useQuoteList();
  const [lines, setLines] = useState<Line[]>(() => [blankLine(1), blankLine(2)]);
  const nextId = useRef(3);
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<FileError[]>([]);
  const [dragging, setDragging] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver,
    mode: "onTouched",
    defaultValues: {
      phone: "",
      contact_name: "",
      company_name: "",
      email: "",
      bin_number: "",
      delivery_area: "",
      delivery_area_other: "",
      preferred_contact: "whatsapp",
      notes: "",
      website: "",
    },
  });
  const area = useWatch({ control, name: "delivery_area" });
  const preferred = useWatch({ control, name: "preferred_contact" });
  const phoneValue = useWatch({ control, name: "phone" });
  const err = (name: keyof Values) => {
    const code = errors[name]?.message;
    return code ? t(`errors.${code}` as never) : undefined;
  };

  function addFiles(list: FileList | File[] | null) {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (!next.some((x) => x.name === f.name && x.size === f.size)) next.push(f);
    }
    setFiles(next.slice(0, RFQ_MAX_FILES + 2));
    setFileErrors(checkFiles(next));
  }

  function removeFile(i: number) {
    const next = files.filter((_, n) => n !== i);
    setFiles(next);
    setFileErrors(checkFiles(next));
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const filledLines = lines.filter((l) => l.pn.trim() || l.desc.trim());
  const totalLines = quote.items.length + filledLines.length;
  const waText = [
    t("waHeader"),
    ...quote.items.map((i, n) => `${n + 1}. ${i.partNumber ? `[${i.partNumber}] ` : ""}${i.name} × ${i.qty}${i.note ? ` — ${i.note}` : ""}`),
  ].join("\n");
  const wa = whatsappHref(whatsapp, waText);

  async function onValid(values: Values) {
    setSubmitError("");
    const fErr = checkFiles(files);
    setFileErrors(fErr);
    if (fErr.length) {
      setSubmitError(t(`errors.${fErr[0].code}`));
      return;
    }
    if (totalLines === 0 && files.length === 0 && !values.notes.trim()) {
      setSubmitError(t("errors.empty"));
      return;
    }
    const items = [
      ...quote.items.map((i) => ({
        productSlug: i.productSlug,
        partNumber: i.partNumber,
        description: [i.name, i.note].filter(Boolean).join(" — ").slice(0, 500),
        quantity: i.qty,
        machineModel: "",
      })),
      ...filledLines.map((l) => ({
        productSlug: "",
        partNumber: l.pn.trim(),
        description: l.desc.trim(),
        quantity: clampQty(l.qty, 1, 1_000_000),
        machineModel: l.model.trim(),
      })),
    ];
    const fd = toFormData(values);
    fd.append("locale", locale);
    fd.append("items", JSON.stringify(items));
    for (const f of files) fd.append("attachments", f, f.name);

    try {
      const res = await fetch("/api/rfq", { method: "POST", body: fd, headers: { Accept: "application/json" } });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; reference?: string; code?: string; fields?: Record<string, string>; lines?: number[] };
      if (res.ok && body.ok && body.reference) {
        quote.clear();
        router.push(`/rfq/sent?ref=${encodeURIComponent(body.reference)}`);
        return;
      }
      const code = body.code ?? "failed";
      if (body.fields && typeof body.fields.phone === "string") setError("phone", { message: body.fields.phone });
      if (body.fields && typeof body.fields.email === "string") setError("email", { message: body.fields.email });
      if (code === "invalid_lines" || code === "too_large") {
        // Line numbers count the quote-list lines first, then the free-text lines.
        const lines = Array.isArray(body.lines) ? body.lines.filter((n) => Number.isInteger(n)).slice(0, 50).join(", ") : "";
        setSubmitError(tf(code, { lines: lines || "?" }));
        return;
      }
      setSubmitError(t.has(`errors.${code}` as never) ? t(`errors.${code}` as never) : t("errors.failed"));
    } catch {
      setSubmitError(t("errors.unavailable"));
    }
  }

  const onInvalid = () => setSubmitError(t("errors.fixFields"));

  const updateLine = (id: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  return (
    <form
      action="/api/rfq"
      method="post"
      encType="multipart/form-data"
      noValidate
      onSubmit={handleSubmit(onValid, onInvalid)}
      className="mt-0 grid gap-8 md:mt-8 md:gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12"
    >
      <input type="hidden" name="locale" value={locale} />
      <RfqProgress
        label={t("progress.label")}
        steps={[
          { id: "rfq-parts", label: t("progress.parts"), done: totalLines > 0 },
          { id: "rfq-files", label: t("progress.files"), done: files.length > 0 && !fileErrors.length },
          { id: "rfq-contact", label: t("progress.contact"), done: (phoneValue ?? "").replace(/\D/g, "").length >= 10 },
          { id: "rfq-send", label: t("progress.send"), done: false },
        ]}
      />
      <div className="min-w-0 space-y-12">
        {/* 01 — Parts */}
        <FormSection index="01" id={`${uid}-parts`} anchor="rfq-parts" title={t("partsTitle")} lead={t("partsLead")}>
          {quote.items.length > 0 && (
            <div className="mb-6">
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="re-label">{t("fromList", { count: quote.items.length })}</span>
                <button type="button" onClick={quote.clear} className="h-11 px-1 text-sm font-semibold text-re-red-text hover:underline">
                  {t("clear")}
                </button>
              </div>
              <ol className="divide-y divide-re-steel-200 border-y border-re-ink">
                {quote.items.map((i, n) => {
                  const key = quoteItemKey(i);
                  return (
                    <li key={key} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 gap-y-2.5 py-4 md:grid-cols-[2rem_minmax(0,1fr)_auto_auto] md:items-start">
                      <span className="re-mono pt-1 text-sm text-re-steel-400">{String(n + 1).padStart(2, "0")}</span>
                      <div className="min-w-0">
                        {i.partNumber ? <PartNumber value={i.partNumber} size="sm" /> : null}
                        <p className="mt-1 font-semibold leading-snug">
                          {i.productSlug ? (
                            <Link href={`/parts/${i.productSlug}`} className="hover:text-re-blue hover:underline">
                              {i.name || i.partNumber}
                            </Link>
                          ) : (
                            i.name || i.partNumber
                          )}
                        </p>
                        <label className="mt-2 block">
                          <span className="sr-only">{t("noteFor", { name: i.name || i.partNumber })}</span>
                          <input
                            value={i.note}
                            maxLength={300}
                            onChange={(e) => quote.update(key, { note: e.target.value })}
                            placeholder={t("notePlaceholder")}
                            className={cn(inputClass, "h-10 text-[0.875rem]")}
                          />
                        </label>
                      </div>
                      <span className="col-start-2 inline-flex w-max items-stretch border border-re-steel-500 focus-within:border-re-ink md:col-start-auto">
                        <button type="button" aria-label={`${t("decrease")}, ${i.partNumber || i.name}`} onClick={() => quote.update(key, { qty: i.qty - 1 })} className="grid size-11 place-items-center hover:bg-re-steel-100">
                          <Minus aria-hidden className="size-4" />
                        </button>
                        <label className="flex items-center border-x border-re-steel-500">
                          <span className="sr-only">{`${t("qty")}, ${i.partNumber || i.name}`}</span>
                          <QtyInput
                            value={i.qty}
                            min={1}
                            max={QUOTE_MAX_QTY}
                            onCommit={(q) => quote.update(key, { qty: q })}
                            className="re-mono h-11 w-16 bg-transparent text-center outline-none"
                          />
                        </label>
                        <button type="button" aria-label={`${t("increase")}, ${i.partNumber || i.name}`} onClick={() => quote.update(key, { qty: i.qty + 1 })} className="grid size-11 place-items-center hover:bg-re-steel-100">
                          <Plus aria-hidden className="size-4" />
                        </button>
                      </span>
                      <button
                        type="button"
                        onClick={() => quote.remove(key)}
                        aria-label={t("remove", { name: i.name || i.partNumber })}
                        className="col-start-2 -mt-1 grid size-11 place-items-center justify-self-start text-re-steel-600 hover:text-re-red-text md:col-start-auto md:mt-0"
                      >
                        <Trash2 aria-hidden className="size-5" strokeWidth={1.75} />
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {quote.items.length === 0 && (
            <p className="mb-5 border-l-[3px] border-re-steel-200 pl-3 text-[0.9375rem] text-re-steel-600">
              {t("emptyListHint")}{" "}
              <Link href="/search" className="font-semibold text-re-blue hover:underline">
                {t("browse")}
              </Link>
            </p>
          )}

          <fieldset>
            <legend className="re-label mb-2">{t("freeLines")}</legend>
            <div className="hidden grid-cols-[minmax(0,11rem)_minmax(0,1fr)_5rem_minmax(0,10rem)_2.75rem] gap-2 pb-1.5 md:grid">
              <span className="re-label">{t("col.partNumber")}</span>
              <span className="re-label">{t("col.description")}</span>
              <span className="re-label">{t("col.qty")}</span>
              <span className="re-label">{t("col.machine")}</span>
              <span />
            </div>
            <ol className="space-y-3 md:space-y-2">
              {lines.map((l, n) => (
                <li key={l.id} className="grid grid-cols-2 gap-2 border border-re-steel-200 p-3 md:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_5rem_minmax(0,10rem)_2.75rem] md:border-0 md:p-0">
                  <label className="col-span-2 md:col-span-1">
                    <span className="re-label mb-1 block md:sr-only">{t("col.partNumber")}</span>
                    <input name="line_pn" value={l.pn} onChange={(e) => updateLine(l.id, { pn: e.target.value })} maxLength={120} autoCapitalize="characters" spellCheck={false} placeholder="B1109-552-H00" className={cn(inputClass, big, "re-mono placeholder:font-re-mono placeholder:text-re-steel-400")} aria-label={`${t("col.partNumber")} ${n + 1}`} />
                  </label>
                  <label className="col-span-2 md:col-span-1">
                    <span className="re-label mb-1 block md:sr-only">{t("col.description")}</span>
                    <input name="line_desc" value={l.desc} onChange={(e) => updateLine(l.id, { desc: e.target.value })} maxLength={500} placeholder={t("descPlaceholder")} className={cn(inputClass, big)} aria-label={`${t("col.description")} ${n + 1}`} />
                  </label>
                  <label>
                    <span className="re-label mb-1 block md:sr-only">{t("col.qty")}</span>
                    <input name="line_qty" value={l.qty} onChange={(e) => updateLine(l.id, { qty: qtyDraft(e.target.value) })} onBlur={() => updateLine(l.id, { qty: String(clampQty(l.qty, 1, 1_000_000)) })} inputMode="numeric" className={cn(inputClass, big, "re-mono text-center")} aria-label={`${t("col.qty")} ${n + 1}`} />
                  </label>
                  <label>
                    <span className="re-label mb-1 block md:sr-only">{t("col.machine")}</span>
                    <input name="line_model" value={l.model} onChange={(e) => updateLine(l.id, { model: e.target.value })} maxLength={200} placeholder="DDL-8700" className={cn(inputClass, big, "re-mono placeholder:font-re-mono placeholder:text-re-steel-400")} aria-label={`${t("col.machine")} ${n + 1}`} />
                  </label>
                  <button
                    type="button"
                    onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.id !== l.id) : [blankLine(nextId.current++)]))}
                    aria-label={t("removeLine", { n: n + 1 })}
                    className="col-span-2 inline-flex h-11 min-w-11 items-center justify-center gap-1.5 justify-self-end px-2 text-re-steel-600 hover:text-re-red-text md:col-span-1 md:w-11 md:px-0"
                  >
                    <X aria-hidden className="size-5" />
                    <span className="text-[0.875rem] font-semibold md:hidden">{t("removeLine", { n: n + 1 })}</span>
                  </button>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => setLines((ls) => (ls.length >= 50 ? ls : [...ls, blankLine(nextId.current++)]))}
              className={buttonClass({ variant: "secondary", size: "sm" }, "mt-3 max-md:h-12 max-md:w-full max-md:text-sm")}
            >
              <Plus aria-hidden />
              {t("addLine")}
            </button>
          </fieldset>
        </FormSection>

        {/* 02 — Files */}
        <FormSection index="02" id={`${uid}-files`} anchor="rfq-files" title={t("filesTitle")} lead={t("filesLead")}>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              "border border-dashed p-5 transition-colors duration-150 ease-re md:p-6",
              dragging ? "border-re-blue bg-re-steel-50" : "border-re-steel-400",
            )}
          >
            <Upload aria-hidden className="size-6 text-re-steel-600" strokeWidth={1.5} />
            <p className="mt-2 font-semibold">{t("dropHere")}</p>
            <p className="re-mono mt-1 text-[0.8125rem] text-re-steel-600">{t("fileRules")}</p>
            <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
              {/* Phones: the camera is the fastest way to send an old part — make it the big one. */}
              <label
                className={buttonClass(
                  { variant: "secondary" },
                  "cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-re-blue max-sm:h-14 max-sm:bg-re-ink max-sm:text-base max-sm:text-white sm:order-2",
                )}
              >
                <Camera aria-hidden />
                {t("takePhoto")}
                <input
                  type="file"
                  name="attachments"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                  className="sr-only"
                />
              </label>
              <label className={buttonClass({ variant: "secondary" }, "cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-re-blue max-sm:h-12 sm:order-1")}>
                <Upload aria-hidden />
                {t("chooseFiles")}
                <input
                  type="file"
                  name="attachments"
                  multiple
                  accept={RFQ_ACCEPT}
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                  className="sr-only"
                />
              </label>
            </div>
          </div>
          {files.length > 0 && (
            <ul className="mt-3 divide-y divide-re-steel-200 border-y border-re-steel-200" aria-live="polite">
              {files.map((f, i) => {
                const Icon = fileIcon(f.name);
                const bad = fileErrors.find((e) => e.name === f.name);
                return (
                  <li key={`${f.name}-${f.size}-${i}`} className="flex items-center gap-3 py-2">
                    <Icon aria-hidden className="size-5 shrink-0 text-re-steel-600" strokeWidth={1.5} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem]">{f.name}</span>
                      <span className={cn("re-mono text-[0.75rem]", bad ? "font-semibold text-re-red-text" : "text-re-steel-600")}>
                        {bad ? t(`errors.${bad.code}`) : fmtSize(f.size)}
                      </span>
                    </span>
                    <button type="button" onClick={() => removeFile(i)} aria-label={t("removeFile", { name: f.name })} className="grid size-11 place-items-center text-re-steel-600 hover:text-re-red-text">
                      <X aria-hidden className="size-5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {fileErrors.some((e) => e.code === "file_count") && (
            <p role="alert" className="mt-2 text-[0.8125rem] font-semibold text-re-red-text">
              {t("errors.file_count")}
            </p>
          )}
        </FormSection>

        {/* 03 — Contact */}
        <FormSection index="03" id={`${uid}-contact`} anchor="rfq-contact" title={t("contactTitle")} lead={t("contactLead")}>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id={`${uid}-phone`} label={t("field.phone")} hint={t("hint.phone")} error={err("phone")}>
              <input
                id={`${uid}-phone`}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                placeholder="01XXX-XXXXXX"
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={describedBy(`${uid}-phone`, err("phone"), true)}
                className={cn(inputClass, big, "re-mono max-md:text-[1.0625rem]")}
                {...register("phone")}
              />
            </FormField>
            <FormField id={`${uid}-name`} label={t("field.contactName")} optional optionalLabel={t("optional")} error={err("contact_name")}>
              <input id={`${uid}-name`} autoComplete="name" className={cn(inputClass, big)} aria-invalid={Boolean(errors.contact_name)} {...register("contact_name")} />
            </FormField>
            <FormField id={`${uid}-company`} label={t("field.company")} optional optionalLabel={t("optional")} error={err("company_name")}>
              <input id={`${uid}-company`} autoComplete="organization" className={cn(inputClass, big)} aria-invalid={Boolean(errors.company_name)} {...register("company_name")} />
            </FormField>
            <FormField id={`${uid}-email`} label={t("field.email")} optional optionalLabel={t("optional")} error={err("email")}>
              <input id={`${uid}-email`} type="email" inputMode="email" autoComplete="email" className={cn(inputClass, big)} aria-invalid={Boolean(errors.email)} aria-describedby={describedBy(`${uid}-email`, err("email"))} {...register("email")} />
            </FormField>
            <FormField id={`${uid}-bin`} label={t("field.bin")} optional optionalLabel={t("optional")} hint={t("hint.bin")} error={err("bin_number")}>
              <input id={`${uid}-bin`} inputMode="numeric" className={cn(inputClass, big, "re-mono")} aria-invalid={Boolean(errors.bin_number)} aria-describedby={describedBy(`${uid}-bin`, err("bin_number"), true)} {...register("bin_number")} />
            </FormField>
            <FormField id={`${uid}-area`} label={t("field.area")} optional optionalLabel={t("optional")}>
              <select id={`${uid}-area`} className={cn(selectClass, big)} {...register("delivery_area")}>
                <option value="">{t("areaChoose")}</option>
                {DELIVERY_AREAS.map((a) => (
                  <option key={a.key} value={a.value}>
                    {t(`areas.${a.key}`)}
                  </option>
                ))}
                <option value="other">{t("areas.other")}</option>
              </select>
            </FormField>
            {area === "other" && (
              <FormField id={`${uid}-area-other`} label={t("field.areaOther")} className="sm:col-start-2">
                <input id={`${uid}-area-other`} maxLength={200} className={cn(inputClass, big)} {...register("delivery_area_other")} />
              </FormField>
            )}
          </div>

          <fieldset className="mt-6">
            <legend className="text-[0.9375rem] font-semibold">{t("field.preferred")}</legend>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
              {(["whatsapp", "call", "email"] as const).map((v) => (
                <label key={v} className="relative inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 border sm:min-h-11 sm:justify-start border-re-steel-500 px-3.5 has-checked:border-re-ink has-checked:bg-re-ink has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-re-blue">
                  <input type="radio" value={v} className="sr-only" {...register("preferred_contact")} />
                  <span className="text-[0.9375rem] font-semibold">{t(`preferred.${v}`)}</span>
                </label>
              ))}
            </div>
            {err("email") && preferred === "email" && <span className="sr-only">{err("email")}</span>}
          </fieldset>

          <FormField id={`${uid}-notes`} label={t("field.notes")} optional optionalLabel={t("optional")} hint={t("hint.notes")} className="mt-6" error={err("notes")}>
            <textarea id={`${uid}-notes`} rows={4} maxLength={5000} className={textareaClass} {...register("notes")} />
          </FormField>

          {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label>
              Website
              <input tabIndex={-1} autoComplete="off" {...register("website")} />
            </label>
          </div>
        </FormSection>
      </div>

      {/* Summary + submit */}
      <aside id="rfq-send" className="scroll-mt-16 lg:sticky lg:top-24 lg:self-start">
        <div className="border border-re-ink bg-re-paper">
          <div className="border-b border-re-ink bg-re-ink px-4 py-2.5">
            <p className="re-label !text-white/70">{t("summary")}</p>
          </div>
          <dl className="divide-y divide-re-steel-200 px-4">
            <div className="flex items-baseline justify-between py-3">
              <dt className="text-[0.9375rem]">{t("summaryLines")}</dt>
              <dd className="re-mono text-lg font-semibold">{String(totalLines).padStart(2, "0")}</dd>
            </div>
            <div className="flex items-baseline justify-between py-3">
              <dt className="text-[0.9375rem]">{t("summaryFiles")}</dt>
              <dd className="re-mono text-lg font-semibold">
                {files.length}/{RFQ_MAX_FILES}
              </dd>
            </div>
          </dl>
          <div className="p-4 pt-2">
            {submitError && (
              <p role="alert" className="mb-3 border-l-[3px] border-re-red bg-re-steel-50 px-3 py-2 text-[0.875rem] font-semibold text-re-red-text">
                {submitError}
              </p>
            )}
            <button type="submit" disabled={isSubmitting} className={buttonClass({ variant: "primary", size: "lg" }, "w-full")}>
              {isSubmitting && <Loader2 aria-hidden className="animate-spin" />}
              {isSubmitting ? t("sending") : t("submit")}
            </button>
            <p className="mt-3 text-[0.8125rem] leading-relaxed text-re-steel-600">{t("noPrices")}</p>
          </div>
        </div>
        {wa && (
          <p className="mt-4 text-[0.875rem] text-re-steel-600">
            {t("orWhatsapp")}{" "}
            <a href={wa} target="_blank" rel="noopener" className="font-semibold text-re-whatsapp hover:underline">
              {t("whatsappLink")}
            </a>
          </p>
        )}
      </aside>
    </form>
  );
}
