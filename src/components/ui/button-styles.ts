import { cn } from "@/lib/utils";

/**
 * Button styles as a class builder so the same look applies to <button>,
 * locale-aware <Link>, and external <a> (tel:, wa.me). Hard edges, no
 * shadows, 44px default height (tap target).
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "whatsapp" | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 rounded-re font-semibold whitespace-nowrap select-none " +
  "transition-[background-color,color,border-color] duration-150 ease-re " +
  "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 " +
  "[&_svg]:shrink-0";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-re-red-dark text-white hover:bg-re-red-deep active:bg-re-red-deep",
  secondary:
    "border border-re-ink bg-re-paper text-re-ink hover:bg-re-ink hover:text-white active:bg-re-ink active:text-white",
  ghost: "text-re-ink hover:bg-re-steel-100 active:bg-re-steel-200",
  whatsapp: "bg-re-whatsapp text-white hover:bg-re-whatsapp-dark active:bg-re-whatsapp-dark",
  link: "text-re-blue underline-offset-4 hover:underline px-0",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-[0.8125rem] [&_svg]:size-4",
  md: "h-11 px-4 text-sm [&_svg]:size-[1.125rem]",
  lg: "h-13 px-6 text-base [&_svg]:size-5",
  icon: "size-11 p-0 [&_svg]:size-5",
};

export function buttonClass(
  { variant = "primary", size = "md" }: { variant?: ButtonVariant; size?: ButtonSize } = {},
  className?: string,
): string {
  return cn(base, variants[variant], variant === "link" ? "h-auto" : sizes[size], className);
}
