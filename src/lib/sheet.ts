export type Detent = "peek" | "half" | "full";
export const DETENTS: Detent[] = ["peek", "half", "full"];

// How far ahead (ms) a release's velocity carries the sheet before snapping.
const FLICK_MS = 150;

/**
 * Pick the height a bottom sheet should settle at after a drag. `visible` is the
 * sheet's visible height in px; `velocity` is px/ms, positive when moving up.
 */
export function snapDetent(visible: number, velocity: number, heights: Record<Detent, number>): Detent {
  const projected = visible + velocity * FLICK_MS;
  return DETENTS.reduce((best, d) =>
    Math.abs(heights[d] - projected) < Math.abs(heights[best] - projected) ? d : best,
  );
}
