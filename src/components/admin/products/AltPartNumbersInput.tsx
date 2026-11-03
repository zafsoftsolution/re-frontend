"use client";

import { useState } from "react";
import { X } from "lucide-react";

/**
 * Tag input for alternate / superseded / cross-reference part numbers.
 * Enter, comma, semicolon or Tab commits; pasting "A; B, C" adds all three.
 * Backspace on an empty box removes the last tag. Values are de-duplicated
 * case-insensitively (the backend normalises them again).
 */
export default function AltPartNumbersInput({
  value,
  onChange,
  id,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  id?: string;
}) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const parts = raw
      .split(/[,;\n\t]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const seen = new Set(value.map((v) => v.toLowerCase()));
    const next = [...value];
    for (const p of parts) {
      if (!seen.has(p.toLowerCase())) {
        seen.add(p.toLowerCase());
        next.push(p.slice(0, 120));
      }
    }
    onChange(next);
    setDraft("");
  };

  return (
    <div className="min-h-10 w-full flex flex-wrap items-center gap-1.5 px-2 py-1.5 bg-white border border-re-steel-300 focus-within:border-re-blue">
      {value.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 bg-re-steel-100 border border-re-steel-200 pl-2 pr-1 h-7 part-no text-[12px] text-re-ink">
          {v}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== v))}
            aria-label={`Remove ${v}`}
            className="h-6 w-6 grid place-items-center text-ink/60 hover:text-re-ink"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => {
          const v = e.target.value;
          if (/[,;]/.test(v)) add(v);
          else setDraft(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Tab") {
            if (draft.trim()) {
              e.preventDefault();
              add(draft);
            }
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft.trim() && add(draft)}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (/[,;\n\t]/.test(text)) {
            e.preventDefault();
            add(draft + text);
          }
        }}
        placeholder={value.length ? "" : "e.g. 110-12345, B1101012000"}
        aria-label="Add alternate part number"
        className="flex-1 min-w-[140px] h-7 bg-transparent outline-none part-no text-[13px] placeholder:text-ink/40 placeholder:font-sans"
      />
    </div>
  );
}
