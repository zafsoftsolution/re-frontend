"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { KpiDelta } from "@/types/admin";
import { cn } from "@/lib/utils";
import Sparkline from "./Sparkline";

interface Props {
  label: string;
  value: string;
  delta?: KpiDelta;
  spark?: number[];
  /** "%" or currency code, used for context only — value should already be formatted */
  hint?: string;
}

export default function StatCard({ label, value, delta, spark, hint }: Props) {
  return (
    <div className="bg-white border border-[var(--jmn-line)] rounded-lg p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] tracking-[0.3em] uppercase text-ink/55">
          {label}
        </p>
        {delta && <DeltaBadge delta={delta} />}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-display text-3xl md:text-4xl text-navy tabular leading-none">
            {value}
          </p>
          {hint && <p className="mt-1.5 text-[11px] text-ink/45">{hint}</p>}
        </div>
        {spark && spark.length > 1 && (
          <Sparkline data={spark} width={88} height={32} />
        )}
      </div>
    </div>
  );
}

function DeltaBadge({ delta }: { delta: KpiDelta }) {
  const tone =
    delta.trend === "up"
      ? "bg-emerald-50 text-emerald-700"
      : delta.trend === "down"
      ? "bg-rose-50 text-rose-700"
      : "bg-ink/5 text-ink/55";
  const Icon =
    delta.trend === "up" ? ArrowUpRight : delta.trend === "down" ? ArrowDownRight : Minus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium tabular px-2 py-0.5 rounded-full",
        tone
      )}
    >
      <Icon size={11} />
      {delta.value}%
    </span>
  );
}
