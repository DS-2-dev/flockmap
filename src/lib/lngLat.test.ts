import { describe, expect, it } from "vitest";
import { formatLngLat, parseLngLat } from "./lngLat";

describe("parseLngLat", () => {
  it("parses lng,lat", () => {
    expect(parseLngLat("-111.891,40.7608")).toEqual([-111.891, 40.7608]);
  });

  it("rounds to 5 decimals", () => {
    expect(parseLngLat("-111.8912345,40.7608999")).toEqual([-111.89123, 40.7609]);
  });

  it.each([[null], [""], ["abc"], ["1"], ["1,2,3"], ["200,40"], ["-111,95"], ["NaN,1"], [",40"]])(
    "rejects %j",
    (raw) => {
      expect(parseLngLat(raw)).toBeNull();
    },
  );
});

describe("formatLngLat", () => {
  it("formats with 5 decimals", () => {
    expect(formatLngLat([-111.891, 40.76])).toBe("-111.89100,40.76000");
  });
});
