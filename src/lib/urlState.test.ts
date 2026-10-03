import { describe, expect, it } from "vitest";
import { parseSearchState, serializeSearchState, type SearchState } from "./urlState";

describe("URL search state", () => {
  it("round-trips a route search", () => {
    const state: SearchState = {
      from: { label: "Ogden, Utah", lngLat: [-111.97, 41.223] },
      to: { label: "Salt Lake City, Utah", lngLat: [-111.891, 40.7608] },
      radiusMiles: 1,
    };
    expect(parseSearchState(new URLSearchParams(serializeSearchState(state)))).toEqual(state);
  });

  it("serializes to empty string when there are no places", () => {
    expect(serializeSearchState({ from: null, to: null, radiusMiles: 5 })).toBe("");
  });

  it("ignores malformed coordinates and unknown radius", () => {
    expect(parseSearchState(new URLSearchParams("from=abc&to=1&r=99"))).toEqual({
      from: null,
      to: null,
      radiusMiles: 1,
    });
  });

  it("keeps a valid radius", () => {
    expect(parseSearchState(new URLSearchParams("r=0.5")).radiusMiles).toBe(0.5);
  });

  it("falls back to a coordinate label when the label is missing", () => {
    expect(parseSearchState(new URLSearchParams("from=-111.891,40.7608")).from).toEqual({
      label: "40.76080, -111.89100",
      lngLat: [-111.891, 40.7608],
    });
  });
});
