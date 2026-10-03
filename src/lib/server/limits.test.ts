import { describe, expect, it } from "vitest";
import { checkGeocodeQuery, checkRouteRequest } from "./limits";

describe("checkRouteRequest", () => {
  it("accepts a Utah route", () => {
    expect(checkRouteRequest([-111.97, 41.22], [-111.89, 40.76])).toBe("ok");
  });

  it("accepts a cross-country US route", () => {
    expect(checkRouteRequest([-122.42, 37.77], [-74.0, 40.71])).toBe("ok");
  });

  it("accepts Alaska and Hawaii", () => {
    expect(checkRouteRequest([-149.9, 61.2], [-147.7, 64.8])).toBe("ok");
    expect(checkRouteRequest([-157.86, 21.31], [-157.8, 21.4])).toBe("ok");
  });

  it("rejects points outside the US", () => {
    expect(checkRouteRequest([2.35, 48.86], [13.4, 52.52])).toBe("outside_us");
    expect(checkRouteRequest([-111.9, 40.7], [-0.12, 51.5])).toBe("outside_us");
  });

  it("rejects routes longer than the straight-line cap", () => {
    expect(checkRouteRequest([-157.86, 21.31], [-74.0, 40.71])).toBe("too_far");
  });
});

describe("checkGeocodeQuery", () => {
  it("accepts normal addresses", () => {
    expect(checkGeocodeQuery("3848 Harrison Blvd, Ogden, UT")).toBe(true);
  });

  it("rejects very long queries", () => {
    expect(checkGeocodeQuery("a".repeat(201))).toBe(false);
  });
});
