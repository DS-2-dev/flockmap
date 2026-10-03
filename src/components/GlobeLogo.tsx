"use client";

import { useEffect, useRef } from "react";
import { globeLines } from "@/lib/globe";

type Props = {
  className?: string;
  /** Turn continuously (skipped for visitors who prefer reduced motion). */
  spinning?: boolean;
  /** Fill behind the star glint; should match the background the logo sits on. */
  background?: string;
};

const PERIOD_MS = 14_000;
const REST_SPIN = 0.35;
const STROKE = 0.055;

// Four-point star from the logo artwork, kept still as a glint on the front of the globe.
const STAR = "M-0.44 -0.66 Q-0.47 -0.3 -0.9 -0.3 Q-0.47 -0.3 -0.64 0.09 Q-0.47 -0.3 -0.1 -0.28 Q-0.47 -0.3 -0.44 -0.66 Z";

// SVG version of the globe logo whose grid rotates like a real globe.
export default function GlobeLogo({ className, spinning = false, background = "#fafafa" }: Props) {
  const frontRefs = useRef<(SVGPathElement | null)[]>([]);
  const backRefs = useRef<(SVGPathElement | null)[]>([]);
  const initial = globeLines(REST_SPIN);

  useEffect(() => {
    if (!spinning || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const start = performance.now();
    const draw = (now: number) => {
      const spin = REST_SPIN + (((now - start) % PERIOD_MS) / PERIOD_MS) * 2 * Math.PI;
      globeLines(spin).forEach(({ front, back }, i) => {
        frontRefs.current[i]?.setAttribute("d", front);
        backRefs.current[i]?.setAttribute("d", back);
      });
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [spinning]);

  return (
    <svg
      viewBox="-1.1 -1.1 2.2 2.2"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g opacity={0.14}>
        {initial.map(({ back }, i) => (
          <path key={i} ref={(el) => void (backRefs.current[i] = el)} d={back} />
        ))}
      </g>
      {initial.map(({ front }, i) => (
        <path key={i} ref={(el) => void (frontRefs.current[i] = el)} d={front} />
      ))}
      <path d={STAR} fill={background} />
      <circle r={1} />
    </svg>
  );
}
