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

/** Needle (throat) plate: plate, three feed-dog slots, corner screws. */
export function NeedlePlateIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="6" width="18" height="12" rx="1" />
      <path d="M7.75 9h1.5v6h-1.5zM11.25 9h1.5v6h-1.5zM14.75 9h1.5v6h-1.5z" />
      <circle cx="5.25" cy="8.25" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="18.75" cy="15.75" r="0.6" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Tension assembly: two discs on a stud, then the coil spring and nut. */
export function SpringIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.5 12h2" />
      <path d="M4.5 7.5v9M6.5 7.5v9" />
      <path d="M6.5 12c.9-3 1.9-3 2.4 0s1.5 3 2.4 0 1.5-3 2.4 0 1.5 3 2.4 0" />
      <path d="M16.5 9.25h3v5.5h-3z" />
      <path d="M19.5 12h2" />
    </Svg>
  );
}

/** Belt drive: motor pulley and machine pulley with the belt between. */
export function BeltIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="7.5" cy="12" r="4.75" />
      <circle cx="7.5" cy="12" r="1.25" />
      <circle cx="18" cy="12" r="2.75" />
      <circle cx="18" cy="12" r="0.6" fill="currentColor" stroke="none" />
      <path d="M7.5 7.25L18 9.25M7.5 16.75L18 14.75" />
    </Svg>
  );
}

/** Spur gear on a keyed shaft. */
export function GearIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M18.02 10.33L20.16 10.76L20.16 13.24L18.02 13.67L17.44 15.08L18.65 16.89L16.89 18.65L15.08 17.44L13.67 18.02L13.24 20.16L10.76 20.16L10.33 18.02L8.92 17.44L7.11 18.65L5.35 16.89L6.56 15.08L5.98 13.67L3.84 13.24L3.84 10.76L5.98 10.33L6.56 8.92L5.35 7.11L7.11 5.35L8.92 6.56L10.33 5.98L10.76 3.84L13.24 3.84L13.67 5.98L15.08 6.56L16.89 5.35L18.65 7.11L17.44 8.92Z" />
      <circle cx="12" cy="12" r="2.25" />
      <path d="M12 9.75v1" />
    </Svg>
  );
}

/** Machine screw: slotted head, threaded shank. Also the generic part mark. */
export function ScrewIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7.5 3h9v3.5h-9z" />
      <path d="M12 3v2" />
      <path d="M10 6.5h4V18l-2 3-2-3z" />
      <path d="M10 9.5l4 1.25M10 12.5l4 1.25M10 15.5l4 1.25" />
    </Svg>
  );
}

/** LED machine light: clamp base, gooseneck, lamp head with its beam. */
export function LedLightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 20.5h7" />
      <path d="M5 20.5v-2h3v2" />
      <path d="M6.5 18.5V13a5 5 0 0 1 5-5h1.5" />
      <path d="M13 5.5h6.5l1.25 4.5H13z" />
      <path d="M14.5 13l-.75 1.75M17 13v2M19.5 13l.75 1.75" />
    </Svg>
  );
}

/** Hemming folder / attachment: funnel that turns the fabric edge, mounting tab. */
export function FolderIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 6.5h7.5l9.5 4v3l-9.5 4H3z" />
      <path d="M10.5 6.5v11" />
      <circle cx="16.75" cy="12" r="1.5" />
      <path d="M5.5 17.5v3h3.5v-3" />
    </Svg>
  );
}

/** Puller: top and bottom rollers gripping the fabric, drive arm, feed arrow. */
export function PullerIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="13" cy="7.75" r="3.25" />
      <circle cx="13" cy="16.25" r="3.25" />
      <path d="M2.5 12h17" />
      <path d="M18.5 10.25L21 12l-2.5 1.75" />
      <path d="M10.2 6.2L4 3.5" />
    </Svg>
  );
}

/** Oiler: oil can with long spout and a drop. */
export function OilerIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 11h10v8.5h-10z" />
      <path d="M6.5 11V8.5h4V11" />
      <path d="M13.5 13.25L20 8.5" />
      <path d="M20.25 13.25c0 .9-.55 1.5-1.15 1.5s-1.15-.6-1.15-1.5.55-1.5 1.15-2.4c.6.9 1.15 1.5 1.15 2.4z" />
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
  needlePlate: NeedlePlateIcon,
  spring: SpringIcon,
  belt: BeltIcon,
  gear: GearIcon,
  screw: ScrewIcon,
  ledLight: LedLightIcon,
  folder: FolderIcon,
  puller: PullerIcon,
  oiler: OilerIcon,
} as const;

export type PartIconKey = keyof typeof PART_ICONS;

/** Icon for any category: its own, or the generic screw mark. */
export const GENERIC_PART_ICON: PartIconKey = "screw";

/**
 * Best-effort icon for a category slug/name ("rotary-hooks", "Servo Motor").
 * Order matters: specific before general ("needle-plates" before "needle",
 * "bobbin" before "hook", part words before device words). Bangla-only
 * names won't match — null, so callers fall back to GENERIC_PART_ICON or text.
 */
export function partIconFor(slugOrName: string): PartIconKey | null {
  const s = slugOrName.toLowerCase();
  if (/needle[-\s]?plate|throat/.test(s)) return "needlePlate";
  if (/needle/.test(s)) return "needle";
  if (/bobbin/.test(s)) return "bobbinCase";
  if (/hook|looper|spreader/.test(s)) return "hook";
  if (/presser|foot|feet/.test(s)) return "presserFoot";
  if (/feed[-\s]?dog/.test(s)) return "feedDog";
  if (/knife|knives|blade|cutter/.test(s)) return "knife";
  if (/belt|pulley/.test(s)) return "belt";
  if (/gear|shaft|crank|bush/.test(s)) return "gear";
  if (/spring|tension/.test(s)) return "spring";
  if (/screw|bolt|(^|[-\s])nuts?([-\s]|$)|small[-\s]?part|(^|[-\s])pins?([-\s]|$)/.test(s)) return "screw";
  if (/motor|servo/.test(s)) return "servoMotor";
  if (/control|pcb|board|electr|panel/.test(s)) return "controlBox";
  if (/trimmer/.test(s)) return "knife";
  if (/(^|[-\s])led([-\s]|$)|light|lamp/.test(s)) return "ledLight";
  if (/attachment|folder|binder|hemmer|gauge/.test(s)) return "folder";
  if (/puller/.test(s)) return "puller";
  if (/oil|lubric/.test(s)) return "oiler";
  if (/feed/.test(s)) return "feedDog";
  return null;
}
