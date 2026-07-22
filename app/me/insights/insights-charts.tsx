"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/cn";
import { ATTRIBUTE_LABELS } from "@/lib/constants";
import type { AttributeKind } from "@/lib/constants";

export interface DistributionPoint {
  score: number;
  count: number;
}
export interface TrendPoint {
  day: string; // MM-DD
  count: number;
}
export interface AttributePoint {
  attribute: AttributeKind;
  avgScore: number | null; // null = no ratings yet (empty spoke)
  ratingCount: number;
}

/**
 * Every color and font below is a CSS variable reference — SVG accepts
 * var(--...) directly in modern browsers, so the token rule holds inside
 * the charts too.
 */
const TOKENS = {
  amber: "var(--color-amber)",
  terracotta: "var(--color-terracotta)",
  peach: "var(--color-peach)",
  line: "var(--color-line)",
  inkFaint: "var(--color-ink-faint)",
  fontSans: "var(--font-sans)",
} as const;

const AXIS_TICK = { fill: TOKENS.inkFaint, fontSize: 11, fontFamily: TOKENS.fontSans };
const FEW_RATINGS_THRESHOLD = 3;

interface InsightsChartsProps {
  average: number;
  ratingCount: number;
  distribution: DistributionPoint[];
  trend: TrendPoint[];
  attributes: AttributePoint[];
}

export function InsightsCharts({
  average,
  ratingCount,
  distribution,
  trend,
  attributes,
}: InsightsChartsProps) {
  const [attributeView, setAttributeView] = useState<"radar" | "bars">("radar");

  // Radar needs a number for every spoke; unrated attributes plot at 0
  // and are labeled as empty in the bar view.
  const radarData = attributes.map((entry) => ({
    label: ATTRIBUTE_LABELS[entry.attribute],
    value: entry.avgScore ?? 0,
  }));
  const sortedBars = [...attributes].sort(
    (a, b) => (b.avgScore ?? -1) - (a.avgScore ?? -1)
  );

  return (
    <>
      {/* ---- Headline: average + sparkline ---- */}
      <section className="rounded-lg border border-line bg-surface p-4">
        <div className="flex items-end justify-between">
          <div>
            <span className="font-display text-score leading-none text-terracotta">
              {average}
            </span>
            <p className="mt-1 text-xs text-ink-soft">
              average · {ratingCount} {ratingCount === 1 ? "rating" : "ratings"}
            </p>
          </div>
          <div className="h-14 w-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={TOKENS.terracotta}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <p className="mt-1 text-right text-xs text-ink-faint">ratings · last 30 days</p>
      </section>

      {/* ---- Score distribution 1-10 ---- */}
      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="text-sm font-bold text-ink">Score distribution</h2>
        <div className="mt-2 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distribution} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
              <XAxis dataKey="score" tick={AXIS_TICK} stroke={TOKENS.line} />
              <YAxis allowDecimals={false} tick={AXIS_TICK} stroke={TOKENS.line} />
              <Tooltip
                cursor={{ fill: TOKENS.line }}
                contentStyle={{ fontFamily: TOKENS.fontSans, fontSize: 12 }}
              />
              <Bar dataKey="count" fill={TOKENS.amber} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ---- Attribute breakdown: radar <-> sorted bars ---- */}
      <section className="rounded-lg border border-line bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Attribute breakdown</h2>
          <div className="flex rounded-pill border border-line p-0.5" role="tablist">
            {(["radar", "bars"] as const).map((view) => (
              <button
                key={view}
                type="button"
                role="tab"
                aria-selected={attributeView === view}
                onClick={() => setAttributeView(view)}
                className={cn(
                  "rounded-pill px-3 py-1 text-xs font-semibold capitalize",
                  "transition-colors duration-[var(--mbm-dur-fast)] ease-mbm",
                  attributeView === view ? "bg-amber text-bg" : "text-ink-soft hover:text-ink"
                )}
              >
                {view}
              </button>
            ))}
          </div>
        </div>

        {attributeView === "radar" ? (
          <div className="mt-2 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke={TOKENS.line} />
                <PolarAngleAxis dataKey="label" tick={AXIS_TICK} />
                <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                <Radar
                  dataKey="value"
                  stroke={TOKENS.terracotta}
                  fill={TOKENS.peach}
                  fillOpacity={0.5}
                  isAnimationActive={false}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-2.5">
            {sortedBars.map((entry) => (
              <li key={entry.attribute} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  {ATTRIBUTE_LABELS[entry.attribute]}
                </span>
                {entry.avgScore === null ? (
                  <span className="text-xs text-ink-faint">no ratings yet</span>
                ) : (
                  <>
                    <span
                      className="h-2 rounded-pill bg-gradient-to-r from-peach to-amber"
                      style={{ width: `${entry.avgScore * 10}%` }}
                      aria-hidden
                    />
                    <span className="text-sm font-semibold text-ink">{entry.avgScore}</span>
                    <span className="text-xs text-ink-faint">
                      ({entry.ratingCount}
                      {entry.ratingCount < FEW_RATINGS_THRESHOLD && " · few ratings yet"})
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
