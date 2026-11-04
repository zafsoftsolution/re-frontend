"use client";

/**
 * POS-style Purchase Order builder.
 *
 * UX shape:
 *   1. Compact document header (supplier, warehouse, dates, …).
 *   2. A single prominent search box ("scan / search products"). Typing shows
 *      a dropdown with thumbnail · name · sku · cost · variants. Enter or
 *      click drops a row into the compact lines grid below; the search clears
 *      and refocuses so the operator can keep going without lifting their
 *      hands off the keyboard.
 *   3. The lines grid is a tight table — qty / cost / discount / tax /
 *      total. Every cell is inline-editable. Variant dropdowns auto-populate
 *      from the chosen product. Same product+variant scanned twice bumps the
 *      qty on the existing row instead of duplicating.
 *   4. Sticky totals panel on the right with the doc-level adjustments and
 *      the Save-as-draft button.
 *
 * Keyboard: ↑ / ↓ in the search dropdown to highlight a result; Enter to
 * add; Escape to close. Tab jumps cell-to-cell in the grid.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  ScanLine,
  Search,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import {
  djangoAdmin,
  type PurchasePaymentMethod,
  type SupplierShape,
} from "@/lib/django-admin";
import { useToast } from "@/context/FeedbackContext";
import PageHeader from "@/components/admin/PageHeader";
import ResourceForm from "@/components/admin/ResourceForm";
import {
  PRODUCT_INITIAL_VALUES,
  productFormFields,
  type SelectOption,
} from "@/lib/admin/product-form";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface WarehouseLite {
  id: string;
  code: string;
  name: string;
  is_default?: boolean;
}

interface ProductLite {
  id: string;
  name: string;
  sku: string;
  price: number | string;
  cost_price?: number | string;
  images: string[];
  colors: Array<{ name: string; hex: string }>;
  sizes: Array<{ label: string }>;
  total_stock?: number;
}

type DraftLine = {
  /** Stable React key. */
  key: string;
  /** UUID of the catalog product, or null for ad-hoc lines (hangtags, etc.). */
  product: string | null;
  product_name: string;
  sku: string;
  color: string;
  size: string;
  ordered_quantity: number;
  unit_cost: string;
  discount_pct: string;
  tax_pct: string;
  notes: string;
  image: string | null;
  /** Cached so we can render variant <select>s without re-fetching. */
  colorOptions: string[];
  sizeOptions: string[];
};

function rid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function lineFromProduct(p: ProductLite): DraftLine {
  return {
    key: rid(),
    product: p.id,
    product_name: p.name,
    sku: p.sku,
    color: p.colors[0]?.name ?? "",
    size: p.sizes[0]?.label ?? "",
    ordered_quantity: 1,
    unit_cost: String(p.cost_price ?? p.price ?? 0),
    discount_pct: "0",
    tax_pct: "0",
    notes: "",
    image: p.images[0] ?? null,
    colorOptions: p.colors.map((c) => c.name),
    sizeOptions: p.sizes.map((s) => s.label),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POS-style product quick search
// ─────────────────────────────────────────────────────────────────────────────

function ProductQuickSearch({
  onPick,
  inputRef,
}: {
  onPick: (p: ProductLite) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<ProductLite[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Only fire searches once the user has actually typed something — keeps
  // the dropdown empty (and hidden) when the box first gains focus.
  const trimmed = query.trim();

  // Typing flips `loading` / clears results in `changeQuery` (an event
  // handler); the effect only sets state from the debounced callback
  // (react-hooks/set-state-in-effect).
  function changeQuery(next: string) {
    setQuery(next);
    const nextTrimmed = next.trim();
    if (nextTrimmed.length === 0) {
      setResults(null);
      setLoading(false);
    } else if (nextTrimmed !== trimmed) {
      setLoading(true);
    }
  }

  useEffect(() => {
    if (trimmed.length === 0) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const data = await djangoAdmin.products.list({
          search: trimmed,
          page_size: 10,
          ordering: "-updated_at",
        });
        if (!cancelled) {
          setResults(data.results as unknown as ProductLite[]);
          setHighlighted(0);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed]);

  // Dropdown is visible only when the user is typing AND the box is focused.
  // After a commit `query` is cleared, which auto-hides this — exactly the
  // POS UX where the operator types → picks → the list disappears → next
  // keystroke reopens it.
  const showDropdown = focused && trimmed.length > 0;

  function commit(p: ProductLite) {
    onPick(p);
    changeQuery("");
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown || !results || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = results[highlighted];
      if (pick) commit(pick);
    } else if (e.key === "Escape") {
      changeQuery("");
    }
  }

  // Close after a short delay so click on a row still registers.
  function handleBlur() {
    closeTimer.current = setTimeout(() => setFocused(false), 120);
  }
  function handleFocus() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setFocused(true);
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-3 h-12 px-4 rounded-md bg-white border border-[var(--jmn-line)] focus-within:border-navy focus-within:ring-2 focus-within:ring-navy/10 transition">
        <ScanLine size={18} className="text-navy/65 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => changeQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={onKeyDown}
          placeholder="Scan or search products — name, SKU, brand…   (↵ to add)"
          className="flex-1 outline-none bg-transparent text-base placeholder:text-ink/40"
        />
        {loading && <Loader2 size={14} className="animate-spin text-ink/45" />}
        {query && !loading && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => changeQuery("")}
            className="text-ink/45 hover:text-navy"
            aria-label="Clear"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-20 left-0 right-0 mt-1.5 bg-white border border-[var(--jmn-line)] rounded-md shadow-lg overflow-hidden">
          {loading && results === null && (
            <div className="px-4 py-6 text-sm text-ink/45 text-center">
              <Loader2 size={14} className="animate-spin inline mr-2" />
              Searching…
            </div>
          )}
          {!loading && results && results.length === 0 && (
            <div className="px-4 py-6 text-sm text-ink/55 text-center">
              No products match “{trimmed}”.
            </div>
          )}
          {results && results.length > 0 && (
            <ul className="max-h-[420px] overflow-y-auto">
              {results.map((p, i) => {
                const stock = p.total_stock ?? 0;
                const cost = Number(p.cost_price ?? p.price ?? 0);
                const variants = [
                  p.colors.length
                    ? `${p.colors.length} color${p.colors.length === 1 ? "" : "s"}`
                    : null,
                  p.sizes.length
                    ? `${p.sizes.length} size${p.sizes.length === 1 ? "" : "s"}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      // Mousedown so we beat the input's blur/close timer.
                      onMouseDown={(e) => {
                        e.preventDefault();
                        commit(p);
                      }}
                      onMouseEnter={() => setHighlighted(i)}
                      className={cn(
                        "w-full px-4 py-2.5 flex items-center gap-3 text-left border-b border-[var(--jmn-line)] last:border-0 transition-colors",
                        i === highlighted ? "bg-navy/5" : "bg-white",
                      )}
                    >
                      {p.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.images[0]}
                          alt=""
                          className="w-10 h-10 rounded object-cover bg-[#F4F5F7] shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-[#F4F5F7] shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-navy truncate">{p.name}</p>
                        <p className="text-[11px] text-ink/55 tabular truncate">
                          {p.sku}
                          {variants && (
                            <span className="text-ink/35"> · {variants}</span>
                          )}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm tabular text-navy">
                          {cost.toFixed(2)}
                        </p>
                        <p
                          className={cn(
                            "text-[10px] tracking-[0.18em] uppercase tabular",
                            stock > 0 ? "text-emerald-700" : "text-rose-700",
                          )}
                        >
                          {stock > 0 ? `${stock} in stock` : "out"}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="px-4 py-2 text-[10px] tracking-[0.18em] uppercase text-ink/40 bg-[#FAFAFA] border-t border-[var(--jmn-line)] flex items-center justify-between">
            <span>Use ↑ ↓ to navigate · ↵ to add</span>
            <span className="tabular">{results?.length ?? 0} result{(results?.length ?? 0) === 1 ? "" : "s"}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const [suppliers, setSuppliers] = useState<SupplierShape[] | null>(null);
  const [warehouses, setWarehouses] = useState<WarehouseLite[] | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [brandOptions, setBrandOptions] = useState<SelectOption[]>([]);
  const [collectionOptions, setCollectionOptions] = useState<SelectOption[]>([]);
  const [createProductOpen, setCreateProductOpen] = useState(false);

  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [currency, setCurrency] = useState("BDT");
  const [expectedDate, setExpectedDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState(30);
  const [overReceiptAllowed, setOverReceiptAllowed] = useState(false);
  const [supplierRef, setSupplierRef] = useState("");
  const [docDiscount, setDocDiscount] = useState("0");
  const [docTax, setDocTax] = useState("0");
  const [docShipping, setDocShipping] = useState("0");
  const [docOther, setDocOther] = useState("0");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  const [lines, setLines] = useState<DraftLine[]>([]);

  // Direct-purchase (cash-and-carry) toggle. When ON, submit hits the
  // /direct/ endpoint which creates → approves → ordered → receives → closes
  // → records payment in one atomic transaction. The payment block below is
  // shown so the operator can enter how much / how it was settled. When OFF
  // we fall back to the regular "Save as draft" flow.
  const [directPurchase, setDirectPurchase] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PurchasePaymentMethod>("cash");
  const [payReference, setPayReference] = useState("");
  const [payDate, setPayDate] = useState(""); // YYYY-MM-DD
  const [payNote, setPayNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fullscreen work-area mode — slides a near-full-width overlay in from the
  // right with the same product search + lines table, just with more room
  // to breathe. Same state, just a different parent container.
  const [fullscreen, setFullscreen] = useState(false);

  // Body scroll lock + auto-focus the search box when entering fullscreen,
  // and Escape closes the overlay.
  useEffect(() => {
    if (!fullscreen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = setTimeout(() => searchInputRef.current?.focus(), 80);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFullscreen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  // Initial load: suppliers + warehouses + catalog taxonomies, then auto-focus
  // the search box. Categories / brands / collections feed the shared product
  // form used by the "Create new product" drawer.
  useEffect(() => {
    (async () => {
      try {
        const [sup, wh, cats, brs, cols] = await Promise.all([
          djangoAdmin.suppliers.list({ page_size: 200, status: "active" }),
          djangoAdmin.warehouses.list({ page_size: 100 }),
          djangoAdmin.categories.list() as Promise<unknown>,
          djangoAdmin.brands.list() as Promise<unknown>,
          djangoAdmin.collections.list() as Promise<unknown>,
        ]);
        const supList = sup as { results: SupplierShape[] } | SupplierShape[];
        const whList = wh as { results: WarehouseLite[] } | WarehouseLite[];
        const supplierResults = Array.isArray(supList) ? supList : supList.results;
        const warehouseResults = Array.isArray(whList) ? whList : whList.results;
        setSuppliers(supplierResults);
        setWarehouses(warehouseResults);
        const defaultWh =
          warehouseResults.find((w) => w.is_default) ?? warehouseResults[0];
        if (defaultWh) setWarehouseId(defaultWh.id);

        const toOptions = (data: unknown): SelectOption[] => {
          const items =
            (data as { results?: Array<{ id: string; name: string }> }).results ??
            (data as Array<{ id: string; name: string }>);
          return (items ?? []).map((x) => ({ value: x.id, label: x.name }));
        };
        setCategoryOptions(toOptions(cats));
        setBrandOptions(toOptions(brs));
        setCollectionOptions(toOptions(cols));
      } catch (e) {
        setError((e as Error).message);
      }
      // Pull focus to the search bar once the page mounts.
      setTimeout(() => searchInputRef.current?.focus(), 50);
    })();
  }, []);

  // When supplier changes, default currency + payment terms.
  function changeSupplier(nextId: string) {
    setSupplierId(nextId);
    const s = nextId ? suppliers?.find((x) => x.id === nextId) : undefined;
    if (s) {
      setCurrency(s.default_currency || "BDT");
      setPaymentTerms(s.payment_terms_days ?? 30);
    }
  }

  // Add via product picker — auto-merge same product+variant.
  const addProduct = useCallback((p: ProductLite) => {
    setLines((prev) => {
      const color = p.colors[0]?.name ?? "";
      const size = p.sizes[0]?.label ?? "";
      const existing = prev.findIndex(
        (l) => l.product === p.id && l.color === color && l.size === size,
      );
      if (existing >= 0) {
        const next = prev.slice();
        next[existing] = {
          ...next[existing],
          ordered_quantity: next[existing].ordered_quantity + 1,
        };
        return next;
      }
      return [...prev, lineFromProduct(p)];
    });
  }, []);

  function setLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    );
  }
  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  // Live totals.
  const totals = useMemo(() => {
    let subtotal = 0;
    let lineDiscount = 0;
    let lineTax = 0;
    let totalQty = 0;
    for (const l of lines) {
      const qty = Number(l.ordered_quantity) || 0;
      const cost = Number(l.unit_cost) || 0;
      const dpct = Number(l.discount_pct) || 0;
      const tpct = Number(l.tax_pct) || 0;
      const gross = qty * cost;
      const disc = gross * (dpct / 100);
      const net = gross - disc;
      const tax = net * (tpct / 100);
      subtotal += gross;
      lineDiscount += disc;
      lineTax += tax;
      totalQty += qty;
    }
    const docDisc = Number(docDiscount) || 0;
    const docT = Number(docTax) || 0;
    const docShip = Number(docShipping) || 0;
    const docOth = Number(docOther) || 0;
    const total =
      subtotal - lineDiscount - docDisc + lineTax + docT + docShip + docOth;
    return {
      subtotal,
      lineDiscount,
      lineTax,
      docDiscount: docDisc,
      docTax: docT,
      docShipping: docShip,
      docOther: docOth,
      total,
      totalQty,
    };
  }, [lines, docDiscount, docTax, docShipping, docOther]);

  // Friendly error helper: shows the banner *and* fires a toast so the
  // operator sees something whether they're scrolled near the button at the
  // bottom or near the top. Always scrolls the banner into view.
  function fail(msg: string) {
    setError(msg);
    toast.error(msg);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    return;
  }

  async function handleSubmit() {
    setError(null);
    if (!supplierId) return fail("Pick a supplier");
    if (!warehouseId) return fail("Pick a warehouse");

    const items = lines
      .filter((l) => l.product_name && l.ordered_quantity > 0)
      .map((l) => ({
        product: l.product,
        product_name: l.product_name,
        sku: l.sku,
        color: l.color,
        size: l.size,
        ordered_quantity: Number(l.ordered_quantity),
        unit_cost: Number(l.unit_cost) || 0,
        discount_pct: Number(l.discount_pct) || 0,
        tax_pct: Number(l.tax_pct) || 0,
        notes: l.notes,
      }));

    if (items.length === 0) return fail("Add at least one line");

    // Direct purchase needs a catalog product on every line — the StockLevel
    // table has product as a NOT NULL FK so an ad-hoc / non-catalog row has
    // nowhere to land. Catch it here with a friendly toast so the operator
    // doesn't get a wall of server JSON.
    if (directPurchase) {
      const orphanLine = items.find((it) => !it.product);
      if (orphanLine) {
        return fail(
          `“${orphanLine.product_name || orphanLine.sku || "Custom line"}” needs a catalog product. Use the search box or “Create new product” first.`,
        );
      }
      const amount = payAmount.trim();
      if (amount === "" || Number.isNaN(Number(amount))) {
        return fail("Enter how much you paid the supplier");
      }
      if (Number(amount) < 0) {
        return fail("Paid amount must be non-negative");
      }
      // Overpayment guard — mirrors the server check. 0.01 wiggle room for
      // the cent-precision rounding noise on the total.
      if (Number(amount) - totals.total > 0.01) {
        return fail(
          `Paid amount (${currency} ${Number(amount).toFixed(2)}) exceeds the total (${currency} ${totals.total.toFixed(2)}). Record the rest as a separate payment if needed.`,
        );
      }
    }

    setSubmitting(true);
    try {
      if (directPurchase) {
        // /direct/ — creates + approves + orders + receives + closes + pays
        // in one atomic transaction.
        const po = await djangoAdmin.purchaseOrders.directPurchase({
          supplier: supplierId,
          warehouse: warehouseId,
          currency,
          expected_delivery_date: expectedDate || null,
          payment_terms_days: paymentTerms,
          discount: Number(docDiscount) || 0,
          tax: Number(docTax) || 0,
          shipping: Number(docShipping) || 0,
          other_charges: Number(docOther) || 0,
          supplier_reference: supplierRef,
          notes,
          internal_notes: internalNotes,
          items,
          payment:
            Number(payAmount) > 0
              ? {
                  amount: Number(payAmount),
                  method: payMethod,
                  reference: payReference,
                  // Send YYYY-MM-DD as local-noon ISO so the server gets a
                  // sensible datetime no matter the operator's TZ.
                  paid_at: payDate
                    ? new Date(payDate + "T12:00:00").toISOString()
                    : null,
                  note: payNote,
                }
              : undefined,
        });
        toast.success(
          "Purchase completed",
          `${po.number} · ${po.currency} ${Number(po.total).toFixed(2)} · stock added`,
        );
        router.push(`/admin/purchase-orders/${po.id}`);
        return;
      }

      const po = await djangoAdmin.purchaseOrders.create({
        supplier: supplierId,
        warehouse: warehouseId,
        currency,
        expected_delivery_date: expectedDate || null,
        payment_terms_days: paymentTerms,
        over_receipt_allowed: overReceiptAllowed,
        discount: Number(docDiscount) || 0,
        tax: Number(docTax) || 0,
        shipping: Number(docShipping) || 0,
        other_charges: Number(docOther) || 0,
        supplier_reference: supplierRef,
        notes,
        internal_notes: internalNotes,
        items,
      });
      toast.success("Draft purchase order saved", po.number);
      router.push(`/admin/purchase-orders/${po.id}`);
    } catch (e) {
      // Surface API field errors specifically — DRF wraps them under `fields`
      // so a 400 with `{"items":["At least one line is required"]}` becomes a
      // readable toast.
      const err = e as Error & { fields?: Record<string, string[]> };
      const fieldMsg =
        err.fields && Object.keys(err.fields).length
          ? `${Object.keys(err.fields)[0]}: ${Object.values(err.fields)[0]?.[0] ?? ""}`
          : null;
      const msg = fieldMsg || err.message || "Couldn't save the purchase order.";
      setError(msg);
      toast.error(
        directPurchase ? "Direct purchase failed" : "Couldn't save draft",
        msg,
      );
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Purchasing"
        title="New purchase order"
        description="POS-style entry. Search a product, hit ↵ to drop it in. Edit qty / cost inline."
        actions={
          <Link
            href="/admin/purchase-orders"
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm border border-[var(--jmn-line)] hover:bg-[#FAFAFA]"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-md bg-rose-50 ring-1 ring-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        {/* ── Left column ───────────────────────────────────────────── */}
        <div className="space-y-5 min-w-0">
          {/*
           * Direct Purchase toggle — when ON, the form posts to /direct/
           * which creates → approves → orders → receives (full qty) →
           * closes → records payment in one atomic transaction. Used for
           * cash-and-carry buys (walk into a store, pay, walk out with
           * inventory). When OFF the form saves a regular draft PO that
           * the operator submits / approves / receives step-by-step on the
           * detail page.
           */}
          <section
            className={cn(
              "rounded-lg border p-4 flex items-start gap-3 transition-colors",
              directPurchase
                ? "bg-amber-50 border-amber-300"
                : "bg-white border-[var(--jmn-line)]",
            )}
          >
            <div
              className={cn(
                "h-10 w-10 grid place-items-center rounded-md shrink-0",
                directPurchase
                  ? "bg-amber-500 text-white"
                  : "bg-[#F4F5F7] text-ink/55",
              )}
            >
              <Zap size={18} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-navy">
                  Direct purchase
                </h3>
                {directPurchase && (
                  <span className="text-[10px] tracking-[0.18em] uppercase px-2 py-0.5 rounded-full bg-amber-500 text-white">
                    ON
                  </span>
                )}
              </div>
              <p className="text-[12px] text-ink/65 mt-0.5 leading-relaxed">
                Cash-and-carry mode: commits stock immediately and records
                the payment in one step. Skip if you&apos;re ordering for a
                later delivery — use a regular draft PO instead.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 shrink-0 cursor-pointer select-none">
              <span className="text-[11px] tracking-[0.18em] uppercase text-ink/55">
                {directPurchase ? "On" : "Off"}
              </span>
              <span className="relative inline-block w-10 h-6">
                <input
                  type="checkbox"
                  checked={directPurchase}
                  onChange={(e) => setDirectPurchase(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="block w-10 h-6 rounded-full bg-ink/20 peer-checked:bg-amber-500 transition-colors" />
                <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
              </span>
            </label>
          </section>

          {/* Document header — compact horizontal strip */}
          <section className="bg-white border border-[var(--jmn-line)] rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <Field label="Supplier" required>
                <select
                  value={supplierId}
                  onChange={(e) => changeSupplier(e.target.value)}
                  className="input"
                >
                  <option value="">— Choose —</option>
                  {suppliers?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Warehouse" required>
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="input"
                >
                  <option value="">— Choose —</option>
                  {warehouses?.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Currency">
                <input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  maxLength={3}
                  className="input tabular"
                />
              </Field>
              <Field label="Expected">
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="input tabular"
                />
              </Field>
              <Field label="Payment (days)">
                <input
                  type="number"
                  min={0}
                  value={paymentTerms}
                  onChange={(e) =>
                    setPaymentTerms(Number(e.target.value) || 0)
                  }
                  className="input tabular"
                />
              </Field>
              <Field label="Supplier ref">
                <input
                  value={supplierRef}
                  onChange={(e) => setSupplierRef(e.target.value)}
                  className="input"
                />
              </Field>
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-ink/65 mt-3">
              <input
                type="checkbox"
                checked={overReceiptAllowed}
                onChange={(e) => setOverReceiptAllowed(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              Allow goods receipts that exceed the ordered quantity
            </label>
          </section>

          {/*
           * Work area — search + lines table. The wrapper uses `display:
           * contents` in normal flow so it doesn't affect the layout of the
           * left column. When fullscreen mode is toggled it morphs into a
           * fixed near-full-width overlay sliding in from the right, giving
           * the operator more room to scan products and edit lines without
           * losing any state (lines are stored on the parent, so they're
           * preserved across the toggle).
           */}
          <div
            className={cn(
              fullscreen
                ? "fixed inset-y-0 right-0 left-0 md:left-[5%] z-[80] bg-cream shadow-2xl shadow-navy/20 overflow-y-auto px-4 md:px-8 py-6 space-y-6 jmn-fullscreen-in"
                : "contents",
            )}
          >
            {fullscreen && (
              <header className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--jmn-line)] sticky top-0 bg-cream z-[1] -mx-4 md:-mx-8 px-4 md:px-8 pt-2">
                <div className="min-w-0">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-gold mb-1">
                    Purchasing · Fullscreen
                  </p>
                  <h2 className="font-display text-2xl text-navy">
                    Add items
                  </h2>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {lines.length > 0 && (
                    <div className="hidden md:block text-right">
                      <p className="text-[10px] tracking-[0.18em] uppercase text-ink/45">
                        Running total
                      </p>
                      <p className="text-sm font-semibold text-navy tabular">
                        {lines.length} line
                        {lines.length === 1 ? "" : "s"} ·{" "}
                        {currency} {totals.total.toFixed(2)}
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setFullscreen(false)}
                    aria-label="Exit fullscreen"
                    title="Exit fullscreen (Esc)"
                    className="h-10 w-10 grid place-items-center rounded-md border border-[var(--jmn-line)] hover:bg-white text-navy transition-colors"
                  >
                    <Minimize2 size={16} />
                  </button>
                </div>
              </header>
            )}

            {/* POS search */}
            <section>
              <ProductQuickSearch onPick={addProduct} inputRef={searchInputRef} />
              <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-[11px] text-ink/45">
                  Tip — scan or type to add. Same product+variant is auto-merged.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateProductOpen(true)}
                    title="Create a new catalog product and add it to this PO"
                    className="inline-flex items-center gap-1.5 text-xs text-navy hover:underline"
                  >
                    <Plus size={12} />
                    Create new product
                  </button>
                  {!fullscreen && (
                    <button
                      type="button"
                      onClick={() => setFullscreen(true)}
                      title="Open fullscreen entry mode"
                      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-navy hover:bg-navy hover:text-cream transition-colors"
                    >
                      <Maximize2 size={11} />
                      Fullscreen
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Lines table */}
            <section className="bg-white border border-[var(--jmn-line)] rounded-lg overflow-hidden">
              <header className="px-4 py-3 border-b border-[var(--jmn-line)] flex items-center justify-between">
                <h2 className="text-[10px] tracking-[0.3em] uppercase text-gold">
                  Lines{lines.length > 0 ? ` (${lines.length})` : ""}
                </h2>
                {lines.length > 0 && (
                  <span className="text-xs text-ink/55 tabular">
                    {totals.totalQty} unit{totals.totalQty === 1 ? "" : "s"} ·{" "}
                    {currency} {totals.total.toFixed(2)}
                  </span>
                )}
              </header>

            {lines.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <Search size={20} className="mx-auto text-ink/30 mb-2" />
                <p className="text-sm text-ink/55">
                  No lines yet — search a product above to start.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#FAFAFA] text-[10px] tracking-[0.18em] uppercase text-ink/55">
                    <tr>
                      <th className="text-left font-medium pl-4 pr-2 py-2.5 w-[28%]">
                        Item
                      </th>
                      <th className="text-left font-medium px-2 py-2.5 w-[12%]">
                        Color
                      </th>
                      <th className="text-left font-medium px-2 py-2.5 w-[10%]">
                        Size
                      </th>
                      <th className="text-right font-medium px-2 py-2.5 w-[8%]">
                        Qty
                      </th>
                      <th className="text-right font-medium px-2 py-2.5 w-[12%]">
                        Cost
                      </th>
                      <th className="text-right font-medium px-2 py-2.5 w-[8%]">
                        Disc %
                      </th>
                      <th className="text-right font-medium px-2 py-2.5 w-[8%]">
                        Tax %
                      </th>
                      <th className="text-right font-medium px-2 py-2.5 w-[12%]">
                        Total
                      </th>
                      <th className="px-2 py-2.5 w-[40px]" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <LineRow
                        key={line.key}
                        line={line}
                        currency={currency}
                        onChange={(patch) => setLine(line.key, patch)}
                        onRemove={() => removeLine(line.key)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </section>
          </div>
          {/* /work-area wrapper */}

          {/* Notes */}
          <section className="bg-white border border-[var(--jmn-line)] rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Notes for supplier" full>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="input"
                placeholder="Delivery instructions, special requests…"
              />
            </Field>
            <Field label="Internal notes (never sent)" full>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={2}
                className="input"
              />
            </Field>
          </section>
        </div>

        {/* ── Right column ──────────────────────────────────────────── */}
        <aside className="space-y-4 xl:sticky xl:top-4 self-start">
          <section className="bg-white border border-[var(--jmn-line)] rounded-lg p-5 space-y-2">
            <h2 className="text-[10px] tracking-[0.3em] uppercase text-gold mb-1">
              Totals
            </h2>
            <Row
              label="Subtotal"
              value={`${currency} ${totals.subtotal.toFixed(2)}`}
            />
            <Row
              label="Line discount"
              value={`− ${currency} ${totals.lineDiscount.toFixed(2)}`}
            />
            <Row
              label="Line tax"
              value={`${currency} ${totals.lineTax.toFixed(2)}`}
            />

            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[var(--jmn-line)]">
              <Field label="Doc discount">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={docDiscount}
                  onChange={(e) => setDocDiscount(e.target.value)}
                  className="input tabular"
                />
              </Field>
              <Field label="Doc tax">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={docTax}
                  onChange={(e) => setDocTax(e.target.value)}
                  className="input tabular"
                />
              </Field>
              <Field label="Shipping">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={docShipping}
                  onChange={(e) => setDocShipping(e.target.value)}
                  className="input tabular"
                />
              </Field>
              <Field label="Other">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={docOther}
                  onChange={(e) => setDocOther(e.target.value)}
                  className="input tabular"
                />
              </Field>
            </div>

            <div className="pt-3 border-t border-[var(--jmn-line)] flex items-center justify-between">
              <span className="text-sm font-medium text-navy">Total</span>
              <span className="text-xl font-semibold text-navy tabular">
                {currency} {totals.total.toFixed(2)}
              </span>
            </div>
          </section>

          {/*
           * Payment card — only rendered when Direct purchase is ON. The
           * paid-amount input is intentionally empty by default; the
           * operator types whatever they actually handed over (partial pay
           * is fine — the resulting invoice will show with a balance).
           */}
          {directPurchase && (
            <section className="bg-white border border-amber-300 ring-1 ring-amber-100 rounded-lg p-5 space-y-3">
              <header className="flex items-center justify-between">
                <h2 className="text-[10px] tracking-[0.3em] uppercase text-amber-700">
                  Payment to supplier
                </h2>
                <button
                  type="button"
                  onClick={() => setPayAmount(totals.total.toFixed(2))}
                  className="text-[11px] tracking-[0.18em] uppercase text-navy hover:underline"
                >
                  Pay full
                </button>
              </header>
              <Field label={`Paid amount (${currency})`} required>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder={`0.00 of ${totals.total.toFixed(2)}`}
                  className="input tabular"
                />
              </Field>
              <Field label="Method">
                <select
                  value={payMethod}
                  onChange={(e) =>
                    setPayMethod(e.target.value as PurchasePaymentMethod)
                  }
                  className="input"
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank transfer</option>
                  <option value="mobile">Mobile / wallet</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Reference" hint="Txn / cheque #">
                  <input
                    value={payReference}
                    onChange={(e) => setPayReference(e.target.value)}
                    placeholder="TXN-1234"
                    className="input"
                  />
                </Field>
                <Field label="Paid on">
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="input tabular"
                  />
                </Field>
              </div>
              <Field label="Note" full>
                <input
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="Optional — gets journaled on the PO"
                  className="input"
                />
              </Field>
              {Number(payAmount) > 0 && (
                <div className="pt-2 border-t border-amber-100 text-[12px] text-ink/65 flex items-center justify-between">
                  <span>Balance after this payment</span>
                  <span className="tabular text-navy font-medium">
                    {currency}{" "}
                    {Math.max(0, totals.total - Number(payAmount)).toFixed(2)}
                  </span>
                </div>
              )}
            </section>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || lines.length === 0}
            className={cn(
              "w-full h-12 rounded-md font-medium hover:opacity-90 disabled:opacity-40 inline-flex items-center justify-center gap-2 text-base transition-colors",
              directPurchase
                ? "bg-amber-500 text-white"
                : "bg-navy text-cream",
            )}
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : directPurchase ? (
              <CheckCircle2 size={16} />
            ) : null}
            {directPurchase ? "Complete purchase" : "Save as draft"}
          </button>
          <p className="text-[11px] text-ink/55 text-center px-2">
            {directPurchase
              ? "Stock will be added immediately and payment recorded as one transaction."
              : "Saved as draft. Submit, approve and place with the supplier on the next screen."}
          </p>
        </aside>
      </div>

      {/* Create-product modal — the same ResourceForm the `/admin/products`
          page uses, driven by the shared product-form config so every field
          (images, color/size variants, brand, collection, marketing flags,
          SEO, etc.) is available here too. On submit we save the product to
          the catalog and drop it straight onto this PO as a line. */}
      {createProductOpen && (
        <CreateProductModal
          categories={categoryOptions}
          brands={brandOptions}
          collections={collectionOptions}
          defaultCurrency={currency}
          onClose={() => setCreateProductOpen(false)}
          onCreated={(p) => {
            setCreateProductOpen(false);
            addProduct(p);
          }}
        />
      )}

      {/* Inline styles for inputs — match the rest of the admin look. */}
      <style jsx global>{`
        /* Fullscreen entry-mode slide-in. Keep it quick (240ms) — the
           operator is mid-workflow, the transition shouldn't get in the way. */
        @keyframes jmn-fullscreen-in {
          from { transform: translateX(2%); opacity: 0; }
          to   { transform: translateX(0);  opacity: 1; }
        }
        .jmn-fullscreen-in {
          animation: jmn-fullscreen-in 240ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .input {
          width: 100%;
          height: 36px;
          padding: 0 10px;
          border: 1px solid var(--jmn-line);
          border-radius: 6px;
          background: white;
          font-size: 14px;
          color: var(--jmn-ink, #0a0a0a);
        }
        .input:focus {
          outline: none;
          border-color: var(--jmn-navy, #0e1a3a);
          box-shadow: 0 0 0 3px rgba(14, 26, 58, 0.08);
        }
        textarea.input {
          height: auto;
          padding-top: 8px;
          padding-bottom: 8px;
          resize: vertical;
        }
        .tabular {
          font-variant-numeric: tabular-nums;
        }
        .cell-input {
          width: 100%;
          height: 32px;
          padding: 0 8px;
          border: 1px solid transparent;
          border-radius: 4px;
          background: transparent;
          font-size: 14px;
          color: var(--jmn-ink, #0a0a0a);
          font-variant-numeric: tabular-nums;
          text-align: right;
        }
        .cell-input:focus {
          outline: none;
          border-color: var(--jmn-navy, #0e1a3a);
          background: white;
          box-shadow: 0 0 0 3px rgba(14, 26, 58, 0.08);
        }
        .cell-input:hover:not(:focus) {
          background: #fafafa;
        }
        /* Strip the tiny browser spinner arrows from every number cell in
           the lines grid — they're noisy at this size and the qty cell has
           a proper stepper instead. */
        .cell-input[type="number"]::-webkit-outer-spin-button,
        .cell-input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .cell-input[type="number"] {
          -moz-appearance: textfield;
          appearance: textfield;
        }

        /* −/+ qty stepper — invisible until you hover/focus the cell, then
           the buttons fade in so the row stays calm at rest. */
        .qty-stepper {
          display: inline-flex;
          align-items: stretch;
          width: 100%;
          height: 32px;
          border: 1px solid transparent;
          border-radius: 4px;
          overflow: hidden;
          transition: border-color 150ms, background 150ms;
        }
        .qty-stepper:hover {
          background: #fafafa;
        }
        .qty-stepper:focus-within {
          border-color: var(--jmn-navy);
          background: white;
          box-shadow: 0 0 0 3px rgba(14, 26, 58, 0.08);
        }
        .qty-stepper button {
          width: 28px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          color: var(--jmn-navy);
          opacity: 0.35;
          transition: opacity 150ms, background 150ms;
        }
        .qty-stepper:hover button,
        .qty-stepper:focus-within button {
          opacity: 1;
        }
        .qty-stepper button:hover:not(:disabled) {
          background: color-mix(in srgb, var(--jmn-navy) 6%, transparent);
        }
        .qty-stepper button:active:not(:disabled) {
          background: color-mix(in srgb, var(--jmn-navy) 12%, transparent);
        }
        .qty-stepper button:disabled {
          opacity: 0.15;
          cursor: not-allowed;
        }
        .qty-stepper-input {
          flex: 1;
          width: 0;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          padding: 0;
          text-align: center;
          font-size: 14px;
          font-variant-numeric: tabular-nums;
          color: var(--jmn-ink, #0a0a0a);
        }
        .qty-stepper-input::-webkit-outer-spin-button,
        .qty-stepper-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .qty-stepper-input {
          -moz-appearance: textfield;
          appearance: textfield;
        }
        .cell-select {
          width: 100%;
          height: 32px;
          padding: 0 8px;
          border: 1px solid transparent;
          border-radius: 4px;
          background: transparent;
          font-size: 14px;
          color: var(--jmn-ink, #0a0a0a);
        }
        .cell-select:focus {
          outline: none;
          border-color: var(--jmn-navy, #0e1a3a);
          background: white;
          box-shadow: 0 0 0 3px rgba(14, 26, 58, 0.08);
        }
        .cell-select:hover:not(:focus) {
          background: #fafafa;
        }
      `}</style>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create-product modal — thin wrapper around the shared ResourceForm so this
// flow uses the *same* full product form as `/admin/products`: every field
// (images, color/size variants, brand, collection, marketing flags, SEO, …)
// is editable here too. On submit we POST to the catalog and drop the new
// product onto this PO as a line in one move. status defaults to "draft" so
// the storefront isn't accidentally exposed to half-polished SKUs.
// ─────────────────────────────────────────────────────────────────────────────

function CreateProductModal({
  categories,
  brands,
  collections,
  defaultCurrency,
  onClose,
  onCreated,
}: {
  categories: SelectOption[];
  brands: SelectOption[];
  collections: SelectOption[];
  defaultCurrency: string;
  onClose: () => void;
  onCreated: (product: ProductLite) => void;
}) {
  const toast = useToast();

  // Pre-fill currency with whatever the PO is being entered in so the new
  // SKU doesn't drift off into a different ledger.
  const initialValues = {
    ...PRODUCT_INITIAL_VALUES,
    currency: defaultCurrency,
  };

  async function handleSubmit(payload: Record<string, unknown>) {
    const created = (await djangoAdmin.products.create(payload)) as unknown as {
      id: string;
      slug: string;
      sku: string;
      name: string;
      price: number | string;
      cost_price: number | string | null;
      images?: string[];
      colors?: Array<{ name: string; hex: string }>;
      sizes?: Array<{ label: string }>;
    };

    const productLite: ProductLite = {
      id: created.id,
      name: created.name,
      sku: created.sku,
      price: created.price,
      cost_price: created.cost_price ?? undefined,
      images: created.images ?? [],
      colors: created.colors ?? [],
      sizes: created.sizes ?? [],
    };

    toast.success("Added to PO", `“${created.name}” is now on this purchase order.`);
    onCreated(productLite);
  }

  return (
    <ResourceForm
      title="New product"
      mode="create"
      fields={productFormFields({ categories, brands, collections })}
      initialValues={initialValues}
      onClose={onClose}
      onSubmit={handleSubmit}
      draftKey="po:new:product:create"
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Qty stepper — −/+ buttons around the editable number. Replaces the browser
// number-input spinner arrows (which are tiny and ugly) with a proper, tap-
// friendly control. Typing still works in the middle; min is 1.
// ─────────────────────────────────────────────────────────────────────────────

function QtyStepper({
  value,
  onChange,
  min = 1,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const dec = () => onChange(Math.max(min, (Number(value) || min) - 1));
  const inc = () =>
    onChange(
      max != null
        ? Math.min(max, (Number(value) || 0) + 1)
        : (Number(value) || 0) + 1,
    );
  const atMin = (Number(value) || min) <= min;
  const atMax = max != null && (Number(value) || 0) >= max;

  return (
    <div className="qty-stepper">
      <button
        type="button"
        onClick={dec}
        disabled={atMin}
        aria-label="Decrease quantity"
        tabIndex={-1}
      >
        <Minus size={12} strokeWidth={2.25} />
      </button>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isNaN(n)) return;
          onChange(Math.max(min, max != null ? Math.min(max, n) : n));
        }}
        onFocus={(e) => e.currentTarget.select()}
        className="qty-stepper-input"
      />
      <button
        type="button"
        onClick={inc}
        disabled={atMax}
        aria-label="Increase quantity"
        tabIndex={-1}
      >
        <Plus size={12} strokeWidth={2.25} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// One row in the lines grid — every cell is inline-editable
// ─────────────────────────────────────────────────────────────────────────────

function LineRow({
  line,
  currency,
  onChange,
  onRemove,
}: {
  line: DraftLine;
  currency: string;
  onChange: (patch: Partial<DraftLine>) => void;
  onRemove: () => void;
}) {
  const qty = Number(line.ordered_quantity) || 0;
  const cost = Number(line.unit_cost) || 0;
  const dpct = Number(line.discount_pct) || 0;
  const tpct = Number(line.tax_pct) || 0;
  const gross = qty * cost;
  const net = gross * (1 - dpct / 100);
  const lineTotal = net * (1 + tpct / 100);

  const isCustom = !line.product;

  return (
    <tr className="border-t border-[var(--jmn-line)] hover:bg-[#FAFAFA] transition-colors">
      {/* Item — image + name + sku */}
      <td className="pl-4 pr-2 py-2 align-middle">
        <div className="flex items-center gap-2.5 min-w-0">
          {line.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={line.image}
              alt=""
              className="w-9 h-9 rounded object-cover bg-[#F4F5F7] shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded bg-[#F4F5F7] shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            {isCustom ? (
              <input
                value={line.product_name}
                onChange={(e) => onChange({ product_name: e.target.value })}
                placeholder="Product name (custom)"
                className="cell-input !text-left !pl-1"
              />
            ) : (
              <p className="font-medium text-navy text-sm truncate leading-tight">
                {line.product_name}
              </p>
            )}
            {isCustom ? (
              <input
                value={line.sku}
                onChange={(e) => onChange({ sku: e.target.value })}
                placeholder="SKU"
                className="cell-input !text-left !pl-1 !h-6 !text-[11px] !text-ink/55"
              />
            ) : (
              <p className="text-[11px] text-ink/45 tabular truncate leading-tight">
                {line.sku}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Color */}
      <td className="px-2 py-2 align-middle">
        {line.colorOptions.length > 0 ? (
          <select
            value={line.color}
            onChange={(e) => onChange({ color: e.target.value })}
            className="cell-select"
          >
            <option value="">—</option>
            {line.colorOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={line.color}
            onChange={(e) => onChange({ color: e.target.value })}
            className="cell-input !text-left"
            placeholder="—"
          />
        )}
      </td>

      {/* Size */}
      <td className="px-2 py-2 align-middle">
        {line.sizeOptions.length > 0 ? (
          <select
            value={line.size}
            onChange={(e) => onChange({ size: e.target.value })}
            className="cell-select"
          >
            <option value="">—</option>
            {line.sizeOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={line.size}
            onChange={(e) => onChange({ size: e.target.value })}
            className="cell-input !text-left"
            placeholder="—"
          />
        )}
      </td>

      {/* Qty — −/+ stepper, typing still works in the middle. */}
      <td className="px-2 py-2 align-middle">
        <QtyStepper
          value={line.ordered_quantity}
          onChange={(v) => onChange({ ordered_quantity: v })}
        />
      </td>

      {/* Cost */}
      <td className="px-2 py-2 align-middle">
        <input
          type="number"
          min={0}
          step="0.01"
          value={line.unit_cost}
          onChange={(e) => onChange({ unit_cost: e.target.value })}
          onFocus={(e) => e.currentTarget.select()}
          className="cell-input"
        />
      </td>

      {/* Discount % */}
      <td className="px-2 py-2 align-middle">
        <input
          type="number"
          min={0}
          max={100}
          step="0.01"
          value={line.discount_pct}
          onChange={(e) => onChange({ discount_pct: e.target.value })}
          onFocus={(e) => e.currentTarget.select()}
          className="cell-input"
        />
      </td>

      {/* Tax % */}
      <td className="px-2 py-2 align-middle">
        <input
          type="number"
          min={0}
          max={100}
          step="0.01"
          value={line.tax_pct}
          onChange={(e) => onChange({ tax_pct: e.target.value })}
          onFocus={(e) => e.currentTarget.select()}
          className="cell-input"
        />
      </td>

      {/* Total */}
      <td className="px-2 py-2 align-middle text-right tabular font-medium text-navy">
        {currency} {lineTotal.toFixed(2)}
      </td>

      {/* Remove */}
      <td className="px-2 py-2 align-middle text-right">
        <button
          type="button"
          onClick={onRemove}
          className="h-7 w-7 inline-grid place-items-center rounded text-ink/45 hover:text-rose-700 hover:bg-rose-50 transition-colors"
          aria-label="Remove line"
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  );
}

// ─── Tiny helpers ───────────────────────────────────────────────────────────

function Field({
  label,
  required,
  hint,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(full && "md:col-span-2")}>
      <label className="text-[10px] tracking-[0.18em] uppercase text-ink/55 mb-1 block">
        {label}
        {required && <span className="text-rose-600 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-ink/45">{hint}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink/65">{label}</span>
      <span className="text-navy tabular">{value}</span>
    </div>
  );
}
