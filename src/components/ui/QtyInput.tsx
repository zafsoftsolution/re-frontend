"use client";

import { useState, type ComponentProps } from "react";
import { clampQty, parseQty, qtyDraft } from "@/lib/qty";

type Props = Omit<ComponentProps<"input">, "value" | "onChange" | "type" | "min" | "max"> & {
  value: number;
  min: number;
  max: number;
  /** Called with a valid, in-range integer (while typing) or the clamped value (on blur). */
  onCommit: (qty: number) => void;
};

/**
 * Quantity field that keeps a string draft: the buyer can clear it and type
 * "5" (a numeric-only controlled input would snap back to the minimum on
 * the empty step), Bangla digits work, and out-of-range / empty values are
 * clamped on blur. External changes (stepper buttons) replace the draft.
 */
export function QtyInput({ value, min, max, onCommit, onBlur, ...props }: Props) {
  const [draft, setDraft] = useState(String(value));
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    // Derived-state sync (React docs: "storing information from previous renders").
    setSeen(value);
    if (parseQty(draft) !== value) setDraft(String(value));
  }

  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={draft}
      onChange={(e) => {
        const next = qtyDraft(e.target.value);
        setDraft(next);
        const n = parseQty(next);
        if (n !== null && n >= min && n <= max && n !== value) onCommit(n);
      }}
      onBlur={(e) => {
        const n = clampQty(draft, min, max);
        setDraft(String(n));
        if (n !== value) onCommit(n);
        onBlur?.(e);
      }}
    />
  );
}
