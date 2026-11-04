import type { ReactNode } from "react";

export interface FooterLink {
  href: string;
  label: string;
  /** Visually emphasised (e.g. Request a quote). */
  strong?: boolean;
}

/**
 * One collapsible section of the phone footer — a native <details>/<summary>
 * (keyboard + screen-reader expanded state for free, works without JS),
 * closed by default. `group` lets the chevron follow the open state. The
 * shared `name` makes the sections exclusive where browsers support it.
 * `renderLink` keeps this file free of the locale-aware Link (unit-tested).
 */
export function FooterAccordion({
  id,
  title,
  links,
  renderLink,
  name = "re-footer",
}: {
  id: string;
  title: string;
  links: readonly FooterLink[];
  renderLink: (link: FooterLink, className: string) => ReactNode;
  name?: string;
}) {
  return (
    <details name={name} className="group border-b border-white/12">
      <summary
        id={`${id}-summary`}
        className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 text-[1rem] font-semibold text-white outline-offset-[-2px] [&::-webkit-details-marker]:hidden"
      >
        <span>{title}</span>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="size-5 shrink-0 text-white/55 transition-transform duration-150 ease-re group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <nav aria-labelledby={`${id}-summary`} className="pb-3">
        <ul>
          {links.map((link) => (
            <li key={link.href}>
              {renderLink(
                link,
                `flex min-h-11 items-center text-[0.9375rem] ${link.strong ? "font-semibold text-white" : "text-white/80"} active:text-white`,
              )}
            </li>
          ))}
        </ul>
      </nav>
    </details>
  );
}
