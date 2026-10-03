import { describe, expect, it } from "vitest";
import { AllProvidersFailed, tryInOrder, type Attempt } from "./fallback";

const fail = (name: string, msg: string): Attempt<string> => ({
  name,
  run: async () => {
    throw new Error(msg);
  },
});
const ok = (name: string, value: string): Attempt<string> => ({ name, run: async () => value });

describe("tryInOrder", () => {
  it("returns the first provider that succeeds", async () => {
    await expect(tryInOrder([fail("a", "boom"), ok("b", "yes"), ok("c", "no")], 1000)).resolves.toEqual({
      value: "yes",
      provider: "b",
    });
  });

  it("moves on when a provider hangs past the timeout, even if it ignores the signal", async () => {
    const hang: Attempt<string> = { name: "hang", run: () => new Promise(() => {}) };
    await expect(tryInOrder([hang, ok("fast", "yes")], 20)).resolves.toEqual({ value: "yes", provider: "fast" });
  });

  it("aborts the signal passed to a timed-out provider", async () => {
    let seen: AbortSignal | undefined;
    const hang: Attempt<string> = {
      name: "hang",
      run: (signal) => {
        seen = signal;
        return new Promise(() => {});
      },
    };
    await tryInOrder([hang, ok("b", "yes")], 20);
    expect(seen?.aborted).toBe(true);
  });

  it("throws AllProvidersFailed listing every error", async () => {
    const promise = tryInOrder([fail("a", "x"), fail("b", "y")], 100);
    await expect(promise).rejects.toBeInstanceOf(AllProvidersFailed);
    await expect(promise).rejects.toThrow("a: x; b: y");
  });
});
