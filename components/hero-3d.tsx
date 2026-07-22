"use client";

import { useRef, useState } from "react";
import { PhotoFallback } from "@/components/fallbacks/photo-fallback";

/** Max card tilt in degrees at the hero's edges (a behavior constant, not a style token). */
const MAX_TILT_DEG = 9;

interface Tilt {
  x: number;
  y: number;
}

/**
 * Floating "rating chips" orbiting the mirror card. Each sits at its own
 * translateZ depth, so tilting the card makes them parallax — that depth
 * difference is what sells the 3D effect. Bob delays are staggered so
 * they never move in lockstep. (Note: no score is ever a 7 around here.)
 */
const CHIPS = [
  { label: "Overall", value: "10", position: "-left-5 top-6", depth: "70px", delayMs: 0 },
  { label: "Smile", value: "9.8", position: "-right-7 top-24", depth: "52px", delayMs: 900 },
  { label: "Eyes", value: "9.6", position: "-left-8 bottom-24", depth: "60px", delayMs: 1500 },
  { label: "ratings", value: "1,204", position: "-right-5 bottom-8", depth: "44px", delayMs: 400 },
] as const;

/**
 * The landing hero: a mirror card floating in 3D space that tilts toward
 * the visitor's pointer, with parallaxing score chips and a breathing
 * glow. Pure CSS 3D + one pointer handler — no 3D library, so the
 * landing page stays featherweight. Honors prefers-reduced-motion:
 * keyframes are neutralized globally in globals.css, and the pointer
 * tilt checks the same preference before moving anything.
 */
export function Hero3D() {
  const frameRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<Tilt>({ x: 0, y: 0 });

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    // Pointer position as -0.5..0.5 from the center, mapped to degrees.
    const relativeX = (event.clientX - rect.left) / rect.width - 0.5;
    const relativeY = (event.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      x: -relativeY * MAX_TILT_DEG * 2, // pointer above center tips the card back
      y: relativeX * MAX_TILT_DEG * 2, // pointer right of center turns it right
    });
  }

  function handlePointerLeave() {
    setTilt({ x: 0, y: 0 });
  }

  return (
    <div
      className="relative isolate"
      style={{ perspective: "var(--mbm-hero-perspective)" }}
      aria-hidden
    >
      {/* Breathing glow behind everything */}
      <div
        className="absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(closest-side,var(--color-rose),transparent_72%)] blur-2xl"
        style={{ animation: "mbm-hero-glow 7s ease-in-out infinite" }}
      />

      {/* Pointer-tilted stage */}
      <div
        ref={frameRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="[transform-style:preserve-3d] transition-transform duration-[var(--mbm-dur-base)] ease-mbm"
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        {/* Idle float wrapper (separate element so the bob never fights the tilt) */}
        <div
          className="[transform-style:preserve-3d]"
          style={{ animation: "mbm-hero-float 6s ease-in-out infinite" }}
        >
          {/* The mirror card: gradient rim around a glass panel */}
          <div className="w-56 rounded-lg bg-gradient-to-br from-rose via-peach to-amber p-[2px] shadow-card sm:w-64">
            <div className="rounded-lg bg-surface p-3">
              <PhotoFallback />
              <div className="mt-3 flex items-center justify-between px-1 pb-1">
                <div>
                  <p className="text-xs font-semibold text-ink">@you</p>
                  <p className="text-xs text-ink-faint">your mirror</p>
                </div>
                <span className="font-display text-score leading-none text-terracotta">10</span>
              </div>
            </div>
          </div>

          {/* Parallax chips */}
          {CHIPS.map((chip) => (
            <div
              key={chip.label}
              className={`absolute ${chip.position} flex items-baseline gap-1.5 rounded-pill border border-line bg-bg/90 px-3 py-1.5 shadow-soft backdrop-blur`}
              style={
                {
                  "--chip-depth": chip.depth,
                  transform: `translateZ(${chip.depth})`,
                  animation: `mbm-chip-float 5s ease-in-out ${chip.delayMs}ms infinite`,
                } as React.CSSProperties
              }
            >
              <span className="font-display text-sm leading-none text-terracotta">
                {chip.value}
              </span>
              <span className="text-xs font-semibold text-ink-soft">{chip.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
