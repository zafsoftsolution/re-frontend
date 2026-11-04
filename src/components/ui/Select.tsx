"use client";

import { Select as BaseSelect } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

/** Single select (filters, sort, machine model picker). Restyled Base UI Select. */
export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  label,
  name,
  className,
}: {
  options: SelectOption[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  /** Accessible name for the trigger. */
  label: string;
  name?: string;
  className?: string;
}) {
  return (
    <BaseSelect.Root
      items={options}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(v) => onValueChange?.(v as string | null)}
      name={name}
    >
      <BaseSelect.Trigger
        aria-label={label}
        className={cn(
          "flex h-11 min-w-40 items-center justify-between gap-2 rounded-re border border-re-steel-500 bg-re-paper px-3 text-left text-[0.9375rem]",
          "hover:border-re-steel-600 data-popup-open:border-re-ink",
          className,
        )}
      >
        <BaseSelect.Value placeholder={placeholder} className="truncate data-placeholder:text-re-steel-600" />
        <BaseSelect.Icon>
          <ChevronDown aria-hidden className="size-4 text-re-steel-600" />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner sideOffset={4} alignItemWithTrigger={false} className="z-50 outline-none">
          <BaseSelect.Popup className="max-h-[min(24rem,var(--available-height))] min-w-[var(--anchor-width)] overflow-y-auto rounded-re border border-re-steel-200 bg-re-paper py-1 shadow-re-float outline-none transition-opacity duration-120 data-ending-style:opacity-0 data-starting-style:opacity-0">
            {options.map((o) => (
              <BaseSelect.Item
                key={o.value}
                value={o.value}
                className="grid min-h-11 cursor-default grid-cols-[1rem_1fr] items-center gap-2 px-3 text-[0.9375rem] outline-none select-none data-highlighted:bg-re-steel-100"
              >
                <BaseSelect.ItemIndicator>
                  <Check aria-hidden className="size-4" />
                </BaseSelect.ItemIndicator>
                <BaseSelect.ItemText className="col-start-2">{o.label}</BaseSelect.ItemText>
              </BaseSelect.Item>
            ))}
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
