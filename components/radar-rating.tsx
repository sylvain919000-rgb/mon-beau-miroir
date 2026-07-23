"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  ATTRIBUTES,
  ATTRIBUTE_LABELS,
  type AttributeKind,
} from "@/lib/constants";

/** SVG geometry: everything is derived from these three numbers. */
const SIZE = 340;
const CENTER = SIZE / 2;
const MAX_RADIUS = 110;
/** Labels sit just outside the value-10 ring. */
const LABEL_RADIUS = MAX_RADIUS + 20;
/** Dragging closer to the center than this value clears the attribute. */
const CLEAR_BELOW = 1.5;
/** Radii where reference rings are drawn, in score units. */
const GRID_RINGS = [3, 5, 8, 10];

interface RadarRatingProps {
  /** Currently committed scores (the parent owns them). */
  values: Partial<Record<AttributeKind, number>>;
  /**
   * Called when the pointer releases on a value. The PARENT decides
   * whether to apply it or interpose the 9/10 confirmation gate —
   * exactly like the number buttons.
   */
  onSelect: (attribute: AttributeKind, score: number) => void;
  /** Called when a spoke is dragged into the center (unset). */
  onClear: (attribute: AttributeKind) => void;
}

interface DragState {
  attribute: AttributeKind;
  /** null = inside the clear zone. */
  score: number | null;
}

/** Angle of spoke i, starting at 12 o'clock, clockwise. */
function spokeAngle(index: number): number {
  return (index / ATTRIBUTES.length) * Math.PI * 2 - Math.PI / 2;
}

/** SVG coordinates of score `value` on spoke `index`. */
function spokePoint(index: number, value: number): [number, number] {
  const angle = spokeAngle(index);
  const radius = (value / 10) * MAX_RADIUS;
  return [CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle)];
}

/**
 * Snaps a raw 0-10 distance to the offered scale (3-10, no 7):
 * near-center clears, anything low lands on 3, a raw 7 becomes 6 or 8
 * depending on which side of 7 the pointer actually is.
 */
function snapScore(raw: number): number | null {
  if (raw < CLEAR_BELOW) return null;
  const rounded = Math.round(raw);
  if (rounded <= 3) return 3;
  if (rounded >= 10) return 10;
  if (rounded === 7) return raw < 7 ? 6 : 8;
  return rounded;
}

/**
 * The radar-shaped detail rater: every attribute is a spoke; tap or drag
 * along a spoke to score it, drag to the middle to clear it. Commits on
 * pointer release so a drag across the wheel doesn't spray ratings.
 * Purely presentational about state — committed values live in the
 * parent, which also runs the 9/10 gate.
 */
export function RadarRating({ values, onSelect, onClear }: RadarRatingProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  /** Maps a pointer event to the nearest spoke + snapped score. */
  function locate(event: React.PointerEvent<SVGSVGElement>): DragState {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * SIZE - CENTER;
    const y = ((event.clientY - rect.top) / rect.height) * SIZE - CENTER;
    let angle = Math.atan2(y, x) + Math.PI / 2; // 0 at 12 o'clock
    if (angle < 0) angle += Math.PI * 2;
    const step = (Math.PI * 2) / ATTRIBUTES.length;
    const index = Math.round(angle / step) % ATTRIBUTES.length;
    const rawScore = (Math.hypot(x, y) / MAX_RADIUS) * 10;
    return { attribute: ATTRIBUTES[index], score: snapScore(rawScore) };
  }

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag(locate(event));
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (drag) setDrag(locate(event));
  }

  function handlePointerUp() {
    if (!drag) return;
    if (drag.score === null) {
      onClear(drag.attribute);
    } else {
      onSelect(drag.attribute, drag.score);
    }
    setDrag(null);
  }

  // What the wheel shows right now: committed values, with the spoke
  // being dragged previewing live.
  const shown: Partial<Record<AttributeKind, number>> = { ...values };
  if (drag) {
    if (drag.score === null) delete shown[drag.attribute];
    else shown[drag.attribute] = drag.score;
  }

  const polygonPoints = ATTRIBUTES.map((attribute, index) =>
    spokePoint(index, shown[attribute] ?? 0).join(",")
  ).join(" ");
  const hasAnyValue = ATTRIBUTES.some((attribute) => shown[attribute] != null);

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="application"
        aria-label="Radar rating: drag along a spoke to score that detail"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setDrag(null)}
        className="mx-auto block w-full max-w-[340px] cursor-pointer touch-none select-none"
      >
        {/* Clear zone + reference rings */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={(CLEAR_BELOW / 10) * MAX_RADIUS}
          fill="var(--color-surface-2)"
        />
        {GRID_RINGS.map((ringValue) => (
          <circle
            key={ringValue}
            cx={CENTER}
            cy={CENTER}
            r={(ringValue / 10) * MAX_RADIUS}
            fill="none"
            stroke="var(--color-line)"
            strokeWidth={1}
          />
        ))}
        {GRID_RINGS.map((ringValue) => (
          <text
            key={`ring-label-${ringValue}`}
            x={CENTER + 4}
            y={CENTER - (ringValue / 10) * MAX_RADIUS + 3}
            fontSize={8}
            fill="var(--color-ink-faint)"
          >
            {ringValue}
          </text>
        ))}

        {/* Spokes */}
        {ATTRIBUTES.map((attribute, index) => {
          const [x, y] = spokePoint(index, 10);
          return (
            <line
              key={attribute}
              x1={CENTER}
              y1={CENTER}
              x2={x}
              y2={y}
              stroke="var(--color-line)"
              strokeWidth={1}
            />
          );
        })}

        {/* Value polygon + vertices */}
        {hasAnyValue && (
          <polygon
            points={polygonPoints}
            fill="var(--color-amber)"
            fillOpacity={0.22}
            stroke="var(--color-amber-strong)"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        )}
        {ATTRIBUTES.map((attribute, index) => {
          const value = shown[attribute];
          if (value == null) return null;
          const [x, y] = spokePoint(index, value);
          return (
            <circle
              key={`dot-${attribute}`}
              cx={x}
              cy={y}
              r={4}
              fill="var(--color-amber-strong)"
              stroke="var(--color-bg)"
              strokeWidth={1.5}
            />
          );
        })}

        {/* Attribute labels */}
        {ATTRIBUTES.map((attribute, index) => {
          const angle = spokeAngle(index);
          const x = CENTER + LABEL_RADIUS * Math.cos(angle);
          const y = CENTER + LABEL_RADIUS * Math.sin(angle);
          const cosine = Math.cos(angle);
          const anchor = cosine > 0.35 ? "start" : cosine < -0.35 ? "end" : "middle";
          const active = drag?.attribute === attribute;
          return (
            <text
              key={`label-${attribute}`}
              x={x}
              y={y + 3}
              fontSize={10}
              fontWeight={active ? 700 : 600}
              textAnchor={anchor}
              fill={active ? "var(--color-amber-strong)" : "var(--color-ink-soft)"}
            >
              {ATTRIBUTE_LABELS[attribute]}
            </text>
          );
        })}

        {/* Live readout while dragging */}
        {drag && (
          <text
            x={CENTER}
            y={CENTER + 5}
            textAnchor="middle"
            fontSize={16}
            fontWeight={700}
            fill="var(--color-terracotta)"
            fontFamily="var(--font-display)"
          >
            {drag.score ?? "–"}
          </text>
        )}
      </svg>

      <p className="mt-1 text-center text-xs text-ink-faint">
        Tap or drag along a spoke to score it · drag to the middle to clear
      </p>

      {/* Committed values, spelled out */}
      <ul className="mt-3 flex flex-wrap justify-center gap-1.5">
        {ATTRIBUTES.filter((attribute) => values[attribute] != null).map((attribute) => (
          <li
            key={attribute}
            className={cn(
              "rounded-pill border border-line bg-surface px-2.5 py-1",
              "text-xs font-semibold text-ink"
            )}
          >
            {ATTRIBUTE_LABELS[attribute]}{" "}
            <span className="text-terracotta">{values[attribute]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
