"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Crown,
  Heart,
  Loader2,
  LogOut,
  MapPin,
  Pencil,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
  User as UserIcon,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import { useConfirm, useToast } from "@/context/FeedbackContext";
import { api } from "@/lib/api";
import { djangoAuth } from "@/lib/django";
import { storefront } from "@/lib/storefront";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import type { Address, Order, OrderStatus, User } from "@/types";

const EASE = [0.22, 1, 0.36, 1] as const;

const INPUT_CLASS =
  "w-full bg-transparent border-b border-navy/20 focus:border-navy outline-none py-2.5 text-navy placeholder:text-ink/35 transition-colors";

type TabKey = "overview" | "orders" | "loyalty" | "addresses" | "profile";

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { key: "overview", label: "Overview", icon: Sparkles },
  { key: "orders", label: "Orders", icon: ShoppingBag },
  { key: "loyalty", label: "Loyalty", icon: Sparkles },
  { key: "addresses", label: "Addresses", icon: MapPin },
  { key: "profile", label: "Profile", icon: UserIcon },
];

const TIER_THRESHOLDS: Record<User["loyaltyTier"], number> = {
  silver: 0,
  gold: 1000,
  platinum: 5000,
  obsidian: 15000,
};

const TIER_ORDER: User["loyaltyTier"][] = ["silver", "gold", "platinum", "obsidian"];

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Pending payment",
  processing: "Processing",
  ready_to_ship: "Ready to ship",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
  refunded: "Refunded",
};

const STATUS_TONE: Record<OrderStatus, string> = {
  pending_payment: "bg-amber-50 text-amber-700 border-amber-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  ready_to_ship: "bg-blue-50 text-blue-700 border-blue-200",
  shipped: "bg-indigo-50 text-indigo-700 border-indigo-200",
  out_for_delivery: "bg-indigo-50 text-indigo-700 border-indigo-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  returned: "bg-rose-50 text-rose-700 border-rose-200",
  refunded: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function AccountView() {
  const { user, isAuthenticated, loading, logout, updateUser } = useAuth();
  const [tab, setTab] = useState<TabKey>("overview");
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    setOrdersLoading(true);
    api
      .get<Order[]>("/orders")
      .then((data) => setOrders(data))
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [isAuthenticated]);

  if (loading) {
    return (
      <section className="shell pt-44 pb-32 grid place-items-center min-h-[60vh]">
        <Loader2 size={28} className="text-navy animate-spin" />
      </section>
    );
  }

  if (!isAuthenticated || !user) {
    return <SignInGate />;
  }

  return (
    <>
      <AccountHeader user={user} onLogout={logout} />

      <section className="shell pb-24 md:pb-32">
        <div className="grid lg:grid-cols-[260px_1fr] gap-10 lg:gap-16">
          <TabSidebar tab={tab} onChange={setTab} ordersCount={orders.length} />

          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                {tab === "overview" && (
                  <OverviewPanel
                    user={user}
                    orders={orders}
                    ordersLoading={ordersLoading}
                    onJump={setTab}
                  />
                )}
                {tab === "orders" && (
                  <OrdersPanel orders={orders} loading={ordersLoading} />
                )}
                {tab === "loyalty" && <LoyaltyPanel />}
                {tab === "addresses" && (
                  <AddressesPanel user={user} onUserUpdate={updateUser} />
                )}
                {tab === "profile" && (
                  <ProfilePanel user={user} onUserUpdate={updateUser} onLogout={logout} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>
    </>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function AccountHeader({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <header className="shell pt-36 md:pt-44 pb-12 md:pb-16">
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="text-[11px] tracking-[0.35em] uppercase text-gold mb-6"
      >
        /Account · {user.loyaltyTier}
      </motion.p>

      <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-end">
        <div className="overflow-hidden">
          <motion.h1
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 1, ease: EASE }}
            className="font-display text-[clamp(2.5rem,8vw,7rem)] leading-[0.9] tracking-tight text-navy"
          >
            Welcome, <span className="italic">{user.firstName}.</span>
          </motion.h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-wrap items-center gap-3"
        >
          <Link
            href="/wishlist"
            className="btn-ghost text-navy border-navy/30 hover:border-navy"
          >
            <Heart size={14} />
            <span>Wishlist</span>
          </Link>
          <button
            onClick={onLogout}
            className="btn-ghost text-navy border-navy/30 hover:border-navy"
          >
            <LogOut size={14} />
            <span>Sign out</span>
          </button>
        </motion.div>
      </div>
    </header>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function TabSidebar({
  tab,
  onChange,
  ordersCount,
}: {
  tab: TabKey;
  onChange: (t: TabKey) => void;
  ordersCount: number;
}) {
  return (
    <aside>
      <nav className="flex lg:flex-col gap-1 overflow-x-auto rail border-y lg:border-y-0 lg:border-l border-[var(--jmn-line)] lg:pl-6 py-2 lg:py-0">
        {TABS.map((t) => {
          const active = tab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              className={cn(
                "flex items-center gap-3 px-4 lg:px-3 py-3 text-[12px] tracking-[0.18em] uppercase transition-colors whitespace-nowrap",
                "border-b-2 lg:border-b-0 lg:border-l-2",
                active
                  ? "border-gold text-navy"
                  : "border-transparent text-ink/55 hover:text-navy"
              )}
            >
              <Icon size={15} />
              <span>{t.label}</span>
              {t.key === "orders" && ordersCount > 0 && (
                <span className="ml-auto text-[10px] text-gold tabular">
                  {String(ordersCount).padStart(2, "0")}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

// ─── Overview ────────────────────────────────────────────────────────────────

function OverviewPanel({
  user,
  orders,
  ordersLoading,
  onJump,
}: {
  user: User;
  orders: Order[];
  ordersLoading: boolean;
  onJump: (t: TabKey) => void;
}) {
  const recent = orders.slice(0, 3);
  const defaultAddress =
    user.addresses.find((a) => a.id === user.defaultAddressId) ?? user.addresses[0];

  return (
    <div className="space-y-10">
      <LoyaltyCard user={user} />

      <div className="grid md:grid-cols-3 gap-6">
        <Stat label="Orders" value={String(orders.length).padStart(2, "0")} />
        <Stat label="Saved" value={String(user.wishlist?.length ?? 0).padStart(2, "0")} />
        <Stat
          label="Member since"
          value={new Date(user.createdAt).getFullYear().toString()}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <Panel title="Recent orders" action={{ label: "All orders", onClick: () => onJump("orders") }}>
          {ordersLoading ? (
            <div className="py-10 grid place-items-center">
              <Loader2 size={20} className="text-navy/60 animate-spin" />
            </div>
          ) : recent.length === 0 ? (
            <EmptyHint
              icon={<ShoppingBag size={18} />}
              title="No orders yet."
              cta={{ label: "Start shopping", href: "/products" }}
            />
          ) : (
            <ul className="divide-y divide-[var(--jmn-line)]">
              {recent.map((o) => (
                <li key={o.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-display text-lg text-navy truncate">
                      {o.orderNumber}
                    </p>
                    <p className="text-xs text-ink/50 mt-1">
                      {formatDate(o.createdAt)} · {o.items.length} item
                      {o.items.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-base text-navy tabular">
                      {formatPrice(o.total, o.currency)}
                    </p>
                    <StatusPill status={o.status} className="mt-1" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Default address"
          action={{ label: "Manage", onClick: () => onJump("addresses") }}
        >
          {defaultAddress ? (
            <AddressBlock address={defaultAddress} />
          ) : (
            <EmptyHint
              icon={<MapPin size={18} />}
              title="No address saved."
              cta={{ label: "Add one", onClick: () => onJump("addresses") }}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}

function LoyaltyCard({ user }: { user: User }) {
  const tierIdx = TIER_ORDER.indexOf(user.loyaltyTier);
  const nextTier = TIER_ORDER[tierIdx + 1];
  const currentMin = TIER_THRESHOLDS[user.loyaltyTier];
  const nextMin = nextTier ? TIER_THRESHOLDS[nextTier] : currentMin;
  const progress = nextTier
    ? Math.min(
        100,
        Math.max(0, ((user.loyaltyPoints - currentMin) / (nextMin - currentMin)) * 100)
      )
    : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="relative overflow-hidden bg-navy text-cream p-8 md:p-10 rounded-[var(--radius-lg)]"
    >
      <div
        aria-hidden
        className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full border border-gold/15 pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -left-20 w-[300px] h-[300px] rounded-full border border-gold/10 pointer-events-none"
      />

      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-[11px] tracking-[0.3em] uppercase text-gold/90 mb-3">
            Loyalty tier
          </p>
          <h2 className="font-display text-4xl md:text-5xl tracking-tight capitalize">
            {user.loyaltyTier}
            <Crown size={22} className="inline ml-3 text-gold" />
          </h2>
          <p className="mt-3 text-cream/65 max-w-md text-sm">
            Earn one point per dollar. Tiers unlock private sales, complimentary
            tailoring, and early access to new collections.
          </p>
        </div>

        <div className="text-right">
          <p className="text-[11px] tracking-[0.3em] uppercase text-cream/60">
            Points
          </p>
          <p className="font-display text-5xl md:text-6xl text-gold tabular leading-none mt-2">
            {user.loyaltyPoints.toLocaleString()}
          </p>
        </div>
      </div>

      {nextTier ? (
        <div className="relative mt-8">
          <div className="flex items-center justify-between text-[11px] tracking-[0.25em] uppercase text-cream/55 mb-2">
            <span>{user.loyaltyTier}</span>
            <span>
              {(nextMin - user.loyaltyPoints).toLocaleString()} pts to {nextTier}
            </span>
          </div>
          <div className="h-1 bg-cream/15 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.2, ease: EASE, delay: 0.2 }}
              className="h-full bg-gold"
            />
          </div>
        </div>
      ) : (
        <p className="relative mt-8 text-[11px] tracking-[0.25em] uppercase text-gold/90">
          Top tier — house guest privileges unlocked.
        </p>
      )}
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--jmn-line)] bg-cream px-6 py-7">
      <p className="text-[10px] tracking-[0.3em] uppercase text-ink/50">{label}</p>
      <p className="font-display text-4xl text-navy tabular mt-2">{value}</p>
    </div>
  );
}

// ─── Orders panel ────────────────────────────────────────────────────────────

function OrdersPanel({ orders, loading }: { orders: Order[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 size={22} className="text-navy/60 animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Panel title="Orders">
        <EmptyHint
          icon={<ShoppingBag size={18} />}
          title="Nothing ordered yet."
          description="When you place your first order, it'll live here with tracking and timeline."
          cta={{ label: "Browse the house", href: "/products" }}
        />
      </Panel>
    );
  }

  return (
    <Panel title={`Orders (${orders.length})`}>
      <ul className="divide-y divide-[var(--jmn-line)]">
        {orders.map((o) => (
          <OrderRow key={o.id} order={o} />
        ))}
      </ul>
    </Panel>
  );
}

function OrderRow({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="py-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 text-left"
      >
        <div className="min-w-0">
          <p className="font-display text-xl text-navy truncate">
            {order.orderNumber}
          </p>
          <p className="text-xs text-ink/55 mt-1">
            {formatDate(order.createdAt)} · {order.items.length} item
            {order.items.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-display text-lg text-navy tabular">
            {formatPrice(order.total, order.currency)}
          </p>
          <StatusPill status={order.status} className="mt-1" />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="pt-5 grid md:grid-cols-[1.4fr_1fr] gap-8">
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-ink/50 mb-3">
                  Items
                </p>
                <ul className="space-y-3">
                  {order.items.map((item) => (
                    <li
                      key={`${item.productId}-${item.size}-${item.color}`}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="truncate">
                        {item.productName}{" "}
                        <span className="text-ink/45">
                          · {item.color} · {item.size} · ×{item.quantity}
                        </span>
                      </span>
                      <span className="tabular text-navy shrink-0">
                        {formatPrice(item.total, order.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
                {order.trackingNumber && (
                  <p className="mt-4 text-xs text-ink/55">
                    Tracking: <span className="text-navy tabular">{order.trackingNumber}</span>
                    {order.shippingCarrier ? ` · ${order.shippingCarrier}` : ""}
                  </p>
                )}
              </div>

              <div className="bg-bone/60 px-5 py-5">
                <p className="text-[10px] tracking-[0.3em] uppercase text-ink/50 mb-3">
                  Shipping to
                </p>
                <AddressBlock address={order.shippingAddress} compact />
                <div className="mt-5 pt-5 border-t border-[var(--jmn-line)] space-y-1.5 text-sm">
                  <Row label="Subtotal" value={formatPrice(order.subtotal, order.currency)} />
                  {order.discount > 0 && (
                    <Row
                      label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`}
                      value={`− ${formatPrice(order.discount, order.currency)}`}
                    />
                  )}
                  <Row label="Shipping" value={formatPrice(order.shipping, order.currency)} />
                  <Row label="Tax" value={formatPrice(order.tax, order.currency)} />
                  <Row
                    label="Total"
                    value={formatPrice(order.total, order.currency)}
                    bold
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={cn("flex justify-between", bold && "pt-2 border-t border-[var(--jmn-line)] text-navy font-medium")}>
      <span className="text-ink/60">{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}

function StatusPill({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block text-[10px] tracking-[0.18em] uppercase border px-2 py-0.5",
        STATUS_TONE[status],
        className
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

// ─── Addresses panel ─────────────────────────────────────────────────────────

function AddressesPanel({
  user,
  onUserUpdate,
}: {
  user: User;
  onUserUpdate: (patch: Partial<User>) => void;
}) {
  const [editing, setEditing] = useState<Address | null>(null);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const confirm = useConfirm();
  const toast = useToast();

  async function setDefault(id: string) {
    setBusyId(id);
    try {
      const updated = await api.patch<User>(`/auth/me/addresses/${id}`, { isDefault: true });
      onUserUpdate(updated);
      toast.success("Default address updated");
    } catch (e) {
      toast.error("Couldn't update default", (e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: "Remove this address?",
      description: "You can add it back any time.",
      tone: "danger",
      confirmLabel: "Remove",
    });
    if (!ok) return;
    setBusyId(id);
    try {
      const updated = await api.delete<User>(`/auth/me/addresses/${id}`);
      onUserUpdate(updated);
      toast.success("Address removed");
    } catch (e) {
      toast.error("Couldn't remove address", (e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Panel
      title={`Addresses (${user.addresses.length})`}
      action={{ label: "Add address", icon: <Plus size={14} />, onClick: () => setAdding(true) }}
    >
      {user.addresses.length === 0 && !adding && (
        <EmptyHint
          icon={<MapPin size={18} />}
          title="No addresses yet."
          description="Add a delivery or billing address to speed up future checkouts."
          cta={{ label: "Add address", onClick: () => setAdding(true) }}
        />
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {user.addresses.map((addr) => (
          <article
            key={addr.id}
            className={cn(
              "relative border bg-cream px-6 py-6",
              addr.isDefault ? "border-gold/60" : "border-[var(--jmn-line)]"
            )}
          >
            {addr.isDefault && (
              <span className="absolute top-3 right-3 text-[9px] tracking-[0.25em] uppercase text-gold flex items-center gap-1">
                <CheckCircle2 size={11} /> Default
              </span>
            )}
            <AddressBlock address={addr} />

            <div className="mt-5 pt-4 border-t border-[var(--jmn-line)] flex flex-wrap gap-2 text-[11px] tracking-[0.2em] uppercase">
              {!addr.isDefault && addr.id && (
                <button
                  disabled={busyId === addr.id}
                  onClick={() => setDefault(addr.id!)}
                  className="text-navy hover:text-gold transition-colors disabled:opacity-50"
                >
                  Set default
                </button>
              )}
              <button
                onClick={() => setEditing(addr)}
                className="text-navy hover:text-gold transition-colors flex items-center gap-1.5 ml-auto"
              >
                <Pencil size={12} /> Edit
              </button>
              {addr.id && (
                <button
                  disabled={busyId === addr.id}
                  onClick={() => remove(addr.id!)}
                  className="text-rose-700 hover:text-rose-900 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 size={12} /> Remove
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      <AnimatePresence>
        {(adding || editing) && (
          <AddressDialog
            initial={editing ?? undefined}
            onClose={() => {
              setAdding(false);
              setEditing(null);
            }}
            onSaved={(u) => {
              onUserUpdate(u);
              setAdding(false);
              setEditing(null);
            }}
          />
        )}
      </AnimatePresence>
    </Panel>
  );
}

function AddressBlock({ address, compact }: { address: Address; compact?: boolean }) {
  return (
    <div className={cn("text-sm leading-relaxed", compact ? "text-ink/70" : "text-ink/80")}>
      <p className="font-medium text-navy">
        {address.firstName} {address.lastName}
      </p>
      {address.company && <p>{address.company}</p>}
      <p>{address.line1}</p>
      {address.line2 && <p>{address.line2}</p>}
      <p>
        {address.city}
        {address.state ? `, ${address.state}` : ""} {address.postcode}
      </p>
      <p>{address.country}</p>
      {address.phone && <p className="mt-2 text-ink/55">{address.phone}</p>}
    </div>
  );
}

function AddressDialog({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Address;
  onClose: () => void;
  onSaved: (user: User) => void;
}) {
  const editing = !!initial?.id;
  const [form, setForm] = useState<Address>(
    initial ?? {
      firstName: "",
      lastName: "",
      company: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      postcode: "",
      country: "",
      phone: "",
      isDefault: false,
    }
  );
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const dialogToast = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    // Client-side required-field check — surface every miss in one toast.
    const requiredMap: Array<[keyof typeof form, string]> = [
      ["firstName", "First name"],
      ["lastName", "Last name"],
      ["line1", "Address line 1"],
      ["city", "City"],
      ["postcode", "Postcode"],
      ["country", "Country"],
    ];
    const missing: string[] = [];
    const fieldErrors: Record<string, string[]> = {};
    for (const [k, label] of requiredMap) {
      if (!String(form[k] ?? "").trim()) {
        missing.push(label);
        fieldErrors[k as string] = ["Required"];
      }
    }
    if (missing.length > 0) {
      setErrors(fieldErrors);
      dialogToast.error(
        missing.length === 1
          ? `${missing[0]} is required`
          : `Please fill in: ${missing.join(", ")}`,
      );
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        company: form.company || undefined,
        line1: form.line1,
        line2: form.line2 || undefined,
        city: form.city,
        state: form.state || undefined,
        postcode: form.postcode,
        country: form.country,
        phone: form.phone,
        isDefault: form.isDefault ?? false,
      };
      const updated = editing
        ? await api.patch<User>(`/auth/me/addresses/${initial!.id}`, payload)
        : await api.post<User>("/auth/me/addresses", payload);
      dialogToast.success(editing ? "Address updated" : "Address added");
      onSaved(updated);
    } catch (err) {
      const e = err as Error & { fields?: Record<string, string[]> };
      if (e.fields) {
        setErrors(e.fields);
        const firstKey = Object.keys(e.fields)[0];
        const firstMsg = e.fields[firstKey]?.[0] ?? "Please check your inputs";
        dialogToast.error("Couldn't save address", `${firstKey}: ${firstMsg}`);
      } else {
        const msg = e.message ?? "Could not save address";
        setErrors({ _: [msg] });
        dialogToast.error("Couldn't save address", msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function set<K extends keyof Address>(key: K, value: Address[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      // Backdrop click does NOT close — only the X / Cancel buttons.
      // Right-side drawer, matches every other form modal in the app.
      className="fixed inset-0 z-[80] flex justify-end bg-navy/40 backdrop-blur-sm"
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.4, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        className="bg-cream w-full md:max-w-2xl h-full overflow-y-auto shadow-2xl shadow-navy/20"
      >
        <div className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-[var(--jmn-line)]">
          <h3 className="font-display text-2xl text-navy">
            {editing ? "Edit address" : "New address"}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid place-items-center h-9 w-9 rounded-full hover:bg-navy hover:text-cream transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="px-6 md:px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="First name" error={errors.firstName?.[0]}>
            <input
              required
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Last name" error={errors.lastName?.[0]}>
            <input
              required
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Company (optional)" full>
            <input
              value={form.company ?? ""}
              onChange={(e) => set("company", e.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Address line 1" full error={errors.line1?.[0]}>
            <input
              required
              value={form.line1}
              onChange={(e) => set("line1", e.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Address line 2 (optional)" full>
            <input
              value={form.line2 ?? ""}
              onChange={(e) => set("line2", e.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="City" error={errors.city?.[0]}>
            <input
              required
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="State / region" error={errors.state?.[0]}>
            <input
              value={form.state ?? ""}
              onChange={(e) => set("state", e.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Postcode" error={errors.postcode?.[0]}>
            <input
              required
              value={form.postcode}
              onChange={(e) => set("postcode", e.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Country" error={errors.country?.[0]}>
            <input
              required
              value={form.country}
              onChange={(e) => set("country", e.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Phone" full error={errors.phone?.[0]}>
            <input
              required
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              className={INPUT_CLASS}
            />
          </Field>

          <label className="md:col-span-2 flex items-center gap-3 text-sm text-ink/70 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.isDefault}
              onChange={(e) => set("isDefault", e.target.checked)}
              className="accent-navy h-4 w-4"
            />
            Set as default address
          </label>

          {errors._?.[0] && (
            <p className="md:col-span-2 text-sm text-rose-700">{errors._[0]}</p>
          )}

          <div className="md:col-span-2 flex items-center justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost text-navy border-navy/30 hover:border-navy"
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
              {editing ? "Save changes" : "Add address"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Profile panel ───────────────────────────────────────────────────────────

function ProfilePanel({
  user,
  onUserUpdate,
  onLogout,
}: {
  user: User;
  onUserUpdate: (patch: Partial<User>) => void;
  onLogout: () => void;
}) {
  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone ?? "",
    dateOfBirth: user.dateOfBirth ?? "",
    marketingOptIn: !!user.marketingOptIn,
  });
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const dirty = useMemo(() => {
    return (
      form.firstName !== user.firstName ||
      form.lastName !== user.lastName ||
      form.phone !== (user.phone ?? "") ||
      form.dateOfBirth !== (user.dateOfBirth ?? "") ||
      form.marketingOptIn !== !!user.marketingOptIn
    );
  }, [form, user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);
    setSaved(false);
    try {
      const updated = await djangoAuth.updateProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        marketingOptIn: form.marketingOptIn,
      });
      onUserUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      const e = err as Error & { fields?: Record<string, string[]> };
      if (e.fields) {
        // Django returns snake_case keys — map back to the form's camelCase.
        const mapped: Record<string, string[]> = {};
        for (const [k, v] of Object.entries(e.fields)) {
          if (k === "first_name") mapped.firstName = v;
          else if (k === "last_name") mapped.lastName = v;
          else if (k === "phone_number") mapped.phone = v;
          else if (k === "marketing_opt_in") mapped.marketingOptIn = v;
          else mapped[k] = v;
        }
        setErrors(mapped);
      } else {
        setErrors({ _: [e.message ?? "Could not save"] });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Panel title="Profile">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="First name" error={errors.firstName?.[0]}>
          <input
            required
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Last name" error={errors.lastName?.[0]}>
          <input
            required
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Email" full>
          <input
            value={user.email}
            disabled
            className={cn(INPUT_CLASS, "opacity-60 cursor-not-allowed")}
          />
        </Field>
        <Field label="Phone" error={errors.phone?.[0]}>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={INPUT_CLASS}
            placeholder="+1 555 010 1234"
          />
        </Field>
        <Field label="Date of birth" error={errors.dateOfBirth?.[0]}>
          <input
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
            className={INPUT_CLASS}
          />
        </Field>

        <label className="md:col-span-2 flex items-start gap-3 text-sm text-ink/75 cursor-pointer mt-2">
          <input
            type="checkbox"
            checked={form.marketingOptIn}
            onChange={(e) => setForm({ ...form, marketingOptIn: e.target.checked })}
            className="accent-navy h-4 w-4 mt-0.5"
          />
          <span>
            Send me letters from the atelier — new collections, studio visits, and
            private sale access. One email a fortnight, never more.
          </span>
        </label>

        {errors._?.[0] && (
          <p className="md:col-span-2 text-sm text-rose-700">{errors._[0]}</p>
        )}

        <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-4 mt-4 pt-6 border-t border-[var(--jmn-line)]">
          <button
            type="button"
            onClick={onLogout}
            className="text-[11px] tracking-[0.25em] uppercase text-rose-700 hover:text-rose-900 transition-colors flex items-center gap-2"
          >
            <LogOut size={13} /> Sign out
          </button>

          <div className="flex items-center gap-4">
            <AnimatePresence>
              {saved && (
                <motion.span
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-emerald-700 flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} /> Saved
                </motion.span>
              )}
            </AnimatePresence>
            <button
              type="submit"
              disabled={!dirty || submitting}
              className="btn-primary disabled:opacity-50"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
              Save changes
            </button>
          </div>
        </div>
      </form>
    </Panel>
  );
}

// ─── Sign-in gate (for unauthenticated users) ────────────────────────────────

function SignInGate() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res =
      mode === "login"
        ? await login(form.email, form.password)
        : await register({
            email: form.email,
            password: form.password,
            firstName: form.firstName,
            lastName: form.lastName,
          });
    if (!res.ok) setError(res.error ?? "Something went wrong");
    setSubmitting(false);
  }

  return (
    <>
      <header className="shell pt-36 md:pt-44 pb-10 md:pb-14">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-[11px] tracking-[0.35em] uppercase text-gold mb-6"
        >
          /Account · {mode === "login" ? "Sign in" : "Create account"}
        </motion.p>

        <div className="overflow-hidden">
          <motion.h1
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 1, ease: EASE }}
            className="font-display text-[clamp(2.5rem,8vw,7rem)] leading-[0.9] tracking-tight text-navy max-w-3xl"
          >
            {mode === "login" ? (
              <>
                Welcome <span className="italic">back.</span>
              </>
            ) : (
              <>
                Join the <span className="italic">house.</span>
              </>
            )}
          </motion.h1>
        </div>
      </header>

      <section className="shell pb-32 grid lg:grid-cols-[1.1fr_1fr] gap-12 md:gap-20">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
          onSubmit={submit}
          className="max-w-md w-full space-y-5"
        >
          {mode === "register" && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="First name">
                <input
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Last name">
                <input
                  required
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className={INPUT_CLASS}
                />
              </Field>
            </div>
          )}

          <Field label="Email">
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={INPUT_CLASS}
              placeholder="you@example.com"
            />
          </Field>

          <Field label="Password">
            <input
              type="password"
              required
              minLength={mode === "register" ? 8 : 6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={INPUT_CLASS}
              placeholder={mode === "register" ? "At least 8 characters" : ""}
            />
          </Field>

          {error && <p className="text-sm text-rose-700">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ArrowRight size={14} />
            )}
            {mode === "login" ? "Sign in" : "Create account"}
          </button>

          <p className="text-sm text-ink/65">
            {mode === "login" ? (
              <>
                New to the house?{" "}
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className="link-swipe text-navy"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already a guest?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="link-swipe text-navy"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </motion.form>

        <motion.aside
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="hidden lg:block relative"
        >
          <div className="sticky top-32 bg-navy text-cream p-10 rounded-[var(--radius-lg)] overflow-hidden">
            <div
              aria-hidden
              className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full border border-gold/15 pointer-events-none"
            />
            <p className="text-[11px] tracking-[0.3em] uppercase text-gold mb-4">
              House guest
            </p>
            <h3 className="font-display text-3xl leading-tight">
              Loyalty, tailoring, <span className="italic">and lookahead.</span>
            </h3>
            <ul className="mt-8 space-y-4 text-sm text-cream/75">
              {[
                "Earn points on every order — silver to obsidian.",
                "Complimentary alterations at our atelier partners.",
                "Private sale invitations, two days before public.",
                "Editorial drops and lookbooks first.",
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="mt-1.5 h-1 w-3 bg-gold shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.aside>
      </section>
    </>
  );
}

// ─── Loyalty panel ───────────────────────────────────────────────────────────

function LoyaltyPanel() {
  return <LoyaltyPanelInner />;
}

function LoyaltyPanelInner() {
  const toast = useToast();
  const [me, setMe] = useState<import("@/lib/django-admin").LoyaltyMeShape | null>(null);
  const [rewards, setRewards] = useState<
    import("@/lib/django-admin").LoyaltyRewardShape[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const refresh = useCallbackOnce(async () => {
    try {
      const [m, r] = await Promise.all([
        storefront.loyalty.me(),
        storefront.loyalty.rewards(),
      ]);
      setMe(m);
      setRewards(r);
    } catch (e) {
      setError((e as Error).message);
    }
  });

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function redeem(rewardId: string) {
    setRedeemingId(rewardId);
    try {
      const red = await storefront.loyalty.redeem(rewardId);
      toast.success(
        "Reward redeemed",
        `Coupon ${red.coupon_code} added to your account.`,
      );
      const [m, r] = await Promise.all([
        storefront.loyalty.me(),
        storefront.loyalty.rewards(),
      ]);
      setMe(m);
      setRewards(r);
    } catch (e) {
      toast.error("Couldn't redeem", (e as Error).message);
    } finally {
      setRedeemingId(null);
    }
  }

  if (error) {
    return (
      <Panel title="Loyalty">
        <p className="text-sm text-rose-700">{error}</p>
      </Panel>
    );
  }
  if (!me || !rewards) {
    return (
      <Panel title="Loyalty">
        <div className="grid place-items-center py-12">
          <Loader2 size={20} className="text-navy/60 animate-spin" />
        </div>
      </Panel>
    );
  }

  const progressPct = Math.round((me.progress_to_next || 0) * 100);
  const ltv = Number(me.lifetime_value || 0);
  const spendToNext = me.spend_to_next_tier ? Number(me.spend_to_next_tier) : 0;

  return (
    <div className="space-y-8">
      {/* Tier card */}
      <section className="bg-navy text-cream rounded-lg p-7 md:p-9 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_70%_-10%,rgba(201,161,74,0.45),transparent_55%)]"
        />
        <div className="relative">
          <p className="text-[10px] tracking-[0.3em] uppercase text-gold mb-3">
            Member · {me.tier_label}
          </p>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-cream/55">
                Points balance
              </p>
              <p className="font-display text-5xl md:text-6xl tabular mt-1">
                {me.points.toLocaleString()}
              </p>
              <p className="text-[11px] text-cream/55 mt-2">
                Lifetime value · {formatPrice(ltv, me.currency)}
              </p>
            </div>
            <span
              className="h-14 w-14 rounded-full grid place-items-center text-cream text-lg font-display ring-2 ring-cream/20"
              style={{ background: me.badge_color || "#C9A14A" }}
              aria-label={me.tier_label}
            >
              {me.tier.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Progress to next tier */}
          {me.next_tier_label && (
            <div className="mt-7">
              <div className="flex items-center justify-between text-[11px] tracking-[0.18em] uppercase text-cream/65 mb-2">
                <span>To {me.next_tier_label}</span>
                <span className="tabular text-cream">
                  {spendToNext > 0
                    ? `${formatPrice(spendToNext, me.currency)} left`
                    : "Reached"}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-cream/15 overflow-hidden">
                <div
                  className="h-full bg-gold transition-[width] duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Perks */}
          {me.perks.length > 0 && (
            <ul className="mt-7 grid sm:grid-cols-2 gap-y-2 gap-x-6 text-sm text-cream/85">
              {me.perks.map((perk, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-gold mt-0.5 shrink-0" />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Active redemptions — coupons ready to use */}
      {me.active_redemptions.length > 0 && (
        <Panel title={`Active vouchers (${me.active_redemptions.length})`}>
          <ul className="divide-y divide-[var(--jmn-line)]">
            {me.active_redemptions.map((r) => (
              <li key={r.id} className="py-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-navy truncate">{r.reward_name}</p>
                  <p className="text-[11px] text-ink/55 mt-0.5">
                    Redeemed {formatDate(r.created_at)}
                    {r.coupon_expires_at && (
                      <> · valid until {formatDate(r.coupon_expires_at)}</>
                    )}
                  </p>
                </div>
                <code className="font-mono text-sm tracking-[0.18em] uppercase bg-bone/60 border border-[var(--jmn-line)] px-3 py-1.5 rounded">
                  {r.coupon_code}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(r.coupon_code).catch(() => {});
                    toast.success("Coupon code copied");
                  }}
                  className="text-[11px] tracking-[0.18em] uppercase text-navy hover:text-gold transition-colors"
                >
                  Copy
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* Rewards catalog */}
      <Panel title="Spend your points">
        {rewards.length === 0 ? (
          <p className="text-sm text-ink/55">No rewards available right now.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {rewards.map((reward) => {
              const canAfford = me.points >= reward.points_cost;
              const tierGated = !!reward.minimum_tier;
              return (
                <article
                  key={reward.id}
                  className="border border-[var(--jmn-line)] rounded-lg p-4 flex flex-col bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] tracking-[0.3em] uppercase text-gold">
                        {reward.points_cost.toLocaleString()} pts
                      </p>
                      <h4 className="font-display text-lg text-navy mt-1">
                        {reward.name}
                      </h4>
                    </div>
                    {reward.is_sold_out && (
                      <span className="text-[10px] tracking-[0.18em] uppercase text-rose-700">
                        Sold out
                      </span>
                    )}
                  </div>
                  {reward.description && (
                    <p className="text-sm text-ink/65 mt-2 leading-relaxed">
                      {reward.description}
                    </p>
                  )}
                  {tierGated && (
                    <p className="mt-2 text-[11px] text-ink/55">
                      Requires {reward.minimum_tier_label} tier or above.
                    </p>
                  )}
                  <button
                    onClick={() => redeem(reward.id)}
                    disabled={
                      !canAfford ||
                      reward.is_sold_out ||
                      redeemingId === reward.id
                    }
                    className={cn(
                      "mt-4 h-10 px-4 rounded-md text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors",
                      canAfford && !reward.is_sold_out
                        ? "bg-navy text-cream hover:opacity-90"
                        : "bg-ink/5 text-ink/40 cursor-not-allowed",
                    )}
                  >
                    {redeemingId === reward.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    {canAfford
                      ? "Redeem"
                      : `Need ${(reward.points_cost - me.points).toLocaleString()} more pts`}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </Panel>

      {/* Recent activity */}
      <Panel title="Recent activity">
        {me.recent_transactions.length === 0 ? (
          <p className="text-sm text-ink/55">
            Nothing yet — earn points on your first order.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--jmn-line)]">
            {me.recent_transactions.map((t) => {
              const positive = t.points >= 0;
              return (
                <li key={t.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-navy">{t.reason_label}</p>
                    {t.note && (
                      <p className="text-[11px] text-ink/55 mt-0.5">
                        {t.note}
                      </p>
                    )}
                    <p className="text-[10px] text-ink/40 tabular mt-0.5">
                      {formatDate(t.created_at)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "tabular text-sm font-medium shrink-0",
                      positive ? "text-emerald-700" : "text-rose-700",
                    )}
                  >
                    {positive ? "+" : ""}
                    {t.points.toLocaleString()}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

// `useCallback` clone that returns a stable reference even when the callback
// closure changes — used so the effect that calls `refresh` doesn't churn.
function useCallbackOnce<F extends (...args: unknown[]) => unknown>(fn: F): F {
  const ref = useMemo(() => ({ current: fn }), []);
  ref.current = fn;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => ((...args: unknown[]) => ref.current(...args)) as F, []);
}

// ─── Shared bits ─────────────────────────────────────────────────────────────

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; icon?: React.ReactNode; href?: string; onClick?: () => void };
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-2xl md:text-3xl text-navy">{title}</h2>
        {action &&
          (action.href ? (
            <Link
              href={action.href}
              className="text-[11px] tracking-[0.25em] uppercase text-navy hover:text-gold transition-colors flex items-center gap-1.5"
            >
              {action.icon}
              {action.label}
              <ArrowUpRight size={13} />
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="text-[11px] tracking-[0.25em] uppercase text-navy hover:text-gold transition-colors flex items-center gap-1.5"
            >
              {action.icon}
              {action.label}
              <ArrowUpRight size={13} />
            </button>
          ))}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
  error,
  full,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  full?: boolean;
}) {
  return (
    <label className={cn("block", full && "md:col-span-2")}>
      <span className="block text-[10px] tracking-[0.25em] uppercase text-ink/55 mb-1.5">
        {label}
      </span>
      {children}
      {error && <span className="block mt-1 text-xs text-rose-700">{error}</span>}
    </label>
  );
}

function EmptyHint({
  icon,
  title,
  description,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  cta?: { label: string; href?: string; onClick?: () => void };
}) {
  return (
    <div className="border border-dashed border-[var(--jmn-line)] px-6 py-10 grid place-items-center text-center">
      <div className="h-12 w-12 grid place-items-center rounded-full border border-navy/15 text-navy/55 mb-4">
        {icon}
      </div>
      <h3 className="font-display text-xl text-navy">{title}</h3>
      {description && <p className="mt-2 text-sm text-ink/60 max-w-sm">{description}</p>}
      {cta && (
        <div className="mt-5">
          {cta.href ? (
            <Link href={cta.href} className="btn-ghost text-navy border-navy/30 hover:border-navy">
              <span>{cta.label}</span>
            </Link>
          ) : (
            <button
              onClick={cta.onClick}
              className="btn-ghost text-navy border-navy/30 hover:border-navy"
            >
              <span>{cta.label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
