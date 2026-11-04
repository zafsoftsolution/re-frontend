/**
 * Parts vs devices.
 *
 * Rakib Enterprise sells spare parts AND devices for garment machines (never
 * the machines). "Devices" are units that fit on a machine: servo motors,
 * control boxes / PCBs, thread-trimmer units, LED machine lights, attachments
 * & folders, pullers, lubrication & oilers. The site's "Devices" menu lists
 * those categories; "Parts" lists the rest.
 *
 * Rule (documented, tested in tests/unit/devices.test.ts):
 *  1. The admin flag wins. If ANY category carries `isDevice: true`, the
 *     catalogue has been curated: exactly the flagged categories are devices.
 *  2. Otherwise (flag missing or never set — every category defaults to
 *     false) fall back to slug/name patterns below.
 *  3. A part word (blade, knife, cutter, belt, pulley, gear, screw, spring…)
 *     beats a device word, so "knives-trimmer-blades" and "motor-belts" stay
 *     parts while "thread-trimmer-units" and "servo-motors" are devices.
 */

export interface DeviceCandidate {
  slug: string;
  name: string;
  isDevice?: boolean;
}

/** Words that make a category a device (matched on "slug name", lower-case). */
const DEVICE_PATTERNS: RegExp[] = [
  /servo|motor/,
  /control[-\s]?(box|boxes|panel|board|unit)|controller|pcb|circuit|electronic/,
  /(thread|auto)[-\s]?trimm|trimmer[-\s]?(unit|device|assembl|solenoid)/,
  /(^|[-\s])led([-\s]|$)|light|lamp/,
  /attachment|folder|binder|hemmer/,
  /puller/,
  /lubric|oiler|(^|[-\s])oils?([-\s]|$)|oil[-\s]?pump/,
  /device/,
];

/** Spare-part words that override a device match. */
const PART_OVERRIDE = /blade|knife|knives|cutter|belt|pulley|gear|screw|spring|bush|bearing|brush|carbon|seal|wick/;

export function looksLikeDevice({ slug, name }: Pick<DeviceCandidate, "slug" | "name">): boolean {
  const s = `${slug} ${name}`.toLowerCase();
  if (PART_OVERRIDE.test(s)) return false;
  return DEVICE_PATTERNS.some((re) => re.test(s));
}

/** Split categories into parts and devices, keeping the backend's order. */
export function splitPartsAndDevices<T extends DeviceCandidate>(
  categories: T[],
): { parts: T[]; devices: T[]; source: "flag" | "pattern" } {
  const flagged = categories.some((c) => c.isDevice === true);
  const isDevice = flagged ? (c: T) => c.isDevice === true : looksLikeDevice;
  const parts: T[] = [];
  const devices: T[] = [];
  for (const c of categories) (isDevice(c) ? devices : parts).push(c);
  return { parts, devices, source: flagged ? "flag" : "pattern" };
}
