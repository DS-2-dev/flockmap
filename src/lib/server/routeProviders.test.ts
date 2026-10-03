import { describe, expect, it } from "vitest";
import { tryInOrder } from "./fallback";
import { routeAttempts } from "./routeProviders";

const FROM: [number, number] = [-111.97, 41.223];
const TO: [number, number] = [-111.891, 40.7608];
const LINE = { type: "LineString", coordinates: [FROM, TO] };

function fakeFetch(handlers: Record<string, () => Response>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    const key = Object.keys(handlers).find((k) => url.includes(k));
    if (!key) throw new Error(`unexpected fetch ${url}`);
    return handlers[key]();
  }) as typeof fetch;
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("routeAttempts", () => {
  it("skips OpenRouteService when no API key is set", () => {
    expect(routeAttempts(FROM, TO, undefined).map((a) => a.name)).toEqual(["osrm", "valhalla"]);
    expect(routeAttempts(FROM, TO, "key").map((a) => a.name)).toEqual(["openrouteservice", "osrm", "valhalla"]);
  });

  it("parses an OpenRouteService response", async () => {
    const fetchFn = fakeFetch({
      openrouteservice: () =>
        json({ features: [{ geometry: LINE, properties: { summary: { distance: 52000, duration: 2400 } } }] }),
    });
    const result = await tryInOrder(routeAttempts(FROM, TO, "key", fetchFn), 1000);
    expect(result).toEqual({
      provider: "openrouteservice",
      value: { geometry: LINE, distanceMeters: 52000, durationSeconds: 2400 },
    });
  });

  it("falls back to OSRM when OpenRouteService is rate limited", async () => {
    const fetchFn = fakeFetch({
      openrouteservice: () => json({ error: "rate limit" }, 429),
      "project-osrm": () => json({ code: "Ok", routes: [{ geometry: LINE, distance: 51000, duration: 2300 }] }),
    });
    const result = await tryInOrder(routeAttempts(FROM, TO, "key", fetchFn), 1000);
    expect(result.provider).toBe("osrm");
    expect(result.value.distanceMeters).toBe(51000);
  });

  it("treats 200-with-no-route as failure and moves on", async () => {
    const fetchFn = fakeFetch({
      openrouteservice: () => json({ features: [] }),
      "project-osrm": () => json({ code: "NoRoute", routes: [] }),
      valhalla: () =>
        json({ trip: { legs: [{ shape: "_p~iF~ps|U_ulLnnqC" }], summary: { length: 50.5, time: 2200 } } }),
    });
    const result = await tryInOrder(routeAttempts(FROM, TO, "key", fetchFn), 1000);
    expect(result.provider).toBe("valhalla");
    expect(result.value.distanceMeters).toBe(50500);
    expect(result.value.durationSeconds).toBe(2200);
    expect(result.value.geometry.type).toBe("LineString");
    expect(result.value.geometry.coordinates).toHaveLength(2);
  });
});
