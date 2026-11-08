"use client";

import { useCallback, useEffect, useState } from "react";
import { djangoAdmin, type MachineCatalogSuggestions } from "@/lib/django-admin";
import type { ComboSuggestion } from "@/lib/admin/form-derive";
import { MACHINE_TYPES } from "@/lib/admin/catalog-fields";

/**
 * The standard machine catalog (same data as the backend
 * `seed_machine_catalog` command) for the admin name pickers. `reload()`
 * after a save so "Already added" stays current.
 */
export function useMachineCatalogSuggestions() {
  const [data, setData] = useState<MachineCatalogSuggestions | null>(null);
  const reload = useCallback(
    () =>
      djangoAdmin.machineBrands.catalogSuggestions().then(
        (d) => setData(d),
        () => {
          /* suggestions are a convenience — typing still works */
        },
      ),
    [],
  );
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, reload };
}

const ADDED = "Already added";

/** Edit mode keeps the current name pickable (it "exists" — it's this row). */
function addedReason(exists: boolean, value: string, current: unknown, mode: "create" | "edit") {
  if (!exists) return undefined;
  if (mode === "edit" && String(current ?? "").toLowerCase() === value.toLowerCase()) return undefined;
  return ADDED;
}

export function machineBrandSuggestions(
  data: MachineCatalogSuggestions | null,
  values: Record<string, unknown>,
  mode: "create" | "edit",
): ComboSuggestion[] {
  return (data?.machine_brands ?? []).map((b) => ({
    value: b.name,
    hint: `${b.country}${b.model_count ? ` · ${b.model_count} standard models` : ""}`,
    disabledReason: addedReason(b.exists, b.name, values.name, mode),
    fill: { country: b.country },
  }));
}

const TYPE_LABEL = Object.fromEntries(MACHINE_TYPES.map((t) => [t.value, t.label]));

/** Models of the brand currently chosen in the form (`brandSlug` maps the
 *  form's brand id to its slug). */
export function machineModelSuggestions(
  data: MachineCatalogSuggestions | null,
  brandSlug: string | undefined,
  values: Record<string, unknown>,
  mode: "create" | "edit",
): ComboSuggestion[] {
  if (!brandSlug) return [];
  return (data?.machine_models ?? [])
    .filter((m) => m.brand_slug === brandSlug)
    .map((m) => ({
      value: m.name,
      hint: TYPE_LABEL[m.machine_type] ?? m.machine_type,
      disabledReason: addedReason(m.exists, m.name, values.name, mode),
      fill: { machine_type: m.machine_type },
    }));
}

/** Parts brands; picking one also fills Genuine/OEM and the machine brands
 *  it covers (`machineBrandIds` maps brand names → ids that exist). */
export function partsBrandSuggestions(
  data: MachineCatalogSuggestions | null,
  machineBrandIds: Record<string, string>,
  values: Record<string, unknown>,
  mode: "create" | "edit",
): ComboSuggestion[] {
  return (data?.parts_brands ?? []).map((p) => {
    const ids = p.machine_brand_names
      .map((n) => machineBrandIds[n.toLowerCase()])
      .filter(Boolean);
    return {
      value: p.name,
      hint: `${p.is_oem ? "Genuine / OEM" : "Aftermarket"} · ${
        p.machine_brand_names.length ? p.machine_brand_names.join(", ") : "fits all brands"
      }`,
      disabledReason: addedReason(p.exists, p.name, values.name, mode),
      fill: {
        is_oem: p.is_oem,
        ...(ids.length ? { machine_brands: ids } : {}),
        description: p.description,
      },
    };
  });
}
