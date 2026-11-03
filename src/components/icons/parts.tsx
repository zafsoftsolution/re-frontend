import type { SVGProps } from "react";

/**
 * Technical line icons for part categories — 24×24 grid, 1.5px stroke,
 * round joins, currentColor. Drawn as simplified parts-book silhouettes so
 * they read at 20–48px. Use lucide for UI chrome; use these for parts.
 */
type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function Svg({ title, children, ...props }: IconProps & { children: React.ReactNode }) {
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
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      {...props}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

/** Industrial needle: shank with flat, taper, blade, eye, point. */
export function NeedleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10.5 2.5h3V8h-3z" />
      <path d="M12 3.8v2.9" />
      <path d="M10.5 8l.75 2.25V18.5L12 21.5l.75-3V10.25L13.5 8" />
      <path d="M12 15.4v1.8" />
    </Svg>
  );
}

/** Rotary hook: race ring with the pointed gib, bobbin-case seat, centre. */
export function HookIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M18.6 8.4A7.5 7.5 0 1 1 12 4.5" />
      <path d="M12 4.5l8.8-1.3-2.2 5.2" />
      <circle cx="12" cy="12" r="3.25" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Bobbin case: round body, latch lever, centre post, tension screw. */
export function BobbinCaseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10.5" cy="13.5" r="6.75" />
      <circle cx="10.5" cy="13.5" r="2" />
      <path d="M14.4 8l4.6-4.3 1.6 1.7-4.5 4.4" />
      <path d="M17.25 13.5H20" />
      <path d="M20 12.3v2.4" />
    </Svg>
  );
}

/** Presser foot (side view): shank with screw, neck, sole with upturned toe. */
export function PresserFootIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.5 2.5h4V10h-4z" />
      <circle cx="11.5" cy="5.25" r="1" />
      <path d="M10 10l-2 5.5M13 10l2 5.5" />
      <path d="M3.5 15.5h12c2.5 0 4.3 1.1 5 3H3.5z" />
      <path d="M8 18.5v2" />
    </Svg>
  );
}

/** Feed dog (side view): serrated teeth on the bar, mounting tab with hole. */
export function FeedDogIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 16v-3l2-2.5.5 2.5L8 10.5l.5 2.5 2.5-2.5.5 2.5 2.5-2.5.5 2.5 2.5-2.5.5 2.5 2.5-2.5L21 13v3z" />
      <path d="M9 16v3.5h6V16" />
      <circle cx="12" cy="17.9" r="0.75" />
    </Svg>
  );
}

/** Servo motor: finned body, flange, shaft with key, mounting foot. */
export function ServoMotorIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2.75" y="6.75" width="13" height="10" rx="1.25" />
      <path d="M6 6.75v10M9 6.75v10M12 6.75v10" />
      <path d="M15.75 8.5h1.75v6.5h-1.75" />
      <path d="M17.5 11h3.75v1.5H17.5" />
      <path d="M5 16.75v2.5h8.5v-2.5" />
    </Svg>
  );
}

/** Control box / PCB: housing, segment display, two keys, cable glands. */
export function ControlBoxIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4.75" width="18" height="13.5" rx="1" />
      <rect x="5.75" y="7.5" width="7.5" height="4.5" />
      <path d="M8 9v1.5M10.75 9v1.5" />
      <circle cx="16" cy="9.75" r="1" />
      <circle cx="18.5" cy="9.75" r="1" />
      <path d="M5.75 15h12.5" />
      <path d="M9 18.25V21M15 18.25V21" />
    </Svg>
  );
}

/** Machine knife (overlock / trimmer): bar blade, bevelled edge, screw holes. */
export function KnifeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 8.75h13.75L21 15.25H3.5z" />
      <path d="M14.75 8.75l3.75 6.5" />
      <circle cx="7" cy="12" r="1.1" />
      <circle cx="11" cy="12" r="1.1" />
    </Svg>
  );
}

export const PART_ICONS = {
  needle: NeedleIcon,
  hook: HookIcon,
  bobbinCase: BobbinCaseIcon,
  presserFoot: PresserFootIcon,
  feedDog: FeedDogIcon,
  servoMotor: ServoMotorIcon,
  controlBox: ControlBoxIcon,
  knife: KnifeIcon,
} as const;

export type PartIconKey = keyof typeof PART_ICONS;

/**
 * Best-effort icon for a category slug/name ("rotary-hooks", "Servo Motor",
 * "সার্ভো মোটর" won't match — falls back to null so callers show text only).
 */
export function partIconFor(slugOrName: string): PartIconKey | null {
  const s = slugOrName.toLowerCase();
  if (/needle/.test(s)) return "needle";
  if (/bobbin/.test(s)) return "bobbinCase";
  if (/hook|looper/.test(s)) return "hook";
  if (/presser|foot|feet/.test(s)) return "presserFoot";
  if (/feed|dog/.test(s)) return "feedDog";
  if (/motor|servo/.test(s)) return "servoMotor";
  if (/control|pcb|board|box|electr/.test(s)) return "controlBox";
  if (/knife|knives|blade|trimmer|cutter/.test(s)) return "knife";
  return null;
}
