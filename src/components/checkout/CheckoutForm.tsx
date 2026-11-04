"use client";

import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote, Check, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useCart } from "@/lib/stores/cart";
import { formatBDT } from "@/lib/format";
import { BD_DIVISIONS, checkoutSchema, type CheckoutInput, type CheckoutValues } from "@/lib/forms/schemas";
import { inputClass } from "@/components/ui/Input";
import { buttonClass } from "@/components/ui/button-styles";
import { describedBy, FormField, FormSection, selectClass, textareaClass } from "@/components/rfq/FormField";
import { cn } from "@/lib/utils";
import { moveToQuote, unitPrice, useLiveLines } from "./live-cart";

type Coupon = { valid: boolean; code?: string; type?: string; value?: number | null; minSpend?: number | null; maxDiscount?: number | null };

/** Discount estimate with the backend's rules (place_direct_order). */
export function couponDiscount(c: Coupon | null, subtotal: number): number {
  if (!c?.valid || c.value == null) return 0;
  if (c.minSpend && subtotal < c.minSpend) return 0;
  let d = c.type === "percent" ? subtotal * (c.value / 100) : c.type === "fixed" ? c.value : 0;
  if (c.maxDiscount) d = Math.min(d, c.maxDiscount);
  return Math.min(d, subtotal);
}

/**
 * Guest checkout (direct parts only): contact, BD address, delivery notes,
 * payment (cash on delivery — the only method the backend settles online
 * today), coupon. The summary uses live backend prices; final totals
 * (shipping, VAT) come back from the order itself.
 */
export function CheckoutForm({
  shipping,
  codEnabled,
}: {
  shipping: { flatFee: number; freeThreshold: number };
  codEnabled: boolean;
}) {
  const t = useTranslations("checkout");
  const locale = useLocale();
  const router = useRouter();
  const uid = useId();
  const { items, clear } = useCart();
  const { lines } = useLiveLines(items);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutInput, unknown, CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    mode: "onTouched",
    defaultValues: { name: "", phone: "", email: "", district: "", area: "", street: "", postcode: "", notes: "", coupon: "", paymentMethod: codEnabled ? "cod" : "bank_transfer" },
  });
  const err = (name: keyof CheckoutInput) => {
    const code = errors[name]?.message;
    return code ? t(`errors.${code}` as never) : undefined;
  };

  const blocked = lines ? items.filter((i) => !lines.get(i.productSlug)?.direct).map((i) => i.productSlug) : [];
  const payable = items.filter((i) => !blocked.includes(i.productSlug));
  const subtotal = payable.reduce((n, i) => n + unitPrice(i, lines?.get(i.productSlug)) * i.qty, 0);
  const discount = couponDiscount(coupon, subtotal);
  const shipFee = coupon?.valid && coupon.type === "shipping" ? 0 : subtotal - discount >= shipping.freeThreshold ? 0 : shipping.flatFee;

  async function applyCoupon() {
    const code = couponCode.trim();
    if (!code) return;
    setCouponBusy(true);
    try {
      const r = await fetch(`/api/checkout/coupon?code=${encodeURIComponent(code)}`);
      const d = (await r.json()) as Coupon;
      setCoupon(d.valid ? d : { valid: false, code });
    } catch {
      setCoupon({ valid: false, code });
    } finally {
      setCouponBusy(false);
    }
  }

  async function onValid(values: CheckoutValues) {
    setMessage(null);
    if (blocked.length) {
      const n = moveToQuote(blocked);
      setMessage({ tone: "info", text: t("movedToQuote", { count: n }) });
      if (n === items.length) return;
    }
    const body = {
      values: { ...values, coupon: coupon?.valid ? (coupon.code ?? couponCode) : "" },
      items: payable.map((i) => ({ productSlug: i.productSlug, qty: i.qty })),
      locale,
    };
    try {
      const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) });
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; orderId?: string; code?: string; products?: string[]; detail?: string };
      if (r.ok && d.ok && d.orderId) {
        clear();
        router.push(`/checkout/success?order=${encodeURIComponent(d.orderId)}`);
        return;
      }
      if (d.code === "quote_only_product") {
        const n = moveToQuote(d.products ?? []);
        setMessage({ tone: "info", text: t("movedToQuote", { count: n }) });
        return;
      }
      setMessage({ tone: "error", text: d.code === "rejected" && d.detail ? t("rejected", { detail: d.detail }) : t(`errors.${d.code === "throttled" ? "throttled" : "unavailable"}`) });
    } catch {
      setMessage({ tone: "error", text: t("errors.unavailable") });
    }
  }

  if (items.length === 0) {
    return (
      <div className="mt-8 max-w-2xl border border-dashed border-re-steel-400 p-6" data-testid="checkout-empty">
        {message && <p className="mb-3 font-semibold">{message.text}</p>}
        <p className="text-lg font-semibold">{t("empty")}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/rfq" className={buttonClass({ variant: "primary" })}>
            {t("toQuote")}
          </Link>
          <Link href="/search" className={buttonClass({ variant: "secondary" })}>
            {t("browse")}
          </Link>
        </div>
      </div>
    );
  }

  const field = (name: keyof CheckoutInput, label: string, { className: inputExtra, ...props }: React.ComponentProps<"input"> = {}, opts: { optional?: boolean; hint?: string; className?: string } = {}) => (
    <FormField id={`${uid}-${name}`} label={label} optional={opts.optional} optionalLabel={t("optional")} hint={opts.hint} error={err(name)} className={opts.className}>
      <input
        id={`${uid}-${name}`}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={describedBy(`${uid}-${name}`, err(name), Boolean(opts.hint))}
        className={cn(inputClass, inputExtra)}
        {...props}
        {...register(name)}
      />
    </FormField>
  );

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
      <div className="min-w-0 space-y-12">
        <FormSection index="01" id={`${uid}-c`} title={t("contactTitle")}>
          <div className="grid gap-5 sm:grid-cols-2">
            {field("name", t("field.name"), { autoComplete: "name" })}
            {field("phone", t("field.phone"), { type: "tel", inputMode: "tel", autoComplete: "tel", placeholder: "01XXX-XXXXXX", className: "re-mono" }, { hint: t("hint.phone") })}
            {field("email", t("field.email"), { type: "email", inputMode: "email", autoComplete: "email" }, { optional: true, hint: t("hint.email") })}
          </div>
        </FormSection>

        <FormSection index="02" id={`${uid}-a`} title={t("addressTitle")}>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id={`${uid}-division`} label={t("field.division")} error={err("division")}>
              <select id={`${uid}-division`} defaultValue="" aria-invalid={Boolean(errors.division)} className={selectClass} {...register("division")}>
                <option value="" disabled>
                  {t("choose")}
                </option>
                {BD_DIVISIONS.map((d) => (
                  <option key={d} value={d}>
                    {t(`divisions.${d}`)}
                  </option>
                ))}
              </select>
            </FormField>
            {field("district", t("field.district"), { autoComplete: "address-level2" })}
            {field("area", t("field.area"), { autoComplete: "address-level3" }, { hint: t("hint.area") })}
            {field("postcode", t("field.postcode"), { inputMode: "numeric", autoComplete: "postal-code", className: "re-mono" }, { optional: true })}
            {field("street", t("field.street"), { autoComplete: "street-address" }, { className: "sm:col-span-2", hint: t("hint.street") })}
          </div>
          <FormField id={`${uid}-notes`} label={t("field.notes")} optional optionalLabel={t("optional")} hint={t("hint.notes")} className="mt-5">
            <textarea id={`${uid}-notes`} rows={3} className={textareaClass} {...register("notes")} />
          </FormField>
        </FormSection>

        <FormSection index="03" id={`${uid}-p`} title={t("paymentTitle")}>
          <label className="flex cursor-pointer items-start gap-3 border-2 border-re-ink p-4">
            <input type="radio" value={codEnabled ? "cod" : "bank_transfer"} defaultChecked className="mt-1 size-4 accent-re-ink" {...register("paymentMethod")} />
            <span>
              <span className="flex items-center gap-2 font-semibold">
                <Banknote aria-hidden className="size-5" strokeWidth={1.75} />
                {codEnabled ? t("cod") : t("bankTransfer")}
              </span>
              <span className="mt-1 block text-[0.875rem] text-re-steel-600">{codEnabled ? t("codHelp") : t("bankHelp")}</span>
            </span>
          </label>
          <p className="mt-3 text-[0.8125rem] text-re-steel-600">{t("otherMethods")}</p>
        </FormSection>
      </div>

      <aside className="self-start lg:sticky lg:top-24">
        <div className="border border-re-ink">
          <p className="re-label border-b border-re-ink bg-re-ink px-4 py-2.5 !text-white/70">{t("summary")}</p>
          <ul className="divide-y divide-re-steel-200 px-4">
            {items.map((i) => {
              const isBlocked = blocked.includes(i.productSlug);
              return (
                <li key={i.productSlug} className="flex items-baseline justify-between gap-3 py-2.5 text-[0.875rem]">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{i.name}</span>
                    <span className="re-mono text-[0.75rem] text-re-steel-600">
                      {i.partNumber} × {i.qty}
                    </span>
                  </span>
                  <span className="re-mono shrink-0">{isBlocked ? t("quoteOnlyShort") : formatBDT(unitPrice(i, lines?.get(i.productSlug)) * i.qty)}</span>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-re-steel-200 px-4 py-3">
            <label htmlFor={`${uid}-coupon`} className="re-label">
              {t("coupon")}
            </label>
            <div className="mt-1.5 flex">
              <input
                id={`${uid}-coupon`}
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase());
                  setCoupon(null);
                }}
                maxLength={30}
                autoCapitalize="characters"
                className={cn(inputClass, "re-mono rounded-r-none")}
              />
              <button type="button" onClick={applyCoupon} disabled={couponBusy || !couponCode.trim()} className={buttonClass({ variant: "secondary" }, "rounded-l-none border-l-0")}>
                {couponBusy ? <Loader2 aria-hidden className="animate-spin" /> : t("apply")}
              </button>
            </div>
            {coupon && (
              <p role="status" className={cn("mt-1.5 text-[0.8125rem] font-semibold", coupon.valid ? "text-re-stock-in" : "text-re-red-text")}>
                {coupon.valid ? (
                  <>
                    <Check aria-hidden className="mr-1 inline size-4" />
                    {t("couponOk")}
                  </>
                ) : (
                  t("couponBad")
                )}
              </p>
            )}
          </div>
          <dl className="space-y-1.5 border-t border-re-steel-200 px-4 py-3 text-[0.9375rem]">
            <div className="flex justify-between">
              <dt>{t("subtotal")}</dt>
              <dd className="re-mono">{formatBDT(subtotal)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-re-stock-in">
                <dt>{t("discount")}</dt>
                <dd className="re-mono">− {formatBDT(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>{t("shipping")}</dt>
              <dd className="re-mono">{shipFee === 0 ? t("free") : formatBDT(shipFee)}</dd>
            </div>
            <div className="flex justify-between border-t border-re-ink pt-2 text-[1.0625rem] font-semibold">
              <dt>{t("estimate")}</dt>
              <dd className="re-mono" data-testid="checkout-estimate">
                {formatBDT(subtotal - discount + shipFee)}
              </dd>
            </div>
          </dl>
          <p className="px-4 text-[0.8125rem] text-re-steel-600">{t("totalsNote")}</p>
          <div className="p-4">
            {message && (
              <p role="alert" className={cn("mb-3 border-l-[3px] px-3 py-2 text-[0.875rem] font-semibold", message.tone === "error" ? "border-re-red text-re-red-text" : "border-re-blue text-re-ink")}>
                {message.text}{" "}
                {message.tone === "info" && (
                  <Link href="/rfq" className="text-re-blue underline">
                    {t("openQuote")}
                  </Link>
                )}
              </p>
            )}
            <button type="submit" disabled={isSubmitting} className={buttonClass({ variant: "primary", size: "lg" }, "w-full")}>
              {isSubmitting && <Loader2 aria-hidden className="animate-spin" />}
              {t("place")}
            </button>
          </div>
        </div>
      </aside>
    </form>
  );
}
