import { describe, expect, it } from "vitest";
import { streetZoneCandidates, ugrcLabel } from "./ugrc";

describe("streetZoneCandidates", () => {
  it("tries the last one to three words as the city", () => {
    expect(streetZoneCandidates("1566 S 350 E Kaysville")).toEqual([
      { street: "1566 S 350 E", zone: "Kaysville" },
      { street: "1566 S 350", zone: "E Kaysville" },
      { street: "1566 S", zone: "350 E Kaysville" },
    ]);
  });

  it("splits at a comma first and drops the state", () => {
    expect(streetZoneCandidates("845 E 3900 S, Salt Lake City, UT")[0]).toEqual({
      street: "845 E 3900 S",
      zone: "Salt Lake City",
    });
  });

  it("uses a ZIP as the zone when there is one", () => {
    expect(streetZoneCandidates("845 E 3900 S, Millcreek, UT 84107")).toEqual([
      { street: "845 E 3900 S", zone: "84107" },
    ]);
    expect(streetZoneCandidates("845 E 3900 S 84107")).toEqual([{ street: "845 E 3900 S", zone: "84107" }]);
  });

  it("needs a house number and a street", () => {
    expect(streetZoneCandidates("Kaysville")).toEqual([]);
    expect(streetZoneCandidates("1566 Kaysville")).toEqual([]);
  });
});

describe("ugrcLabel", () => {
  it("title-cases the city and adds the state", () => {
    expect(ugrcLabel("1566 S 350 E, KAYSVILLE")).toBe("1566 S 350 E, Kaysville, UT");
    expect(ugrcLabel("845 E 3900 S, SALT LAKE CITY")).toBe("845 E 3900 S, Salt Lake City, UT");
  });
});
