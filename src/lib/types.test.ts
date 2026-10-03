import { describe, expect, it } from "vitest";
import { RADIUS_OPTIONS } from "./types";

describe("RADIUS_OPTIONS", () => {
  it("offers half, one and five miles", () => {
    expect(RADIUS_OPTIONS).toEqual([0.5, 1, 5]);
  });
});
