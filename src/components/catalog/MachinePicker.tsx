"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown } from "lucide-react";
import { inputClass } from "@/components/ui/Input";
import { buttonClass } from "@/components/ui/button-styles";
import { cn } from "@/lib/utils";

export interface PickerBrand {
  slug: string;
  name: string;
  models: { slug: string; name: string }[];
}

/**
 * "Find by machine": brand → model. A GET form to /machines/find (a route
 * handler that redirects), so without JS a brand choice still lands on the
 * brand page. With JS the model list follows the brand and we navigate
 * client-side straight to the model page.
 */
export function MachinePicker({
  action,
  machinesPath,
  brands,
  labels,
  className,
}: {
  /** Locale-prefixed /machines/find. */
  action: string;
  /** Locale-prefixed /machines. */
  machinesPath: string;
  brands: PickerBrand[];
  labels: { brand: string; model: string; chooseBrand: string; anyModel: string; submit: string };
  className?: string;
}) {
  const router = useRouter();
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const models = brands.find((b) => b.slug === brand)?.models ?? [];

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!brand) return;
    router.push(model ? `${machinesPath}/${brand}/${model}` : `${machinesPath}/${brand}`);
  }

  const select = cn(inputClass, "h-12 cursor-pointer appearance-none pr-9 text-base disabled:cursor-not-allowed");
  return (
    <form action={action} method="get" onSubmit={submit} className={cn("grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end", className)}>
      <label className="block min-w-0">
        <span className="re-label mb-1.5 block">{labels.brand}</span>
        <span className="relative block">
          <select
            name="brand"
            required
            value={brand}
            onChange={(e) => {
              setBrand(e.target.value);
              setModel("");
            }}
            className={select}
          >
            <option value="">{labels.chooseBrand}</option>
            {brands.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-re-steel-600" />
        </span>
      </label>
      <label className="block min-w-0">
        <span className="re-label mb-1.5 block">{labels.model}</span>
        <span className="relative block">
          <select
            name="model"
            value={model}
            disabled={models.length === 0}
            onChange={(e) => setModel(e.target.value)}
            className={cn(select, "re-mono")}
          >
            <option value="">{labels.anyModel}</option>
            {models.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.name}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-re-steel-600" />
        </span>
      </label>
      <button type="submit" className={buttonClass({ variant: "primary" }, "h-12")}>
        {labels.submit}
        <ArrowRight aria-hidden />
      </button>
    </form>
  );
}
