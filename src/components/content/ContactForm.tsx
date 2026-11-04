"use client";

import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { CONTACT_TOPICS, contactSchema, type ContactInput, type ContactValues } from "@/lib/forms/schemas";
import { inputClass } from "@/components/ui/Input";
import { buttonClass } from "@/components/ui/button-styles";
import { describedBy, FormField, selectClass, textareaClass } from "@/components/rfq/FormField";
import { cn } from "@/lib/utils";

/** Short contact form → /api/contact → Django /api/site/contact/. Native POST without JS. */
export function ContactForm() {
  const t = useTranslations("contact");
  const locale = useLocale();
  const uid = useId();
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  const [errorText, setErrorText] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput, unknown, ContactValues>({
    resolver: zodResolver(contactSchema),
    mode: "onTouched",
    defaultValues: { name: "", phone: "", email: "", topic: "parts", message: "", website: "" },
  });
  const err = (k: keyof ContactInput) => (errors[k]?.message ? t(`errors.${errors[k]!.message}` as never) : undefined);

  async function onValid(v: ContactValues) {
    setState("idle");
    const fd = new FormData();
    for (const [k, val] of Object.entries(v)) fd.append(k, String(val));
    fd.append("locale", locale);
    try {
      const r = await fetch("/api/contact", { method: "POST", body: fd, headers: { Accept: "application/json" } });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; code?: string };
      if (r.ok && d.ok) {
        reset();
        setState("sent");
        return;
      }
      setErrorText(t(`errors.${d.code === "throttled" ? "throttled" : d.code === "unavailable" ? "unavailable" : "failed"}`));
      setState("error");
    } catch {
      setErrorText(t("errors.unavailable"));
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="border-t-[3px] border-re-stock-in bg-re-steel-50 p-5" data-testid="contact-sent">
        <p className="flex items-center gap-2 font-semibold">
          <Check aria-hidden className="size-5 text-re-stock-in" />
          {t("sentTitle")}
        </p>
        <p className="mt-1 text-[0.9375rem] text-re-steel-600">{t("sentBody")}</p>
        <button type="button" onClick={() => setState("idle")} className={buttonClass({ variant: "link" }, "mt-3")}>
          {t("sendAnother")}
        </button>
      </div>
    );
  }

  return (
    <form action="/api/contact" method="post" noValidate onSubmit={handleSubmit(onValid)} className="relative space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id={`${uid}-name`} label={t("field.name")} error={err("name")}>
          <input id={`${uid}-name`} autoComplete="name" required aria-invalid={Boolean(errors.name)} aria-describedby={describedBy(`${uid}-name`, err("name"))} className={inputClass} {...register("name")} />
        </FormField>
        <FormField id={`${uid}-phone`} label={t("field.phone")} error={err("phone")}>
          <input id={`${uid}-phone`} type="tel" inputMode="tel" autoComplete="tel" required placeholder="01XXX-XXXXXX" aria-invalid={Boolean(errors.phone)} aria-describedby={describedBy(`${uid}-phone`, err("phone"))} className={cn(inputClass, "re-mono")} {...register("phone")} />
        </FormField>
        <FormField id={`${uid}-email`} label={t("field.email")} hint={t("hint.email")} error={err("email")}>
          <input id={`${uid}-email`} type="email" inputMode="email" autoComplete="email" required aria-invalid={Boolean(errors.email)} aria-describedby={describedBy(`${uid}-email`, err("email"), true)} className={inputClass} {...register("email")} />
        </FormField>
        <FormField id={`${uid}-topic`} label={t("field.topic")}>
          <select id={`${uid}-topic`} className={selectClass} {...register("topic")}>
            {CONTACT_TOPICS.map((k) => (
              <option key={k} value={k}>
                {t(`topics.${k}`)}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <FormField id={`${uid}-message`} label={t("field.message")} hint={t("hint.message")} error={err("message")}>
        <textarea id={`${uid}-message`} rows={5} required aria-invalid={Boolean(errors.message)} aria-describedby={describedBy(`${uid}-message`, err("message"), true)} className={textareaClass} {...register("message")} />
      </FormField>
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" {...register("website")} />
        </label>
      </div>
      {state === "error" && (
        <p role="alert" className="border-l-[3px] border-re-red px-3 py-2 text-[0.875rem] font-semibold text-re-red-text">
          {errorText}
        </p>
      )}
      <button type="submit" disabled={isSubmitting} className={buttonClass({ variant: "primary", size: "lg" })}>
        {isSubmitting && <Loader2 aria-hidden className="animate-spin" />}
        {t("send")}
      </button>
    </form>
  );
}
