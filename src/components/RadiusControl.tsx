"use client";

import { useRef, useState, type PointerEvent } from "react";
import { RADIUS_OPTIONS, type RadiusMiles } from "@/lib/types";

type Props = { value: RadiusMiles; onChange: (r: RadiusMiles) => void };

const N = RADIUS_OPTIONS.length;
const DRAG_THRESHOLD = 4; // px before a press becomes a drag

/**
 * iOS-style segmented control whose thumb can be dragged: it follows the finger,
 * changes the radius as it crosses each option, and springs into place on release.
 */
export default function RadiusControl({ value, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const press = useRef<{ x: number; dragging: boolean } | null>(null);
  // Thumb position in segments (fractional) while dragging; null when settled.
  const [drag, setDrag] = useState<number | null>(null);
  const [pressed, setPressed] = useState(false);
  const index = RADIUS_OPTIONS.indexOf(value);
  const pos = drag ?? index;

  const segmentAt = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    return Math.min(N - 1, Math.max(0, (clientX - r.left) / (r.width / N) - 0.5));
  };
  const commit = (i: number) => {
    const r = RADIUS_OPTIONS[Math.round(i)];
    if (r !== value) onChange(r);
  };

  const onPointerDown = (e: PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    press.current = { x: e.clientX, dragging: false };
    setPressed(true);
  };
  const onPointerMove = (e: PointerEvent) => {
    const p = press.current;
    if (!p) return;
    if (!p.dragging && Math.abs(e.clientX - p.x) < DRAG_THRESHOLD) return;
    p.dragging = true;
    const at = segmentAt(e.clientX);
    setDrag(at);
    commit(at);
  };
  const onPointerUp = (e: PointerEvent) => {
    const p = press.current;
    press.current = null;
    setPressed(false);
    setDrag(null);
    if (p) commit(p.dragging ? segmentAt(e.clientX) : Math.round(segmentAt(e.clientX)));
  };
  const onPointerCancel = () => {
    press.current = null;
    setPressed(false);
    setDrag(null);
  };

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label="Search radius"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      // Horizontal drags move the thumb; vertical ones still scroll the sheet.
      className="relative grid touch-pan-y select-none grid-cols-3 rounded-full bg-black/[0.06] p-0.5 dark:bg-white/10"
    >
      <div
        aria-hidden="true"
        className="absolute inset-y-0.5 left-0.5 rounded-full bg-white shadow-sm dark:bg-neutral-600"
        style={{
          width: `calc((100% - 4px) / ${N})`,
          transform: `translateX(${pos * 100}%) scale(${pressed ? 1.06 : 1})`,
          transition:
            drag === null
              ? "transform 380ms cubic-bezier(0.3, 1.5, 0.5, 1)"
              : "transform 120ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      />
      {RADIUS_OPTIONS.map((r, i) => (
        <button
          key={r}
          type="button"
          role="radio"
          aria-checked={r === value}
          // Pointer presses are handled by the track; this keeps keyboard selection.
          onClick={(e) => e.detail === 0 && onChange(r)}
          className={`relative z-10 py-1.5 text-[13px] font-medium transition-colors ${
            Math.round(pos) === i ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400"
          }`}
        >
          {r === 0.5 ? "½" : r} mi
        </button>
      ))}
    </div>
  );
}
