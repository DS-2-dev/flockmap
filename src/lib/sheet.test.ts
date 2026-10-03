import { describe, expect, it } from "vitest";
import { snapDetent } from "./sheet";

const heights = { peek: 90, half: 400, full: 760 };

describe("snapDetent", () => {
  it("snaps a slow release to the nearest height", () => {
    expect(snapDetent(120, 0, heights)).toBe("peek");
    expect(snapDetent(450, 0, heights)).toBe("half");
    expect(snapDetent(700, 0, heights)).toBe("full");
  });

  it("follows a fast upward flick past the nearest height", () => {
    expect(snapDetent(420, 2.5, heights)).toBe("full");
  });

  it("follows a fast downward flick", () => {
    expect(snapDetent(380, -2.5, heights)).toBe("peek");
  });

  it("never snaps beyond the smallest or largest height", () => {
    expect(snapDetent(-200, -5, heights)).toBe("peek");
    expect(snapDetent(2000, 5, heights)).toBe("full");
  });
});
