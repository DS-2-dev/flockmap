export const COLLAGE_SHOTS = 27;
export const collageSrc = (shot: number) => `/collage/${String(shot + 1).padStart(2, "0")}.webp`;

/** Pick one tile to change and a shot that isn't currently on screen. */
export function nextSwap(
  showing: number[],
  totalShots: number,
  rand: () => number = Math.random,
): { tile: number; shot: number } | null {
  const hidden = Array.from({ length: totalShots }, (_, i) => i).filter((s) => !showing.includes(s));
  if (hidden.length === 0) return null;
  const tile = Math.floor(rand() * showing.length);
  const shot = hidden[Math.floor(rand() * hidden.length)];
  return { tile, shot };
}
