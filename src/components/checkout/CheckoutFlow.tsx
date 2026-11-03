"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Lock,
  ShoppingBag,
  Tag as TagIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useTranslate } from "@/i18n/LocaleProvider";
import { storefront, StorefrontError } from "@/lib/storefront";
import { formatPrice } from "@/lib/utils";
import PhoneField from "@/components/common/PhoneField";
import { isValidPhoneNumber } from "react-phone-number-input";

const EASE = [0.22, 1, 0.36, 1] as const;

// COD-only checkout. The other gateways (card / PayPal / Apple Pay / Google
// Pay / bank transfer) aren't live in this market yet — hide them from the
// customer rather than offer broken buttons. The backend still recognises
// the codes if we re-enable them later.
const PAYMENT_METHODS = [
  { value: "cod", label: "Cash on delivery" },
];

interface AddressDraft {
  first_name: string;
  last_name: string;
  company: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone: string;
}

const EMPTY_ADDRESS: AddressDraft = {
  first_name: "",
  last_name: "",
  company: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postcode: "",
  country: "",
  phone: "",
};

export default function CheckoutFlow() {
  const router = useRouter();
  const t = useTranslate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const {
    items,
    subtotal,
    shipping,
    tax,
    total,
    couponCode,
    setCoupon,
    clearCart,
    count,
  } = useCart();

  const [shippingAddress, setShippingAddress] = useState<AddressDraft>(EMPTY_ADDRESS);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billingAddress, setBillingAddress] = useState<AddressDraft>(EMPTY_ADDRESS);
  // Default to the only payment method we currently expose. If we re-enable
  // the other gateways, change the PAYMENT_METHODS list above — this stays.
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [coupon, setCouponInput] = useState(couponCode ?? "");
  const [notes, setNotes] = useState("");

  // Pre-fill from logged-in user's profile. The shipping address's own phone
  // doubles as the order contact channel — we don't carry a separate one.
  useEffect(() => {
    if (!user) return;
    setShippingAddress((cur) => ({
      ...cur,
      first_name: cur.first_name || user.firstName || "",
      last_name: cur.last_name || user.lastName || "",
      phone: cur.phone || user.phone || "",
    }));
  }, [user]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  // Coupon is applied locally (the cart context) — guests don't have a
  // server-side cart to mutate. The discount is reapplied during the
  // direct-checkout call via `couponCode`.
  async function applyCoupon() {
    setError(null);
    setCoupon(coupon || null);
  }

  /**
   * Single-shot direct checkout. The customer can be a guest (no login) or a
   * signed-in user — either way the line items live in the local cart and
   * are sent straight to the backend. If the user is signed in, the JWT
   * header is attached automatically and the backend links the order to
   * their account.
   */
  async function placeOrder() {
    setError(null);
    setErrors({});

    // Light client-side validation so the user gets immediate feedback.
    const required: Array<keyof AddressDraft> = [
      "first_name", "last_name", "line1", "city", "postcode", "country",
    ];
    const missing = required.filter((k) => !shippingAddress[k]?.trim());

    // Shipping phone is now the order contact channel — no separate field.
    const shippingPhone = shippingAddress.phone?.trim() ?? "";
    if (!shippingPhone || !isValidPhoneNumber(shippingPhone)) {
      setError("Please enter a valid delivery phone — we'll use it to contact you about the order.");
      return;
    }
    if (missing.length > 0) {
      setError("Please complete the shipping address.");
      return;
    }

    setSubmitting(true);
    try {
      const order = await storefront.checkout.placeDirect({
        customerPhone: shippingPhone,
        shippingAddress: addressDraftToFrontend(shippingAddress),
        billingAddress: billingSameAsShipping
          ? undefined
          : addressDraftToFrontend(billingAddress),
        paymentMethod,
        couponCode: couponCode || undefined,
        notes: notes || undefined,
        items: items.map((line) => ({
          productId: line.productId,
          color: line.selectedColor,
          size: line.selectedSize,
          quantity: line.quantity,
        })),
      });

      // Stash the order on the client so the success page renders instantly
      // without re-fetching. Survives the soft-nav to /checkout/success.
      try {
        sessionStorage.setItem(
          `jmn:order:${order.id}`,
          JSON.stringify(order),
        );
      } catch {
        /* sessionStorage may be unavailable (privacy mode) — falls back to fetch */
      }

      clearCart();
      router.push(`/checkout/success?order=${order.id}`);
    } catch (e) {
      const err = e as StorefrontError;
      if (err.fields && Object.keys(err.fields).length) {
        setErrors(err.fields);
      } else {
        setError(err.message ?? "Couldn’t place the order — please try again.");
      }
      setSubmitting(false);
    }
  }

  // ── Guards ────────────────────────────────────────────────────────────────

  const headerSpacing = "shell pt-36 md:pt-44 pb-12 md:pb-16";

  if (authLoading) {
    return (
      <div className="grid place-items-center min-h-[60vh]">
        <Loader2 size={28} className="text-navy/60 animate-spin" />
      </div>
    );
  }

  if (count === 0) {
    return (
      <>
        <header className={headerSpacing}>
          <p className="text-[11px] tracking-[0.35em] uppercase text-gold mb-6">
            /Checkout · empty
          </p>
          <h1 className="font-display text-[clamp(2.75rem,9vw,8rem)] leading-[0.9] tracking-tight text-navy">
            Nothing in the <span className="italic">bag.</span>
          </h1>
        </header>
        <section className="shell pb-32 max-w-md">
          <p className="text-ink/65 mb-8">
            Add a piece to your bag before you check out.
          </p>
          <Link href="/products" className="btn-primary">
            <ShoppingBag size={14} />
            Browse the house
          </Link>
        </section>
      </>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  return (
    <>
      <header className={headerSpacing}>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-[11px] tracking-[0.35em] uppercase text-gold mb-6"
        >
          /Checkout · {String(count).padStart(2, "0")} item{count === 1 ? "" : "s"}
        </motion.p>

        <div className="overflow-hidden">
          <motion.h1
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 1, ease: EASE }}
            className="font-display text-[clamp(2.75rem,9vw,7rem)] leading-[0.9] tracking-tight text-navy"
          >
            Complete your <span className="italic">order.</span>
          </motion.h1>
        </div>
      </header>

      <section className="shell pb-32 grid lg:grid-cols-[1.2fr_1fr] gap-12 md:gap-20">
        {/* Left column — form */}
        <div className="space-y-12">
          {/* Guest banner (only when signed-out) */}
          {!isAuthenticated && (
            <div className="-mt-2 px-5 py-4 bg-bone/40 border border-[var(--jmn-line)] rounded text-sm text-ink/75 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span className="leading-relaxed">
                Checking out as a <span className="text-navy font-medium">guest</span>.
                Just a phone number and a delivery address — no account needed.
              </span>
              <Link
                href="/account"
                className="text-[11px] tracking-[0.25em] uppercase text-navy hover:text-gold transition-colors whitespace-nowrap"
              >
                Have an account? Sign in →
              </Link>
            </div>
          )}

          {/* Shipping address — also collects the order contact phone */}
          <FormSection index="01" title="Shipping address">
            <AddressFields value={shippingAddress} onChange={setShippingAddress} />
            {errors.customer_phone?.[0] && (
              <p className="mt-2 text-xs text-rose-700">{errors.customer_phone[0]}</p>
            )}
            <label className="mt-4 inline-flex items-center gap-2 text-sm text-ink/70 cursor-pointer">
              <input
                type="checkbox"
                checked={billingSameAsShipping}
                onChange={(e) => setBillingSameAsShipping(e.target.checked)}
                className="accent-navy h-4 w-4"
              />
              Billing same as shipping
            </label>
          </FormSection>

          {/* Billing address */}
          {!billingSameAsShipping && (
            <FormSection index="02" title="Billing address">
              <AddressFields value={billingAddress} onChange={setBillingAddress} />
            </FormSection>
          )}

          {/* Payment */}
          <FormSection
            index={billingSameAsShipping ? "02" : "03"}
            title="Payment"
          >
            <div className="space-y-2">
              {PAYMENT_METHODS.map((m) => (
                <label
                  key={m.value}
                  className={`flex items-center gap-3 px-4 py-3 border cursor-pointer transition-colors ${
                    paymentMethod === m.value
                      ? "border-navy bg-navy/5"
                      : "border-[var(--jmn-line)] hover:border-navy/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={m.value}
                    checked={paymentMethod === m.value}
                    onChange={() => setPaymentMethod(m.value)}
                    className="accent-navy h-4 w-4"
                  />
                  <span className="text-sm text-navy">{m.label}</span>
                </label>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-ink/50 leading-relaxed">
              Payment processing is not yet wired to a live gateway — orders are
              created in <span className="text-navy">pending</span> status. The
              atelier will follow up to confirm.
            </p>
          </FormSection>

          {/* Notes */}
          <FormSection
            index={billingSameAsShipping ? "03" : "04"}
            title="Order notes (optional)"
          >
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything we should know?"
              className="w-full bg-transparent border border-navy/15 focus:border-navy/40 outline-none p-3 text-sm text-navy placeholder:text-ink/35 transition-colors resize-none"
            />
          </FormSection>
        </div>

        {/* Right column — sticky summary */}
        <aside className="lg:sticky lg:top-28 self-start">
          <div className="bg-bone/40 border border-[var(--jmn-line)] p-6 md:p-8">
            <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-4">
              Your bag
            </p>

            <ul className="space-y-4 max-h-80 overflow-y-auto pr-1 no-scrollbar">
              {items.map((line) => (
                <li key={line.id} className="flex items-start gap-3">
                  <div className="h-16 w-12 shrink-0 overflow-hidden bg-bone">
                    {line.product.images?.[0] && (
                      <Image
                        src={line.product.images[0]}
                        alt={line.product.name}
                        width={48}
                        height={64}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm text-navy truncate">
                      {line.product.name}
                    </p>
                    <p className="text-[10px] tracking-[0.2em] uppercase text-ink/50 mt-0.5">
                      {line.selectedColor} · {line.selectedSize} · ×{line.quantity}
                    </p>
                  </div>
                  <span className="font-display text-sm text-navy tabular shrink-0">
                    {formatPrice(line.product.price * line.quantity, line.product.currency)}
                  </span>
                </li>
              ))}
            </ul>

            {/* Coupon */}
            <div className="mt-6 flex items-center gap-2">
              <div className="relative flex-1">
                <TagIcon
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40"
                />
                <input
                  value={coupon}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Coupon code"
                  className="w-full h-10 pl-9 pr-3 bg-white border border-[var(--jmn-line)] rounded text-sm text-navy focus:border-navy/40 outline-none uppercase tracking-[0.1em]"
                />
              </div>
              <button
                type="button"
                onClick={applyCoupon}
                className="h-10 px-4 rounded border border-navy/30 text-[11px] tracking-[0.18em] uppercase text-navy hover:bg-navy hover:text-cream transition-colors"
              >
                Apply
              </button>
            </div>
            {couponCode && (
              <p className="mt-2 text-[11px] text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 size={11} /> Coupon {couponCode} active
              </p>
            )}

            <div className="mt-6 pt-6 border-t border-[var(--jmn-line)] space-y-2 text-sm">
              <Row label="Subtotal" value={formatPrice(subtotal)} />
              <Row label="Shipping" value={shipping === 0 ? "Free" : formatPrice(shipping)} />
              <Row label="Tax (estimate)" value={formatPrice(tax)} />
              <Row label="Total" value={formatPrice(total)} bold />
            </div>

            {error && (
              <p className="mt-4 text-sm text-rose-700">{error}</p>
            )}
            {Object.entries(errors).map(([k, v]) => (
              <p key={k} className="mt-2 text-sm text-rose-700">
                <span className="font-medium">{k}:</span> {v.join("; ")}
              </p>
            ))}

            <button
              type="button"
              onClick={placeOrder}
              disabled={submitting || count === 0}
              className="btn-primary w-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Lock size={14} />
              )}
              {submitting ? t("checkout.placing") : t("checkout.place_order")}
            </button>

            <p className="mt-4 text-[11px] text-ink/45 leading-relaxed">
              By placing this order you agree to our{" "}
              <Link href="/terms" className="link-swipe text-ink/65">
                terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="link-swipe text-ink/65">
                privacy policy
              </Link>
              .
            </p>
          </div>

          <Link
            href="/cart"
            className="mt-4 block text-center text-[11px] tracking-[0.25em] uppercase text-ink/55 hover:text-navy transition-colors"
          >
            ← Back to bag
          </Link>
        </aside>
      </section>
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const INPUT =
  "w-full bg-transparent border-b border-navy/20 focus:border-navy outline-none py-2.5 text-navy placeholder:text-ink/35 transition-colors";

function FormSection({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-3 mb-5">
        <span className="text-[10px] tracking-[0.3em] uppercase text-gold tabular">
          /{index}
        </span>
        <h2 className="font-display text-2xl text-navy">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] tracking-[0.25em] uppercase text-ink/55 mb-1.5">
        {label}
      </span>
      {children}
      {error && (
        <span className="block mt-1 text-xs text-rose-700">{error}</span>
      )}
    </label>
  );
}

function AddressFields({
  value,
  onChange,
}: {
  value: AddressDraft;
  onChange: (v: AddressDraft) => void;
}) {
  const set =
    (k: keyof AddressDraft) => (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...value, [k]: e.target.value });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <Field label="First name">
        <input required value={value.first_name} onChange={set("first_name")} className={INPUT} />
      </Field>
      <Field label="Last name">
        <input required value={value.last_name} onChange={set("last_name")} className={INPUT} />
      </Field>
      <Field label="Company (optional)">
        <input value={value.company} onChange={set("company")} className={INPUT} />
      </Field>
      <Field label="Phone (order contact)">
        <PhoneField
          value={value.phone}
          onChange={(v) => onChange({ ...value, phone: v })}
          required
          placeholder="Delivery contact number"
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Address line 1">
          <input required value={value.line1} onChange={set("line1")} className={INPUT} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Address line 2 (optional)">
          <input value={value.line2} onChange={set("line2")} className={INPUT} />
        </Field>
      </div>
      <Field label="City">
        <input required value={value.city} onChange={set("city")} className={INPUT} />
      </Field>
      <Field label="State / region">
        <input value={value.state} onChange={set("state")} className={INPUT} />
      </Field>
      <Field label="Postcode">
        <input required value={value.postcode} onChange={set("postcode")} className={INPUT} />
      </Field>
      <Field label="Country">
        <input required value={value.country} onChange={set("country")} className={INPUT} />
      </Field>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${
        bold ? "pt-3 mt-2 border-t border-[var(--jmn-line)] text-navy font-medium text-base" : ""
      }`}
    >
      <span className="text-ink/60">{label}</span>
      <span className="tabular text-navy">{value}</span>
    </div>
  );
}

// Convert the snake_case form draft into the camelCase `Address` shape that
// the storefront client expects (it re-serialises to snake_case for Django).
function addressDraftToFrontend(d: AddressDraft) {
  return {
    firstName: d.first_name,
    lastName: d.last_name,
    company: d.company || undefined,
    line1: d.line1,
    line2: d.line2 || undefined,
    city: d.city,
    state: d.state || undefined,
    postcode: d.postcode,
    country: d.country,
    phone: d.phone || "",
  };
}

// Fix unused import lint (icon imported for visual consistency in future).
void ArrowRight;
