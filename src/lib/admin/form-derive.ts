/**
 * Pure helpers behind ResourceForm's auto-filled fields (slug / sku) and the
 * name combobox — kept free of React so they can be unit-tested.
 *
 *   { name: "slug", autoFrom: "name" }                         → "juki"
 *   { name: "slug", autoFrom: ["machine_brand", "name"],
 *     autoValue: (v) => `${brandSlug(v.machine_brand)} ${v.name}` } → "juki-ddl-8700"
 *
 * Rules:
 *   • an auto field follows its source(s) until the user edits it;
 *   • clearing it hands it back to auto mode (re-derived on the next source
 *     change, and at submit if still blank) — a slug is never a blocker;
 *   • picking a combobox suggestion may `fill` other fields: a field is
 *     filled when it is blank, or on create when the user hasn't typed in it.
 */

export interface DerivableField {
  name: string;
  autoFrom?: string | string[];
  autoDerive?: "slug" | "sku";
  /** Source text for the derived value (default: the first source's value). */
  autoValue?: (values: Record<string, unknown>) => string;
}

export interface ComboSuggestion {
  value: string;
  label?: string;
  /** Second line, e.g. the country or machine type. */
  hint?: string;
  /** Shown as a badge; the option can't be picked (e.g. "Already added"). */
  disabledReason?: string;
  /** Other fields to fill when this suggestion is picked. */
  fill?: Record<string, unknown>;
}

type Values = Record<string, unknown>;
type Touched = Record<string, boolean>;

/** Convert any string into a URL-safe kebab-case slug. */
export function deriveSlug(input: string): string {
  return String(input ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate a recognisable SKU from a name: "Rotary hook" → "RE-ROT-7842".
 * Three-letter prefix + four random digits; the user can still override.
 */
export function deriveSku(input: string): string {
  const cleaned = String(input ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!cleaned) return "";
  const prefix = cleaned.slice(0, 3).padEnd(3, "X");
  const suffix = String(1000 + Math.floor(Math.random() * 9000));
  return `RE-${prefix}-${suffix}`;
}

export function sourcesOf(f: DerivableField): string[] {
  if (!f.autoFrom) return [];
  return Array.isArray(f.autoFrom) ? f.autoFrom : [f.autoFrom];
}

function isBlank(v: unknown): boolean {
  return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
}

function sourceText(f: DerivableField, values: Values): string {
  if (f.autoValue) return f.autoValue(values);
  return String(values[sourcesOf(f)[0]] ?? "");
}

/** Re-derive every untouched auto field whose source is in `changed`. */
export function deriveDependents(
  fields: DerivableField[],
  values: Values,
  touched: Touched,
  changed: Set<string>,
): Values {
  const next = { ...values };
  for (const f of fields) {
    const sources = sourcesOf(f);
    if (!sources.length || touched[f.name]) continue;
    if (!sources.some((s) => changed.has(s))) continue;
    if (f.autoDerive === "sku") {
      // SKU generates once, then stays until the user clears / edits it.
      if (!next[f.name]) {
        const sku = deriveSku(sourceText(f, next));
        if (sku) next[f.name] = sku;
      }
    } else {
      next[f.name] = deriveSlug(sourceText(f, next));
    }
  }
  return next;
}

/** One user edit (optionally with combobox `fill`s) → next values + touched. */
export function applyFieldChange(args: {
  fields: DerivableField[];
  values: Values;
  touched: Touched;
  mode: "create" | "edit";
  name: string;
  value: unknown;
  fill?: Record<string, unknown>;
}): { values: Values; touched: Touched } {
  const { fields, values, mode, name, value, fill } = args;
  const field = fields.find((f) => f.name === name);
  // Clearing an auto field hands it back to auto mode.
  const touched: Touched = {
    ...args.touched,
    [name]: !(field && sourcesOf(field).length && isBlank(value)),
  };
  let next: Values = { ...values, [name]: value };
  const changed = new Set([name]);
  if (fill) {
    for (const [k, v] of Object.entries(fill)) {
      if (isBlank(next[k]) || (mode === "create" && !touched[k])) {
        next[k] = v;
        changed.add(k);
      }
    }
  }
  next = deriveDependents(fields, next, touched, changed);
  return { values: next, touched };
}

/** At submit: blank auto slugs are derived from their sources. */
export function fillBlankAuto(fields: DerivableField[], values: Values): Values {
  const next = { ...values };
  for (const f of fields) {
    if (!sourcesOf(f).length || f.autoDerive === "sku" || !isBlank(next[f.name])) continue;
    const slug = deriveSlug(sourceText(f, next));
    if (slug) next[f.name] = slug;
  }
  return next;
}

/** Suggestions matching what's typed (all of them when the box is empty or
 *  already holds an exact pick), pickable ones first. */
export function filterSuggestions(
  list: ComboSuggestion[],
  query: string,
  limit = 60,
): ComboSuggestion[] {
  const q = query.trim().toLowerCase();
  const exact = list.some((s) => s.value.toLowerCase() === q);
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const nq = norm(q);
  const hits =
    !q || exact
      ? list
      : list.filter((s) => {
          const hay = `${s.value} ${s.label ?? ""} ${s.hint ?? ""}`.toLowerCase();
          return hay.includes(q) || (nq.length > 0 && norm(hay).includes(nq));
        });
  return [...hits.filter((s) => !s.disabledReason), ...hits.filter((s) => s.disabledReason)].slice(0, limit);
}

/** Exact (case-insensitive) suggestion for a typed value, if any. */
export function matchSuggestion(list: ComboSuggestion[], value: string): ComboSuggestion | undefined {
  const v = value.trim().toLowerCase();
  if (!v) return undefined;
  return list.find((s) => s.value.toLowerCase() === v && !s.disabledReason);
}
