"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  /** Show the "Part no." caption above the value. */
  labelled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

/**
 * OEM part number: always mono, always visible, one tap to copy (buyers paste
 * it into WhatsApp). The tick confirms for 1.6s; aria-live announces it.
 */
export function PartNumber({ value, labelled = false, size = "md", className }: Props) {
  const t = useTranslations("ui");
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Old Android WebViews: fall back to a hidden textarea.
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  }

  if (!value) return null;

  return (
    <span className={cn("inline-flex flex-col gap-0.5", className)}>
      {labelled && <span className="re-label">{t("partNumber")}</span>}
      <span
        className={cn(
          "inline-flex items-stretch rounded-re border border-re-steel-200 bg-re-steel-50",
          size === "lg" ? "text-lg" : size === "sm" ? "text-[0.8125rem]" : "text-[0.9375rem]",
        )}
      >
        <span translate="no" className="re-mono select-all px-2 py-1 font-medium text-re-ink">
          {value}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label={t("copyPartNumber", { value })}
          title={copied ? t("copied") : t("copy")}
          className={cn(
            "relative grid min-h-8 min-w-8 place-items-center border-l border-re-steel-200 px-1.5 transition-colors duration-150 ease-re",
            "before:absolute before:-inset-1.5 before:content-['']", // ≥44px hit area
            copied ? "text-re-stock-in" : "text-re-steel-600 hover:bg-re-paper hover:text-re-ink",
          )}
        >
          {copied ? (
            <Check aria-hidden className="size-4 animate-re-tick" strokeWidth={2.25} />
          ) : (
            <Copy aria-hidden className="size-4" strokeWidth={1.75} />
          )}
        </button>
        <span aria-live="polite" className="sr-only">
          {copied ? t("copied") : ""}
        </span>
      </span>
    </span>
  );
}
