"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  filterSuggestions,
  matchSuggestion,
  type ComboSuggestion,
} from "@/lib/admin/form-derive";

/**
 * Text input with a pick-list (ARIA 1.2 combobox, list autocomplete). The
 * admin can choose a known name or type a new one. Picking — or typing a
 * known name exactly — reports the suggestion so the form can fill related
 * fields (country, machine type…). Options with `disabledReason` (e.g.
 * "Already added") are shown but can't be picked.
 */
export default function Combobox({
  id,
  value,
  onChange,
  suggestions,
  placeholder,
  disabled,
  invalid,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string, picked?: ComboSuggestion) => void;
  suggestions: ComboSuggestion[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const items = useMemo(() => filterSuggestions(suggestions, value), [suggestions, value]);
  const hasList = suggestions.length > 0;
  const showList = open && hasList && !disabled;

  function pick(s: ComboSuggestion) {
    if (s.disabledReason) return;
    onChange(s.value, s);
    setOpen(false);
    setActive(-1);
  }

  function move(delta: number) {
    if (!items.length) return;
    setOpen(true);
    let i = active;
    for (let n = 0; n < items.length; n++) {
      i = (i + delta + items.length) % items.length;
      if (!items[i].disabledReason) break;
    }
    setActive(i);
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        autoComplete="off"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v, matchSuggestion(suggestions, v));
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            move(1);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            move(-1);
          } else if (e.key === "Enter" && showList && active >= 0 && items[active]) {
            e.preventDefault(); // pick, don't submit the form
            pick(items[active]);
          } else if (e.key === "Escape" && showList) {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
          }
        }}
        className={cn(className, hasList && "pr-9")}
      />
      {hasList && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Show suggestions"
          disabled={disabled}
          onMouseDown={(e) => {
            e.preventDefault(); // keep focus in the input
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
          className="absolute right-0 top-0 h-10 w-9 grid place-items-center text-ink/45 hover:text-navy"
        >
          <ChevronDown size={15} />
        </button>
      )}
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 left-0 right-0 max-h-72 overflow-y-auto rounded-md border border-[var(--jmn-line)] bg-white shadow-lg shadow-navy/10 py-1"
        >
          {items.length === 0 ? (
            <li className="px-3 py-2 text-[12px] text-ink/50">
              No match — &ldquo;{value}&rdquo; will be added as a new name.
            </li>
          ) : (
            items.map((s, i) => {
              const selected = s.value.toLowerCase() === value.trim().toLowerCase();
              return (
                <li
                  key={`${s.value}-${i}`}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={s.disabledReason ? true : undefined}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(s);
                  }}
                  onMouseEnter={() => !s.disabledReason && setActive(i)}
                  className={cn(
                    "px-3 py-2 flex items-center gap-3 text-sm",
                    s.disabledReason ? "text-ink/40 cursor-not-allowed" : "text-navy cursor-pointer",
                    i === active && !s.disabledReason && "bg-[#F4F5F7]",
                  )}
                >
                  <span className="w-4 shrink-0">{selected && <Check size={14} />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{s.label ?? s.value}</span>
                    {s.hint && <span className="block text-[11px] text-ink/45 truncate">{s.hint}</span>}
                  </span>
                  {s.disabledReason && (
                    <span className="shrink-0 text-[10px] tracking-[0.12em] uppercase text-ink/45">
                      {s.disabledReason}
                    </span>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
