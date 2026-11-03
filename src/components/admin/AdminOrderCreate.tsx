"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Loader2,
  Plus,
  Search,
  Trash2,
  User as UserIcon,
  X,
} from "lucide-react";
import {
  djangoAdmin,
  type AdminUserShape,
  type PaginatedResponse,
} from "@/lib/django-admin";
import { formatPrice } from "@/lib/utils";

interface AdminProduct {
  id: string;
  sku: string;
  name: string;
  slug: string;
  price: string | number;
  currency: string;
  images: string[];
  colors: Array<{ name: string; hex: string }>;
  sizes: Array<{ label: string }>;
}

interface OrderLine {
  product: AdminProduct;
  color: string;
  size: string;
  quantity: number;
  unit_price_override?: number | null;
}

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

const PAYMENT_METHODS = [
  { value: "card", label: "Card" },
  { value: "paypal", label: "PayPal" },
  { value: "apple_pay", label: "Apple Pay" },
  { value: "google_pay", label: "Google Pay" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cod", label: "Cash on delivery" },
];

const PAYMENT_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "authorized", label: "Authorized" },
  { value: "paid", label: "Paid" },
];

export default function AdminOrderCreate({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  // ── Customer ────────────────────────────────────────────────────────────────
  const [customer, setCustomer] = useState<AdminUserShape | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [fetchedCustomers, setCustomerResults] = useState<AdminUserShape[]>([]);
  // Empty search → no results, derived rather than reset from the effect
  // (react-hooks/set-state-in-effect).
  const customerResults = customerSearch.trim() ? fetchedCustomers : [];
  const [customerOpen, setCustomerOpen] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  // Lookup customers (debounced)
  useEffect(() => {
    if (!customerSearch.trim()) return;
    const t = setTimeout(async () => {
      try {
        const data = await djangoAdmin.users.list({
          account_type: "customer",
          search: customerSearch.trim(),
        });
        const items =
          (data as PaginatedResponse<AdminUserShape>).results ??
          (data as unknown as AdminUserShape[]);
        setCustomerResults(items.slice(0, 8));
      } catch {
        setCustomerResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [customerSearch]);

  // ── Items ──────────────────────────────────────────────────────────────────
  const [productSearch, setProductSearch] = useState("");
  const [fetchedProducts, setProductResults] = useState<AdminProduct[]>([]);
  const productResults = productSearch.trim() ? fetchedProducts : [];
  const [productSearching, setProductSearching] = useState(false);
  const [lines, setLines] = useState<OrderLine[]>([]);

  useEffect(() => {
    if (!productSearch.trim()) return;
    const t = setTimeout(async () => {
      setProductSearching(true);
      try {
        const data = await djangoAdmin.products.list({
          search: productSearch.trim(),
          status: "active",
        } as Parameters<typeof djangoAdmin.products.list>[0]);
        const items =
          (data as PaginatedResponse<AdminProduct>).results ??
          (data as unknown as AdminProduct[]);
        setProductResults(items.slice(0, 8));
      } catch {
        setProductResults([]);
      } finally {
        setProductSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [productSearch]);

  function addLine(product: AdminProduct) {
    const color = product.colors?.[0]?.name ?? "";
    const size = product.sizes?.[0]?.label ?? "";
    setLines((prev) => [
      ...prev,
      { product, color, size, quantity: 1 },
    ]);
    setProductSearch("");
    setProductResults([]);
  }

  function updateLine(i: number, patch: Partial<OrderLine>) {
    setLines((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  // ── Addresses ──────────────────────────────────────────────────────────────
  const [shipping, setShipping] = useState<AddressDraft>(EMPTY_ADDRESS);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billing, setBilling] = useState<AddressDraft>(EMPTY_ADDRESS);

  // Payment & misc
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [couponCode, setCouponCode] = useState("");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [shippingOverride, setShippingOverride] = useState<string>("");
  const [taxOverride, setTaxOverride] = useState<string>("");

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  // Live subtotal
  const subtotal = useMemo(
    () =>
      lines.reduce((sum, l) => {
        const p = l.unit_price_override ?? Number(l.product.price);
        return sum + p * l.quantity;
      }, 0),
    [lines],
  );

  const customerEmail = customer?.email ?? guestEmail;
  const canSubmit = !!customerEmail && lines.length > 0 && !!shipping.line1;

  async function submit() {
    setError(null);
    setErrors({});
    setSubmitting(true);
    try {
      await djangoAdmin.orders.create({
        user: customer?.id ?? null,
        customer_email: customerEmail,
        customer_phone: customer?.phone_number ?? guestPhone ?? "",
        shipping_address: shipping as unknown as Record<string, unknown>,
        billing_address: billingSameAsShipping
          ? undefined
          : (billing as unknown as Record<string, unknown>),
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        coupon_code: couponCode.trim() || undefined,
        notes: notes || undefined,
        internal_notes: internalNotes || undefined,
        shipping_override: shippingOverride === "" ? null : Number(shippingOverride),
        tax_override: taxOverride === "" ? null : Number(taxOverride),
        items: lines.map((l) => ({
          product: l.product.id,
          color: l.color,
          size: l.size,
          quantity: l.quantity,
          unit_price_override:
            l.unit_price_override === undefined ? null : l.unit_price_override,
        })),
      });
      onCreated();
    } catch (e) {
      const err = e as Error & { fields?: Record<string, string[]> };
      if (err.fields && Object.keys(err.fields).length) setErrors(err.fields);
      else setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] bg-navy/40 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl h-full overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-6 py-5 border-b border-[var(--jmn-line)] flex items-center justify-between shrink-0">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-gold mb-1">
              New
            </p>
            <h2 className="font-display text-2xl text-navy">Create order</h2>
            <p className="text-[11px] text-ink/55 mt-1">
              Take an order on behalf of a customer.
            </p>
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

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
          {/* ── Customer ─────────────────────────────────────────── */}
          <section>
            <SectionHeader index="01" title="Customer" />
            {customer ? (
              <div className="flex items-center justify-between gap-3 bg-white border border-[var(--jmn-line)] rounded-md p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="h-9 w-9 rounded-full bg-navy/5 text-navy grid place-items-center text-sm font-medium shrink-0">
                    {(customer.first_name?.[0] || customer.email[0]).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-navy truncate">
                      {customer.full_name || customer.email}
                    </p>
                    <p className="text-[11px] text-ink/45 truncate">
                      {customer.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomer(null)}
                  className="text-[11px] tracking-[0.18em] uppercase text-rose-700 hover:text-rose-900 px-2 py-1"
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <div className="flex items-center gap-2 px-3 h-10 rounded-md bg-white border border-[var(--jmn-line)]">
                    <Search size={14} className="text-ink/45" />
                    <input
                      value={customerSearch}
                      onFocus={() => setCustomerOpen(true)}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setCustomerOpen(true);
                      }}
                      placeholder="Search customer by email or name…"
                      className="flex-1 bg-transparent outline-none text-sm text-navy placeholder:text-ink/40"
                    />
                  </div>
                  {customerOpen && customerResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-12 z-10 bg-white border border-[var(--jmn-line)] rounded-md shadow-lg max-h-64 overflow-y-auto">
                      {customerResults.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setCustomer(u);
                            setCustomerSearch("");
                            setCustomerResults([]);
                            setCustomerOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-[#F4F5F7] flex items-center gap-3"
                        >
                          <span className="h-8 w-8 rounded-full bg-navy/5 text-navy grid place-items-center text-xs font-medium">
                            {(u.first_name?.[0] || u.email[0]).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm text-navy truncate">
                              {u.full_name || u.email}
                            </p>
                            <p className="text-[11px] text-ink/45 truncate">
                              {u.email}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <p className="my-3 text-center text-[10px] tracking-[0.3em] uppercase text-ink/35">
                  — or guest checkout —
                </p>

                <div className="grid sm:grid-cols-2 gap-2">
                  <Field label="Email">
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="customer@example.com"
                      className={INPUT}
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="+1 555 0100"
                      className={INPUT}
                    />
                  </Field>
                </div>
              </>
            )}
          </section>

          {/* ── Items ────────────────────────────────────────────── */}
          <section>
            <SectionHeader index="02" title={`Items (${lines.length})`} />

            <div className="relative">
              <div className="flex items-center gap-2 px-3 h-10 rounded-md bg-white border border-[var(--jmn-line)]">
                <Search size={14} className="text-ink/45" />
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search product by name or SKU…"
                  className="flex-1 bg-transparent outline-none text-sm text-navy placeholder:text-ink/40"
                />
                {productSearching && (
                  <Loader2 size={13} className="animate-spin text-ink/45" />
                )}
              </div>
              {productResults.length > 0 && (
                <div className="absolute left-0 right-0 top-12 z-10 bg-white border border-[var(--jmn-line)] rounded-md shadow-lg max-h-72 overflow-y-auto">
                  {productResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addLine(p)}
                      className="w-full text-left px-3 py-2 hover:bg-[#F4F5F7] flex items-center gap-3"
                    >
                      <div className="h-10 w-9 shrink-0 overflow-hidden rounded bg-bone">
                        {p.images?.[0] && (
                          <Image
                            src={p.images[0]}
                            alt=""
                            width={36}
                            height={40}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-navy truncate">{p.name}</p>
                        <p className="text-[11px] text-ink/45 tabular">{p.sku}</p>
                      </div>
                      <span className="tabular text-sm text-navy shrink-0">
                        {formatPrice(Number(p.price), p.currency)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {lines.length === 0 ? (
              <div className="mt-3 px-4 py-8 rounded-md border border-dashed border-[var(--jmn-line)] text-center text-sm text-ink/55">
                Search and pick products to add them as line items.
              </div>
            ) : (
              <ul className="mt-3 space-y-2">
                {lines.map((line, i) => (
                  <li
                    key={i}
                    className="bg-white border border-[var(--jmn-line)] rounded-md p-3 space-y-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-10 shrink-0 overflow-hidden rounded bg-bone">
                        {line.product.images?.[0] && (
                          <Image
                            src={line.product.images[0]}
                            alt=""
                            width={40}
                            height={48}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-navy truncate">
                          {line.product.name}
                        </p>
                        <p className="text-[11px] text-ink/45 tabular">
                          {line.product.sku}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        className="h-8 w-8 grid place-items-center rounded text-rose-700 hover:bg-rose-50 transition-colors"
                        aria-label="Remove line"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-[1fr_1fr_70px_110px] gap-2">
                      <SelectInput
                        value={line.color}
                        onChange={(v) => updateLine(i, { color: v })}
                        options={line.product.colors?.map((c) => ({
                          value: c.name,
                          label: c.name,
                        })) ?? []}
                        placeholder="Color"
                      />
                      <SelectInput
                        value={line.size}
                        onChange={(v) => updateLine(i, { size: v })}
                        options={line.product.sizes?.map((s) => ({
                          value: s.label,
                          label: s.label,
                        })) ?? []}
                        placeholder="Size"
                      />
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(i, { quantity: Number(e.target.value) || 1 })
                        }
                        className={`${INPUT} text-center`}
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={
                          line.unit_price_override ?? Number(line.product.price)
                        }
                        onChange={(e) =>
                          updateLine(i, {
                            unit_price_override:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          })
                        }
                        className={`${INPUT} text-right tabular`}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Shipping ────────────────────────────────────────── */}
          <section>
            <SectionHeader index="03" title="Shipping address" />
            <AddressFields value={shipping} onChange={setShipping} />
            <label className="mt-3 inline-flex items-center gap-2 text-sm text-ink/70 cursor-pointer">
              <input
                type="checkbox"
                checked={billingSameAsShipping}
                onChange={(e) => setBillingSameAsShipping(e.target.checked)}
                className="accent-navy h-4 w-4"
              />
              Billing same as shipping
            </label>
            {!billingSameAsShipping && (
              <div className="mt-4">
                <p className="text-[11px] tracking-[0.2em] uppercase text-ink/55 mb-2">
                  Billing address
                </p>
                <AddressFields value={billing} onChange={setBilling} />
              </div>
            )}
          </section>

          {/* ── Payment & extras ────────────────────────────────── */}
          <section>
            <SectionHeader index="04" title="Payment & totals" />
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Payment method">
                <SelectInput
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  options={PAYMENT_METHODS}
                />
              </Field>
              <Field label="Payment status">
                <SelectInput
                  value={paymentStatus}
                  onChange={setPaymentStatus}
                  options={PAYMENT_STATUSES}
                />
              </Field>
              <Field label="Coupon code (optional)">
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="WELCOME10"
                  className={INPUT}
                />
              </Field>
              <Field label="Currency">
                <input
                  value="BDT"
                  disabled
                  className={`${INPUT} opacity-60`}
                />
              </Field>
              <Field label="Shipping override">
                <input
                  type="number"
                  step="0.01"
                  value={shippingOverride}
                  onChange={(e) => setShippingOverride(e.target.value)}
                  placeholder="auto"
                  className={INPUT}
                />
              </Field>
              <Field label="Tax override">
                <input
                  type="number"
                  step="0.01"
                  value={taxOverride}
                  onChange={(e) => setTaxOverride(e.target.value)}
                  placeholder="auto"
                  className={INPUT}
                />
              </Field>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Customer-facing notes">
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`${INPUT} h-auto py-2`}
                />
              </Field>
              <Field label="Internal notes (not shown to customer)">
                <textarea
                  rows={2}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className={`${INPUT} h-auto py-2`}
                />
              </Field>
            </div>
          </section>

          {/* ── Errors ──────────────────────────────────────────── */}
          {(error || Object.keys(errors).length > 0) && (
            <div className="rounded-md bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 space-y-1">
              {error && <p>{error}</p>}
              {Object.entries(errors).map(([k, v]) => (
                <p key={k}>
                  <span className="font-medium">{k}:</span> {v.join("; ")}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer with totals + submit ───────────────────────── */}
        <footer className="px-6 py-4 border-t border-[var(--jmn-line)] flex items-center justify-between gap-3 shrink-0">
          <div className="text-sm">
            <span className="text-[10px] tracking-[0.25em] uppercase text-ink/55 mr-3">
              Subtotal
            </span>
            <span className="font-display text-2xl text-navy tabular">
              {formatPrice(subtotal, "BDT")}
            </span>
            <span className="text-[11px] text-ink/45 ml-2">
              + shipping & tax
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-md border border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-ink/65 hover:text-navy hover:border-navy/30 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit || submitting}
              className="h-9 px-4 rounded-md bg-navy text-cream text-[12px] tracking-[0.1em] uppercase hover:bg-navy-deep disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              Create order
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const INPUT =
  "w-full bg-white border border-[var(--jmn-line)] rounded-md px-3 h-10 text-sm text-navy placeholder:text-ink/40 focus:border-navy/40 outline-none transition-colors";

function SectionHeader({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-3">
      <span className="text-[10px] tracking-[0.3em] uppercase text-gold tabular">
        /{index}
      </span>
      <h3 className="font-display text-xl text-navy">{title}</h3>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] tracking-[0.25em] uppercase text-ink/55 mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}

function SelectInput({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${INPUT} appearance-none pr-8`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-ink/45 pointer-events-none"
      />
    </div>
  );
}

function AddressFields({
  value,
  onChange,
}: {
  value: AddressDraft;
  onChange: (v: AddressDraft) => void;
}) {
  const set = (k: keyof AddressDraft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [k]: e.target.value });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="First name">
        <input value={value.first_name} onChange={set("first_name")} className={INPUT} />
      </Field>
      <Field label="Last name">
        <input value={value.last_name} onChange={set("last_name")} className={INPUT} />
      </Field>
      <Field label="Company (optional)">
        <input value={value.company} onChange={set("company")} className={INPUT} />
      </Field>
      <Field label="Phone">
        <input value={value.phone} onChange={set("phone")} className={INPUT} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Address line 1">
          <input value={value.line1} onChange={set("line1")} className={INPUT} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Address line 2 (optional)">
          <input value={value.line2} onChange={set("line2")} className={INPUT} />
        </Field>
      </div>
      <Field label="City">
        <input value={value.city} onChange={set("city")} className={INPUT} />
      </Field>
      <Field label="State / region">
        <input value={value.state} onChange={set("state")} className={INPUT} />
      </Field>
      <Field label="Postcode">
        <input value={value.postcode} onChange={set("postcode")} className={INPUT} />
      </Field>
      <Field label="Country">
        <input value={value.country} onChange={set("country")} className={INPUT} />
      </Field>
    </div>
  );
}

void UserIcon;
void Plus;
