import type { ComponentProps, ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export const inputClass =
  "h-11 w-full min-w-0 rounded-re border border-re-steel-500 bg-re-paper px-3 text-base text-re-ink " +
  "placeholder:text-re-steel-600 transition-colors duration-150 ease-re " +
  "hover:border-re-steel-600 focus-visible:border-re-blue focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-re-blue " +
  "aria-invalid:border-re-red-text disabled:bg-re-steel-50 disabled:text-re-steel-600";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...props} />;
}

type SearchInputProps = Omit<ComponentProps<"input">, "type" | "size"> & {
  /** Accessible label (visually hidden). */
  label: string;
  submitLabel: string;
  /** Form action — the public /search route (locale-prefixed by caller). */
  action: string;
  size?: "md" | "lg";
  trailing?: ReactNode;
};

/**
 * Plain GET form → works without JS and on the slowest phones. Part numbers
 * are typed in mono so 0/O and 1/I are distinguishable.
 */
export function SearchInput({
  label,
  submitLabel,
  action,
  size = "md",
  className,
  trailing,
  name = "q",
  ...props
}: SearchInputProps) {
  const lg = size === "lg";
  return (
    <form action={action} method="get" role="search" className={cn("flex w-full items-stretch", className)}>
      <label className="relative flex min-w-0 flex-1 items-center">
        <span className="sr-only">{label}</span>
        <Search
          aria-hidden
          className={cn("pointer-events-none absolute left-3 text-re-steel-600", lg ? "size-5" : "size-[1.125rem]")}
          strokeWidth={1.75}
        />
        <input
          type="search"
          name={name}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint="search"
          className={cn(
            inputClass,
            "re-mono rounded-r-none border-r-0 pl-10 [&::-webkit-search-cancel-button]:hidden",
            "placeholder:font-re-sans",
            lg ? "h-14 text-[1.0625rem]" : "h-11 text-[0.9375rem]",
          )}
          {...props}
        />
      </label>
      {trailing}
      <button
        type="submit"
        className={cn(
          "shrink-0 rounded-r-re bg-re-ink px-4 font-semibold text-white transition-colors duration-150 ease-re hover:bg-re-red-dark",
          lg ? "h-14 px-6 text-base" : "h-11 text-sm",
        )}
      >
        {submitLabel}
      </button>
    </form>
  );
}
