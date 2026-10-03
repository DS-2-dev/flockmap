export const COLLAGE_SHOTS = 27;
export const collageSrc = (shot: number) => `/collage/${String(shot + 1).padStart(2, "0")}.webp`;

/** `queue` holds hidden shots, longest-hidden first. */
export type CollageState = { showing: number[]; queue: number[]; lastTile: number | null };

export function initialCollage(tiles: number, totalShots: number): CollageState {
  const shots = Array.from({ length: totalShots }, (_, i) => i);
  return { showing: shots.slice(0, tiles), queue: shots.slice(tiles), lastTile: null };
}

/**
 * Replace one tile with the longest-hidden shot; the replaced shot goes to the
 * back of the queue, so it only returns after every other shot has had a turn.
 * The same tile never changes twice in a row.
 */
export function swapTile(state: CollageState, rand: () => number = Math.random): CollageState {
  const { showing, queue, lastTile } = state;
  if (queue.length === 0) return state;
  let tile: number;
  if (lastTile === null || showing.length < 2) {
    tile = Math.floor(rand() * showing.length);
  } else {
    tile = Math.floor(rand() * (showing.length - 1));
    if (tile >= lastTile) tile++;
  }
  const [incoming, ...rest] = queue;
  const next = [...showing];
  const outgoing = next[tile];
  next[tile] = incoming;
  return { showing: next, queue: [...rest, outgoing], lastTile: tile };
}
