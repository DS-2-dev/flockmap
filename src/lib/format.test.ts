import { describe, expect, it } from "vitest";
import { compassLabel, formatDistance, titleCaseAddress } from "./format";

describe("compassLabel", () => {
  it.each([
    [0, "N"],
    [44, "NE"],
    [90, "E"],
    [200, "S"],
    [292.5, "NW"],
    [350, "N"],
  ])("labels %d° as %s", (deg, label) => {
    expect(compassLabel(deg)).toBe(label);
  });
});

describe("formatDistance", () => {
  it("uses feet under a tenth of a mile", () => {
    expect(formatDistance(30)).toBe("98 ft");
  });

  it("uses miles beyond that", () => {
    expect(formatDistance(1609.344 * 1.234)).toBe("1.2 mi");
  });
});

describe("titleCaseAddress", () => {
  it("title-cases words but keeps grid directions and the state", () => {
    expect(titleCaseAddress("3848 HARRISON BLVD, OGDEN, UT, 84403")).toBe("3848 Harrison Blvd, Ogden, UT, 84403");
    expect(titleCaseAddress("1566 S 350 E, KAYSVILLE")).toBe("1566 S 350 E, Kaysville");
  });
});
