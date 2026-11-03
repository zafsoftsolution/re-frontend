"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import {
  djangoAdmin,
  type TierConfigShape,
} from "@/lib/django-admin";
import PageHeader from "@/components/admin/PageHeader";
import { useToast } from "@/context/FeedbackContext";
import { cn } from "@/lib/utils";

/**
 * Tier config is a fixed enum (5 rows). Inline editor — every row exposes
 * its threshold, multiplier, perks, and active toggle. Save per row.
 */
export default function AdminLoyaltyTiers() {
  const [tiers, setTiers] = useState<TierConfigShape[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  function load() {
    return djangoAdmin.loyalty.tiers.list().then(
      (data) =>
        setTiers(
          (data as { results: TierConfigShape[] }).results ??
            (data as unknown as TierConfigShape[]),
        ),
      (e) => setError((e as Error).message),
    );
  }

  useEffect(() => {
    load();
  }, []);

  if (error) {
    return (
      <div className="rounded-md bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
        {error}
      </div>
    );
  }
  if (!tiers) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 size={22} className="text-navy/60 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Loyalty"
        title="Tier configuration"
        description="Lifetime-spend thresholds, points multipliers, and perks for each tier. Customers are auto-promoted whenever a paid order pushes their lifetime value over a threshold."
      />

      <div className="space-y-4">
        {tiers
          .slice()
          .sort((a, b) => a.rank - b.rank)
          .map((t) => (
            <TierCard
              key={t.id}
              tier={t}
              onSaved={(updated) => {
                setTiers((prev) =>
                  prev?.map((x) => (x.id === updated.id ? updated : x)) ?? prev,
                );
                toast.success(`${updated.tier_label} updated`);
              }}
              onError={(msg) => toast.error("Couldn't save", msg)}
            />
          ))}
      </div>
    </>
  );
}

function TierCard({
  tier,
  onSaved,
  onError,
}: {
  tier: TierConfigShape;
  onSaved: (t: TierConfigShape) => void;
  onError: (msg: string) => void;
}) {
  const [draft, setDraft] = useState({
    minimum_lifetime_value: tier.minimum_lifetime_value,
    points_multiplier: tier.points_multiplier,
    points_per_currency: tier.points_per_currency,
    badge_color: tier.badge_color,
    description: tier.description,
    is_active: tier.is_active,
    perks_text: (tier.perks ?? []).join("\n"),
  });
  const [saving, setSaving] = useState(false);

  const dirty =
    draft.minimum_lifetime_value !== tier.minimum_lifetime_value ||
    draft.points_multiplier !== tier.points_multiplier ||
    draft.points_per_currency !== tier.points_per_currency ||
    draft.badge_color !== tier.badge_color ||
    draft.description !== tier.description ||
    draft.is_active !== tier.is_active ||
    draft.perks_text !== (tier.perks ?? []).join("\n");

  async function save() {
    setSaving(true);
    try {
      const updated = await djangoAdmin.loyalty.tiers.update(tier.id, {
        minimum_lifetime_value: draft.minimum_lifetime_value,
        points_multiplier: draft.points_multiplier,
        points_per_currency: draft.points_per_currency,
        badge_color: draft.badge_color,
        description: draft.description,
        is_active: draft.is_active,
        perks: draft.perks_text
          .split("\n")
          .map((p) => p.trim())
          .filter(Boolean),
      });
      onSaved(updated);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="bg-white border border-[var(--jmn-line)] rounded-lg overflow-hidden">
      <header className="px-5 py-4 border-b border-[var(--jmn-line)] flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span
            className="h-9 w-9 rounded-full grid place-items-center text-cream text-[11px] tracking-[0.18em] uppercase font-medium"
            style={{ background: tier.badge_color || "#0E1A3A" }}
          >
            {tier.tier.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-ink/45">
              Rank {tier.rank}
            </p>
            <h3 className="font-display text-xl text-navy">{tier.tier_label}</h3>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink/55">
            {tier.customer_count} {tier.customer_count === 1 ? "customer" : "customers"}
          </span>
          <button
            onClick={save}
            disabled={!dirty || saving}
            className={cn(
              "h-9 px-4 rounded-md text-sm font-medium inline-flex items-center gap-2 transition-colors",
              dirty
                ? "bg-navy text-cream hover:opacity-90"
                : "bg-ink/5 text-ink/40 cursor-not-allowed",
            )}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
        </div>
      </header>

      <div className="px-5 py-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Minimum lifetime value (৳)" hint="When LTV ≥ this, customer joins this tier">
          <input
            type="number"
            min={0}
            step="0.01"
            value={draft.minimum_lifetime_value}
            onChange={(e) =>
              setDraft({ ...draft, minimum_lifetime_value: e.target.value })
            }
            className="tier-input"
          />
        </Field>
        <Field label="Points multiplier" hint="Awarded per order × this">
          <input
            type="number"
            min={0}
            step="0.05"
            value={draft.points_multiplier}
            onChange={(e) =>
              setDraft({ ...draft, points_multiplier: e.target.value })
            }
            className="tier-input"
          />
        </Field>
        <Field label="Points per ৳" hint="Base earn rate before multiplier">
          <input
            type="number"
            min={0}
            step="0.05"
            value={draft.points_per_currency}
            onChange={(e) =>
              setDraft({ ...draft, points_per_currency: e.target.value })
            }
            className="tier-input"
          />
        </Field>

        <Field label="Badge color" hint="Hex / CSS color">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={draft.badge_color}
              onChange={(e) =>
                setDraft({ ...draft, badge_color: e.target.value })
              }
              placeholder="#C9A14A"
              className="tier-input"
            />
            <span
              className="h-9 w-9 rounded border border-[var(--jmn-line)] shrink-0"
              style={{ background: draft.badge_color || "#0E1A3A" }}
              aria-hidden
            />
          </div>
        </Field>
        <Field label="Active" hint="Hidden tiers don't promote customers">
          <label className="inline-flex items-center gap-2 h-9">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(e) =>
                setDraft({ ...draft, is_active: e.target.checked })
              }
              className="h-4 w-4"
            />
            <span className="text-sm text-ink/75">Tier is live</span>
          </label>
        </Field>
        <Field label="Description (admin)" hint="Internal note — not shown publicly">
          <input
            type="text"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className="tier-input"
          />
        </Field>

        <div className="md:col-span-3">
          <Field label="Perks (one per line)" hint="Shown on the customer's loyalty hub">
            <textarea
              value={draft.perks_text}
              onChange={(e) => setDraft({ ...draft, perks_text: e.target.value })}
              rows={4}
              className="tier-input"
              placeholder="Free shipping on every order&#10;Birthday gift&#10;Early access to drops"
            />
          </Field>
        </div>
      </div>

      <style jsx global>{`
        .tier-input {
          width: 100%;
          height: 36px;
          padding: 0 10px;
          border: 1px solid var(--jmn-line);
          border-radius: 6px;
          background: white;
          font-size: 14px;
          color: var(--jmn-ink, #0a0a0a);
          font-variant-numeric: tabular-nums;
        }
        .tier-input:focus {
          outline: none;
          border-color: var(--jmn-navy);
          box-shadow: 0 0 0 3px rgba(14, 26, 58, 0.08);
        }
        textarea.tier-input {
          height: auto;
          padding-top: 8px;
          padding-bottom: 8px;
          resize: vertical;
          font-variant-numeric: normal;
        }
      `}</style>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[10px] tracking-[0.18em] uppercase text-ink/55 mb-1 block">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-ink/45">{hint}</p>}
    </div>
  );
}
