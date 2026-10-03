import { describe, expect, it } from "vitest";
import { nextSwap } from "./collage";

// Rand stub returning the given values in order.
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe("nextSwap", () => {
  it("replaces one tile with a shot that isn't already showing", () => {
    const showing = [0, 1, 2, 3];
    const { tile, shot } = nextSwap(showing, 6, seq(0.5, 0))!;
    expect(tile).toBe(2);
    expect(showing).not.toContain(shot);
    expect(shot).toBe(4);
  });

  it("never picks a visible shot whatever the random values", () => {
    const showing = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
      const { tile, shot } = nextSwap(showing, 27, seq(r, r))!;
      expect(tile).toBeGreaterThanOrEqual(0);
      expect(tile).toBeLessThan(9);
      expect(showing).not.toContain(shot);
      expect(shot).toBeLessThan(27);
    }
  });

  it("returns null when every shot is already showing", () => {
    expect(nextSwap([0, 1, 2], 3, Math.random)).toBeNull();
  });
});
