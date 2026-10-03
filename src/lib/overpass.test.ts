import { describe, expect, it } from "vitest";
import { isInUtah, overpassToGeoJSON, parseDirection, type OverpassResponse } from "./overpass";

describe("parseDirection", () => {
  it.each([
    ["90", 90],
    [" 180 ", 180],
    ["NE", 45],
    ["nne", 22.5],
    ["90;270", 90],
    ["45-90", 45],
    ["370", 10],
    ["-45", 315],
  ])("parses %j as %d", (raw, expected) => {
    expect(parseDirection(raw)).toBe(expected);
  });

  it.each([[""], ["north-ish"], [undefined]])("returns null for %j", (raw) => {
    expect(parseDirection(raw)).toBeNull();
  });
});

describe("overpassToGeoJSON", () => {
  const sample: OverpassResponse = {
    elements: [
      {
        type: "node",
        id: 1,
        lat: 40.7608,
        lon: -111.891,
        tags: { "surveillance:type": "ALPR", direction: "90", operator: "Salt Lake City Police" },
      },
      { type: "node", id: 2, lat: 41.2230001234, lon: -111.9738, tags: { direction: "NE" } },
      { type: "way", id: 3 },
      { type: "node", id: 1, lat: 40.7608, lon: -111.891, tags: {} },
    ],
  };

  it("keeps unique nodes with rounded coords and trimmed props", () => {
    expect(overpassToGeoJSON(sample)).toEqual({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-111.891, 40.7608] },
          properties: { id: 1, direction: 90, operator: "Salt Lake City Police" },
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [-111.9738, 41.223] },
          properties: { id: 2, direction: 45, operator: null },
        },
      ],
    });
  });
});

describe("isInUtah", () => {
  it.each([
    ["Salt Lake City", [-111.891, 40.7608]],
    ["Ogden", [-111.97, 41.223]],
    ["St. George", [-113.5684, 37.0965]],
  ])("%s is in Utah", (_, coord) => {
    expect(isInUtah(coord as [number, number])).toBe(true);
  });

  it.each([
    ["Evanston WY (NE notch)", [-110.963, 41.268]],
    ["Denver", [-104.99, 39.74]],
    ["Las Vegas", [-115.14, 36.17]],
  ])("%s is not in Utah", (_, coord) => {
    expect(isInUtah(coord as [number, number])).toBe(false);
  });
});
