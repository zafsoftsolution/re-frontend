"use client";

import { useState } from "react";
import { Loader2, ListPlus } from "lucide-react";
import {
  djangoAdmin,
  type CategorySeedResult,
  type MachineCatalogSeedResult,
} from "@/lib/django-admin";
import { useToast } from "@/context/FeedbackContext";
import AdminDialog, { btn } from "./ui/AdminDialog";
import { cn } from "@/lib/utils";

/**
 * "Load standard brands & models" / "Load standard categories": previews the
 * server-side seed (dry run), shows what would be added, then applies it.
 * The seed never renames or overwrites anything — it only adds what's
 * missing and fills blank fields — so it is safe to run again later.
 */

type Target = "machines" | "categories";

interface Plan {
  groups: Array<{ title: string; items: Array<{ name: string; note?: string }> }>;
  toAdd: number;
  kept: number;
  filled: number;
  skipped: number;
}

const GROUP_TITLES: Record<string, string> = {
  "machine brand": "Machine brands",
  "machine model": "Machine models",
  "parts brand": "Parts brands",
};

const MACHINE_TYPE_LABEL: Record<string, string> = {
  lockstitch: "Lockstitch", overlock: "Overlock", flatlock: "Flatlock / coverstitch",
  buttonhole: "Buttonhole", bartack: "Bartack", button_attach: "Button attaching",
  feed_off_arm: "Feed-off-the-arm", multi_needle: "Multi-needle / chainstitch",
  blind_stitch: "Blind stitch", special: "Special / automatic", other: "Other",
};

function machinePlan(r: MachineCatalogSeedResult): Plan {
  const groups = Object.keys(GROUP_TITLES).map((kind) => ({
    title: GROUP_TITLES[kind],
    items: r.rows
      .filter((x) => x.kind === kind && x.action === "create")
      .map((x) => ({
        name: x.name,
        note: kind === "machine model" ? MACHINE_TYPE_LABEL[x.note] ?? x.note : x.note,
      })),
  }));
  const s = r.stats;
  return {
    groups: groups.filter((g) => g.items.length),
    toAdd: s.machine_brands_created + s.machine_models_created + s.parts_brands_created,
    kept: s.machine_brands_existing + s.machine_models_existing + s.parts_brands_existing,
    filled: s.fields_filled,
    skipped: s.skipped,
  };
}

function categoryPlan(r: CategorySeedResult): Plan {
  const pick = (verb: string) => r.rows.filter((x) => x.startsWith(verb));
  const items = pick("create").map((x) => {
    const text = x.replace(/^create\s+\S+\s+—\s+/, "");
    const device = text.endsWith("[device]");
    return { name: text.replace(/\s*\[device\]$/, ""), note: device ? "device" : "parts" };
  });
  return {
    groups: items.length ? [{ title: "Categories", items }] : [],
    toAdd: items.length,
    kept: pick("keep").length,
    filled: pick("keep").filter((x) => x.includes("(set ")).length,
    skipped: pick("skip").length,
  };
}

async function runSeed(target: Target, dryRun: boolean): Promise<Plan & { summary: string }> {
  if (target === "machines") {
    const r = await djangoAdmin.machineBrands.seedStandard(dryRun);
    return { ...machinePlan(r), summary: r.summary };
  }
  const r = await djangoAdmin.categories.seedStandard(dryRun);
  return { ...categoryPlan(r), summary: r.summary };
}

export default function StandardCatalogLoader({
  target,
  onDone,
  variant = "primary",
  label,
}: {
  target: Target;
  onDone: () => void | Promise<void>;
  variant?: "primary" | "subtle";
  label?: string;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<"preview" | "apply" | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const text =
    label ?? (target === "machines" ? "Load standard brands & models" : "Load standard categories");
  const what = target === "machines" ? "brands and models" : "categories";

  async function preview() {
    setBusy("preview");
    try {
      setPlan(await runSeed(target, true));
    } catch (e) {
      toast.error("Couldn't load the standard list", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function apply() {
    setBusy("apply");
    try {
      const done = await runSeed(target, false);
      setPlan(null);
      toast.success(
        done.toAdd ? `Added ${done.toAdd} standard ${what}` : `Your ${what} are up to date`,
        done.filled ? `${done.filled} blank field(s) filled in.` : undefined,
      );
      await onDone();
    } catch (e) {
      toast.error("Couldn't add the standard list", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={preview}
        disabled={busy !== null}
        className={cn(
          variant === "primary"
            ? "h-10 px-4 rounded-md bg-navy text-cream text-[12px] tracking-[0.1em] uppercase hover:bg-navy-deep"
            : "h-9 px-3 rounded-md border border-[var(--jmn-line)] text-[11px] tracking-[0.18em] uppercase text-ink/65 hover:text-navy hover:border-navy/30",
          "inline-flex items-center gap-2 transition-colors disabled:opacity-50",
        )}
      >
        {busy === "preview" ? <Loader2 size={13} className="animate-spin" /> : <ListPlus size={14} />}
        {text}
      </button>

      <AdminDialog
        open={plan !== null}
        onClose={() => busy !== "apply" && setPlan(null)}
        title={plan?.toAdd ? `Add ${plan.toAdd} standard ${what}?` : `Nothing new to add`}
        description={
          plan?.toAdd
            ? "Nothing you already have is renamed or changed — only missing entries are added. You can edit or deactivate any of them afterwards."
            : `Every standard entry is already in your catalog${plan?.filled ? "; blank details will be filled in" : ""}.`
        }
        wide
        footer={
          <>
            <button type="button" className={btn.secondary} onClick={() => setPlan(null)} disabled={busy === "apply"}>
              {plan?.toAdd || plan?.filled ? "Cancel" : "Close"}
            </button>
            {!!(plan?.toAdd || plan?.filled) && (
              <button type="button" className={btn.primary} onClick={apply} disabled={busy === "apply"}>
                {busy === "apply" && <Loader2 size={14} className="animate-spin" />}
                {plan.toAdd ? `Add ${plan.toAdd} ${what}` : "Fill blank details"}
              </button>
            )}
          </>
        }
      >
        {plan && (
          <div className="space-y-4">
            <p className="text-[13px] text-ink/65">
              {plan.kept > 0 && `${plan.kept} already in your catalog (kept as they are). `}
              {plan.filled > 0 && `${plan.filled} blank field(s) will be filled in. `}
              {plan.skipped > 0 &&
                `${plan.skipped} skipped because a deleted entry uses the same name — restore it instead.`}
            </p>
            {plan.groups.map((g) => (
              <section key={g.title}>
                <h3 className="text-[11px] tracking-[0.18em] uppercase text-ink/55 mb-1.5">
                  {g.title} <span className="tabular text-ink/40">({g.items.length})</span>
                </h3>
                <ul className="max-h-48 overflow-y-auto border border-[var(--jmn-line)] rounded-md divide-y divide-[var(--jmn-line)]">
                  {g.items.map((it) => (
                    <li key={it.name} className="px-3 py-1.5 flex justify-between gap-3 text-sm">
                      <span className="text-navy">{it.name}</span>
                      {it.note && <span className="text-[12px] text-ink/50">{it.note}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </AdminDialog>
    </>
  );
}
