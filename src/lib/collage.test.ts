import { describe, expect, it } from "vitest";
import { initialCollage, swapTile } from "./collage";

// Rand stub returning the given values in order.
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe("collage rotation", () => {
  it("starts with the first shots showing and the rest queued", () => {
    expect(initialCollage(3, 5)).toEqual({ showing: [0, 1, 2], queue: [3, 4], lastTile: null });
  });

  it("swaps in the shot that has been hidden longest and queues the one it replaces", () => {
    const next = swapTile(initialCollage(3, 5), seq(0.5));
    expect(next).toEqual({ showing: [0, 3, 2], queue: [4, 1], lastTile: 1 });
  });

  it("never shows the same shot twice at once", () => {
    let state = initialCollage(9, 27);
    for (let i = 0; i < 1000; i++) {
      state = swapTile(state);
      expect(new Set(state.showing).size).toBe(9);
    }
  });

  it("doesn't bring a shot back until every other hidden shot has had a turn", () => {
    let state = initialCollage(9, 27);
    const lastSeen = new Map<number, number>();
    for (let step = 0; step < 500; step++) {
      const before = state.showing;
      state = swapTile(state);
      const tile = state.lastTile!;
      const incoming = state.showing[tile];
      if (lastSeen.has(incoming)) expect(step - lastSeen.get(incoming)!).toBeGreaterThanOrEqual(18);
      lastSeen.set(before[tile], step);
    }
  });

  it("never changes the same tile twice in a row", () => {
    let state = initialCollage(9, 27);
    for (let i = 0; i < 1000; i++) {
      const prev = state.lastTile;
      state = swapTile(state);
      expect(state.lastTile).not.toBe(prev);
    }
  });
});
