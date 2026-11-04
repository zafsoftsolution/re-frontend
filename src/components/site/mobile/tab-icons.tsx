import type { SVGProps } from "react";

/**
 * Bottom-tab icons, drawn in the same parts-book line style as
 * components/icons/parts.tsx (24×24, 1.5px stroke, round joins,
 * currentColor) so the tab bar reads as one family with the catalogue.
 */
type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps & { children: React.ReactNode }) {
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
      {children}
    </svg>
  );
}

/** Home: a trade-house shop front with its rolling shutter. */
export function ShopIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.75 10.25 12 3.5l9.25 6.75" />
      <path d="M4.75 9v11.25h14.5V9" />
      <path d="M8.5 20.25v-7h7v7" />
      <path d="M8.5 15.5h7M8.5 17.75h7" />
    </Svg>
  );
}

/** Parts: a hex nut — hardware, not a machine. */
export function NutIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.75 20 7.375v9.25L12 21.25l-8-4.625v-9.25z" />
      <circle cx="12" cy="12" r="3.5" />
    </Svg>
  );
}

/**
 * Find parts by machine: an industrial lockstitch head in side view — bed,
 * pillar, arm, needle bar with the needle down, hand wheel, thread spool.
 */
export function SewingMachineIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.5 17.75h19v2.75h-19z" />
      <path d="M15.5 17.75V9.75H8.25v2.5H4.5V7a1.75 1.75 0 0 1 1.75-1.75h10A1.75 1.75 0 0 1 18 7v10.75" />
      <path d="M6.375 12.25v3.25" />
      <path d="M5.25 17.75h3" />
      <circle cx="19.75" cy="9" r="1.75" />
      <path d="M10 5.25V3.25M8.75 3.25h2.5" />
    </Svg>
  );
}

/** Quote list: a clipboard with line items. */
export function QuoteIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8.5 4.75H6.75A1.75 1.75 0 0 0 5 6.5v12.75A1.75 1.75 0 0 0 6.75 21h10.5A1.75 1.75 0 0 0 19 19.25V6.5a1.75 1.75 0 0 0-1.75-1.75H15.5" />
      <path d="M8.5 3h7v3.5h-7z" />
      <path d="M8.75 11h.01M11.25 11h4M8.75 14.25h.01M11.25 14.25h4M8.75 17.5h.01M11.25 17.5h2.5" />
    </Svg>
  );
}
