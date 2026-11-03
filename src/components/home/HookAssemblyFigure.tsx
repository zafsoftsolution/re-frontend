/**
 * Exploded parts-book drawing of a lockstitch machine's hook / bobbin
 * assembly, as clean technical line art (viewBox 600 × 600).
 *
 * Every part is drawn at its EXPLODED position — that is the static,
 * reduced-motion and no-JS picture. Each part is its own `<g data-part>`
 * (and `<g data-callout>` for its numbered bubble); the scroll island
 * (scroll/motion/ExplodedMotion.tsx) moves them by ASSEMBLY below to show the
 * assembled machine first, then takes it apart along its real axes:
 *  - hook, bobbin case and bobbin along the hook-shaft axis (oblique, ↙),
 *  - feed dog down-and-out from under the needle plate,
 *  - presser foot up-and-off the presser bar, needle straight up.
 */

export const FIGURE_PARTS = ["hook", "bobbinCase", "bobbin", "feedDog", "presserFoot", "needle"] as const;
export type FigurePart = (typeof FIGURE_PARTS)[number];

/** Offset (viewBox units) from each part's exploded position to where it sits in the machine. */
export const ASSEMBLY: Record<FigurePart, { x: number; y: number }> = {
  hook: { x: -45, y: 20 },
  bobbinCase: { x: 127, y: -57 },
  bobbin: { x: 227, y: -102 },
  feedDog: { x: -200, y: -30 },
  presserFoot: { x: -170, y: 40 },
  needle: { x: 0, y: 120 },
};

/** Callout bubble centre + leader anchor on the part (exploded coordinates). */
const CALLOUTS: Record<FigurePart, { bubble: [number, number]; anchor: [number, number] }> = {
  hook: { bubble: [446, 474], anchor: [389, 408] },
  bobbinCase: { bubble: [96, 344], anchor: [143, 401] },
  bobbin: { bubble: [40, 566], anchor: [63, 516] },
  feedDog: { bubble: [566, 392], anchor: [536, 332] },
  presserFoot: { bubble: [566, 108], anchor: [506, 150] },
  needle: { bubble: [236, 46], anchor: [293, 46] },
};

const ink = "fill-re-paper stroke-re-ink";
const depth = "fill-re-steel-50 stroke-re-ink";
const fine = "fill-none stroke-re-steel-400";

export function HookAssemblyFigure({ label, active = "hook" }: { label: string; active?: FigurePart }) {
  return (
    <svg
      viewBox="0 0 600 600"
      role="img"
      aria-label={label}
      className="block h-auto w-full overflow-visible [&_*]:[vector-effect:non-scaling-stroke]"
      strokeWidth={1.35}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <defs>
        <pattern id="re-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" className="stroke-re-steel-400" strokeWidth={1} />
        </pattern>
      </defs>

      {/* Centre lines: needle axis and hook-shaft axis (dash-dot). */}
      <g data-fig="axes" className={fine} strokeWidth={1} strokeDasharray="16 5 2 5">
        <line x1="300" y1="10" x2="300" y2="336" />
        <line x1="420" y1="326" x2="28" y2="503" />
      </g>

      {/* Needle plate — sectioned, fixed reference. */}
      <g data-fig="plate">
        <rect x="40" y="250" width="520" height="12" fill="url(#re-hatch)" className="stroke-re-ink" />
        <line x1="40" y1="250" x2="560" y2="250" className="stroke-re-ink" strokeWidth={1.8} />
      </g>

      {/* Feed dog — origin = top-left of the body. */}
      <g data-part="feedDog">
        <g transform="translate(450 292)">
          <path
            className={ink}
            d="M8 0 L11 -16 L14 0 L17 -16 L20 0 L23 -16 L26 0 L29 -16 L32 0 L35 -16 L38 0 L41 -16 L44 0 L47 -16 L50 0 L53 -16 L56 0 L59 -16 L62 0 L65 -16 L68 0 L71 -16 L74 0 L77 -16 L80 0 L83 -16 L86 0 L89 -16 L92 0 Z"
          />
          <path className={ink} d="M64 20 V44 H88 V20" />
          <rect className={ink} x="0" y="0" width="100" height="20" rx="1" />
          <line className={fine} x1="5" y1="6" x2="95" y2="6" />
          <circle className={depth} cx="12" cy="12" r="3.2" />
          <circle className={depth} cx="88" cy="12" r="3.2" />
          <circle className={depth} cx="76" cy="34" r="4" />
        </g>
      </g>

      {/* Rotary hook — origin = centre of the front face. */}
      <g data-part="hook">
        <g transform="translate(345 360)">
          {/* drive-shaft stub, behind the body */}
          <path className={depth} d="M19.3 5.8 L83.3 -23.2 L72.7 -46.8 L8.7 -17.8 Z" />
          <ellipse className={ink} cx="78" cy="-35" rx="11" ry="13" />
          <circle className="fill-re-ink" cx="78" cy="-35" r="2.2" stroke="none" />
          {/* body depth */}
          <ellipse className={depth} cx="14" cy="-6" rx="62" ry="74" />
          <line className="stroke-re-ink" x1="0" y1="-74" x2="14" y2="-80" />
          <line className="stroke-re-ink" x1="0" y1="74" x2="14" y2="68" />
          {/* front face, race and bobbin-case seat */}
          <ellipse className={ink} cx="0" cy="0" rx="62" ry="74" />
          <ellipse className="fill-none stroke-re-ink" cx="0" cy="0" rx="51" ry="61" />
          <ellipse className={depth} cx="2" cy="-1" rx="44" ry="53" />
          <rect className={ink} x="-5" y="-63" width="10" height="10" />
          {/* gib + hook point (tip sits beside the needle when assembled) */}
          <path className={ink} d="M37 -59 C25 -73 9 -80 -8 -82 L-1 -76 C12 -75 23 -70 31 -63 Z" />
          {/* set screws */}
          <circle className={depth} cx="56" cy="24" r="3.6" />
          <circle className={depth} cx="44" cy="46" r="3.6" />
        </g>
      </g>

      {/* Bobbin — origin = centre of the front flange. */}
      <g data-part="bobbin">
        <g transform="translate(73 482)">
          <ellipse className={depth} cx="9" cy="-4" rx="30" ry="36" />
          <line className="stroke-re-ink" x1="0" y1="-36" x2="9" y2="-40" />
          <line className="stroke-re-ink" x1="0" y1="36" x2="9" y2="32" />
          <ellipse className={ink} cx="0" cy="0" rx="30" ry="36" />
          <ellipse className="fill-none stroke-re-ink" cx="0" cy="0" rx="9" ry="11" />
          <ellipse className="fill-re-ink" cx="0" cy="0" rx="3.4" ry="4.4" stroke="none" />
          <ellipse className={depth} cx="0" cy="-22" rx="4" ry="5" />
          <ellipse className={depth} cx="17" cy="12" rx="4" ry="5" />
          <ellipse className={depth} cx="-17" cy="12" rx="4" ry="5" />
        </g>
      </g>

      {/* Bobbin case — origin = centre of the face. */}
      <g data-part="bobbinCase">
        <g transform="translate(173 437)">
          <ellipse className={depth} cx="10" cy="-4" rx="42" ry="50" />
          <line className="stroke-re-ink" x1="0" y1="-50" x2="10" y2="-54" />
          <line className="stroke-re-ink" x1="0" y1="50" x2="10" y2="46" />
          <rect className={ink} x="-5" y="-62" width="10" height="13" />
          <ellipse className={ink} cx="0" cy="0" rx="42" ry="50" />
          <ellipse className={fine} cx="0" cy="0" rx="27" ry="32" />
          {/* tension spring + screw */}
          <path className="fill-none stroke-re-ink" d="M18 -40 C37 -28 40 10 25 39" />
          <path className="fill-none stroke-re-ink" d="M23 -41 C43 -27 46 12 30 40" />
          <circle className={ink} cx="34" cy="2" r="4.2" />
          <line className="stroke-re-ink" x1="31" y1="0" x2="37" y2="4" />
          {/* thread slot */}
          <line className="stroke-re-ink" x1="-37" y1="25" x2="-25" y2="18" />
          {/* latch lever on its pivot */}
          <path className={ink} d="M-3 -6 L-50 -19 C-57 -18 -57 -9 -52 -7 L-3 6 Z" />
          <circle className={depth} cx="-2" cy="0" r="7" />
          <circle className="fill-re-ink" cx="-2" cy="0" r="2" stroke="none" />
        </g>
      </g>

      {/* Presser foot — origin = sole bottom, left of the toe. */}
      <g data-part="presserFoot">
        <g transform="translate(420 210)">
          <rect className={ink} x="62" y="-72" width="24" height="64" />
          <circle className={depth} cx="74" cy="-52" r="6" />
          <line className="stroke-re-ink" x1="69" y1="-55" x2="79" y2="-49" />
          <path className={ink} d="M0 -16 C0 -6 6 0 18 0 L112 0 L112 -9 L26 -9 C18 -9 13 -12 12 -18 Z" />
          <circle className={depth} cx="74" cy="-17" r="3" />
          <rect className="fill-re-steel-50 stroke-re-steel-400" x="46" y="-8" width="8" height="7" />
        </g>
      </g>

      {/* Needle — origin = point. */}
      <g data-part="needle">
        <g transform="translate(300 180)">
          <rect className={ink} x="-7" y="-150" width="14" height="38" />
          <line className={fine} x1="3" y1="-149" x2="3" y2="-113" />
          <path className={ink} d="M-7 -112 L-3.5 -100 L3.5 -100 L7 -112 Z" />
          <path className={ink} d="M-3.5 -100 L-3.5 -18 L0 0 L3.5 -18 L3.5 -100 Z" />
          <line className={fine} x1="-1" y1="-97" x2="-1" y2="-28" />
          <ellipse className="fill-re-ink" cx="0" cy="-24" rx="1.3" ry="3.8" stroke="none" />
          <path className="fill-none stroke-re-ink" d="M3.5 -36 Q1.6 -31.5 3.5 -27" />
        </g>
      </g>

      {/* Numbered callouts (on top, moving with their parts). */}
      {FIGURE_PARTS.map((key, i) => {
        const { bubble, anchor } = CALLOUTS[key];
        return (
          <g key={key} data-callout={key} data-active={key === active ? "true" : undefined} className="group/c">
            <line
              x1={anchor[0]}
              y1={anchor[1]}
              x2={bubble[0]}
              y2={bubble[1]}
              strokeWidth={1}
              className="stroke-re-ink transition-[stroke] duration-150 group-data-[active=true]/c:stroke-re-red"
            />
            <circle
              cx={anchor[0]}
              cy={anchor[1]}
              r="2.6"
              stroke="none"
              className="fill-re-ink transition-[fill] duration-150 group-data-[active=true]/c:fill-re-red"
            />
            <circle
              cx={bubble[0]}
              cy={bubble[1]}
              r="15"
              className="fill-re-paper stroke-re-ink transition-[fill,stroke] duration-150 group-data-[active=true]/c:fill-re-red group-data-[active=true]/c:stroke-re-red"
            />
            <text
              x={bubble[0]}
              y={bubble[1]}
              textAnchor="middle"
              dominantBaseline="central"
              stroke="none"
              className="fill-re-ink font-re-mono text-[15px] font-semibold transition-[fill] duration-150 group-data-[active=true]/c:fill-white"
            >
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
