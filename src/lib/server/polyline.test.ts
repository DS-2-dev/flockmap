import { describe, expect, it } from "vitest";
import { decodePolyline } from "./polyline";

describe("decodePolyline", () => {
  it("decodes Google's reference polyline (precision 5) into [lng, lat]", () => {
    const coords = decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@", 5);
    const expected = [[-120.2, 38.5], [-120.95, 40.7], [-126.453, 43.252]];
    expect(coords).toHaveLength(3);
    coords.forEach(([lng, lat], i) => {
      expect(lng).toBeCloseTo(expected[i][0], 5);
      expect(lat).toBeCloseTo(expected[i][1], 5);
    });
  });

  it("returns an empty array for an empty string", () => {
    expect(decodePolyline("")).toEqual([]);
  });
});
