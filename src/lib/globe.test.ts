import { describe, expect, it } from "vitest";
import { globeLines, project } from "./globe";

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

describe("project", () => {
  it("keeps the point facing the viewer at the center when not spun", () => {
    const [x, y, z] = project([0, 0, 1], 0);
    expect(close(x, 0)).toBe(true);
    expect(z).toBeGreaterThan(0.9);
    expect(Math.abs(y)).toBeLessThan(0.35); // the 18° tilt nudges it slightly
  });

  it("turns the front point to the side after a quarter spin", () => {
    const [x, , z] = project([0, 0, 1], Math.PI / 2);
    expect(close(Math.abs(x), 1)).toBe(true);
    expect(close(z, 0)).toBe(true);
  });

  it("keeps every projected point inside the outline", () => {
    for (const spin of [0, 0.7, 2.1, 4]) {
      for (const p of [[1, 0, 0], [0, 1, 0], [0.6, 0.48, 0.64]] as [number, number, number][]) {
        const [x, y] = project(p, spin);
        expect(Math.hypot(x, y)).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });
});

describe("globeLines", () => {
  it("draws every meridian and parallel with a visible front part", () => {
    const lines = globeLines(0.3);
    expect(lines).toHaveLength(11);
    for (const line of lines) expect(line.front).toMatch(/^M/);
  });

  it("moves the meridians as the globe spins", () => {
    expect(globeLines(0)[0].front).not.toBe(globeLines(0.5)[0].front);
  });

  it("puts the far side of the globe in the back paths", () => {
    expect(globeLines(0).some((line) => line.back.startsWith("M"))).toBe(true);
  });
});
