"use client";

import { useMemo, useState } from "react";

interface Point {
  date: string;
  sales: number;
  orders: number;
}

interface Props {
  data: Point[];
  height?: number;
  currency?: string;
}

export default function SalesChart({ data, height = 220, currency = "BDT" }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const { path, area, points, max, min, ticks } = useMemo(() => {
    const w = 1000; // viewBox width
    const h = height;
    const pad = 28;

    const sales = data.map((d) => d.sales);
    const max = Math.max(...sales);
    const min = Math.min(...sales);
    const range = max - min || 1;
    const stepX = (w - pad * 2) / Math.max(1, data.length - 1);

    const points = data.map((d, i) => {
      const x = pad + i * stepX;
      const y = pad + (h - pad * 2) - ((d.sales - min) / range) * (h - pad * 2);
      return { x, y, ...d };
    });

    const path = points
      .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
      .join(" ");
    const area =
      `${path} L${points[points.length - 1].x},${h - pad} ` +
      `L${points[0].x},${h - pad} Z`;

    // Y-axis tick values (4 lines including min/max)
    const ticks = [0, 0.33, 0.66, 1].map((t) => Math.round(min + range * t));

    return { path, area, points, max, min, ticks };
  }, [data, height]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 1000 ${height}`}
        className="w-full"
        preserveAspectRatio="none"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="sales-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--jmn-gold)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--jmn-gold)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y grid */}
        {ticks.map((t, i) => {
          const y = 28 + (height - 56) - ((t - min) / (max - min || 1)) * (height - 56);
          return (
            <g key={i}>
              <line
                x1={28}
                x2={1000 - 28}
                y1={y}
                y2={y}
                stroke="var(--jmn-line)"
                strokeWidth={1}
              />
              <text
                x={20}
                y={y + 3}
                textAnchor="end"
                className="fill-ink/40"
                fontSize={10}
              >
                {fmt(t).replace(/\.\d+/, "")}
              </text>
            </g>
          );
        })}

        {/* Area + line */}
        <path d={area} fill="url(#sales-area)" />
        <path
          d={path}
          fill="none"
          stroke="var(--jmn-gold)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Hover capture rects (per data point) */}
        {points.map((p, i) => {
          const w = 1000 / points.length;
          return (
            <rect
              key={i}
              x={p.x - w / 2}
              y={0}
              width={w}
              height={height}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          );
        })}

        {/* Hover indicator */}
        {hover !== null && (
          <g>
            <line
              x1={points[hover].x}
              x2={points[hover].x}
              y1={28}
              y2={height - 28}
              stroke="var(--jmn-navy)"
              strokeOpacity={0.25}
              strokeDasharray="3 3"
            />
            <circle
              cx={points[hover].x}
              cy={points[hover].y}
              r={5}
              fill="white"
              stroke="var(--jmn-gold)"
              strokeWidth={2}
            />
          </g>
        )}
      </svg>

      {/* Tooltip */}
      {hover !== null && (
        <div
          className="absolute -top-1 pointer-events-none bg-navy text-cream rounded px-3 py-2 shadow-lg text-xs whitespace-nowrap"
          style={{
            left: `${(points[hover].x / 1000) * 100}%`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="text-cream/70 text-[10px] tracking-[0.2em] uppercase">
            {new Date(points[hover].date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </div>
          <div className="font-medium tabular">{fmt(points[hover].sales)}</div>
          <div className="text-cream/70 text-[10px] tabular">
            {points[hover].orders} orders
          </div>
        </div>
      )}
    </div>
  );
}
