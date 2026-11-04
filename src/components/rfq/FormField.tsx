import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { inputClass } from "@/components/ui/Input";

/**
 * Labelled form row shared by the RFQ, checkout and contact forms: label
 * (with "optional" marker), control, hint and error. The control gets
 * `id`, `aria-describedby` and `aria-invalid` from the caller.
 */
export function FormField({
  id,
  label,
  optional,
  optionalLabel,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  optional?: boolean;
  optionalLabel?: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-[0.9375rem] font-semibold text-re-ink">
        <span>{label}</span>
        {optional && optionalLabel && <span className="re-label font-normal">{optionalLabel}</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-[0.8125rem] text-re-steel-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[0.8125rem] font-semibold text-re-red-text">
          {error}
        </p>
      )}
    </div>
  );
}

/** aria-describedby for a FormField control. */
export const describedBy = (id: string, error?: string, hint?: boolean) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

export const textareaClass = cn(inputClass, "h-auto min-h-28 py-2.5 leading-relaxed");

export const selectClass = cn(
  inputClass,
  "appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10",
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235B6168' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
);

/** Document-style numbered block heading inside a form ("01 Parts"). */
export function FormSection({ index, title, lead, children, className, id }: { index: string; title: ReactNode; lead?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section aria-labelledby={id} className={cn("relative border-t border-re-ink pt-5", className)}>
      <span aria-hidden className="absolute -top-px left-0 h-[3px] w-12 bg-re-red" />
      <div className="flex items-baseline gap-3">
        <span className="re-mono text-sm font-semibold text-re-red-text">{index}</span>
        <h2 id={id} className="text-[1.25rem] font-bold text-re-ink sm:text-[1.375rem]">
          {title}
        </h2>
      </div>
      {lead && <p className="mt-1.5 max-w-2xl text-[0.9375rem] text-re-steel-600">{lead}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}
