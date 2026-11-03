import type { SVGProps } from "react";

/** Simplified WhatsApp-style chat glyph (outline, 1.5px) for buttons. */
export function WhatsAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M3.6 20.4l1.25-4.3a8.6 8.6 0 1 1 3.1 3.1z" />
      <path
        d="M9.1 8.2c-.4.5-.6 1-.5 1.6.4 2.2 2.4 4.3 4.7 4.8.6.1 1.1-.1 1.6-.5l.4-.5-1.8-1.1-.9.6c-.9-.4-1.7-1.2-2.1-2.1l.6-.9-1.1-1.8z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

/**
 * The blue swoosh from the logo — used at most once per page (footer or a
 * hero underline). Stretches to its container width.
 */
export function Swoosh({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden className={className}>
      <path d="M0 34C220 6 560-2 1000 14 610 9 270 16 0 34z" fill="#0077C0" />
    </svg>
  );
}
