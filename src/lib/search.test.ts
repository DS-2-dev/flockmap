import { describe, expect, it, vi } from "vitest";
import { MESSAGES, runSearch } from "./search";
import type { Camera, CameraCollection, Place, RouteResult } from "./types";

const cam = (id: number, lng: number, lat: number): Camera => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [lng, lat] },
  properties: { id, direction: null, operator: null },
});
const cameras: CameraCollection = {
  type: "FeatureCollection",
  features: [cam(1, -111.9, 40.7), cam(2, -111.9, 40.75)],
};
const A: Place = { label: "A", lngLat: [-111.95, 40.7] };
const B: Place = { label: "B", lngLat: [-111.85, 40.7] };
const route: RouteResult = {
  geometry: { type: "LineString", coordinates: [A.lngLat, B.lngLat] },
  distanceMeters: 8400,
  durationSeconds: 600,
  provider: "osrm",
};

describe("runSearch", () => {
  it("is idle with no places", async () => {
    const getRoute = vi.fn();
    expect(await runSearch({ from: null, to: null, radiusMiles: 1, cameras, getRoute })).toEqual({ mode: "idle" });
    expect(getRoute).not.toHaveBeenCalled();
  });

  it("runs a route search when both places are set", async () => {
    const getRoute = vi.fn().mockResolvedValue({ ok: true, data: route });
    const outcome = await runSearch({ from: A, to: B, radiusMiles: 1, cameras, getRoute });
    expect(getRoute).toHaveBeenCalledWith(A.lngLat, B.lngLat);
    expect(outcome.mode).toBe("route");
    if (outcome.mode === "route") expect(outcome.matches.map((m) => m.camera.properties.id)).toEqual([1]);
  });

  it("returns the routing-busy message when routing fails", async () => {
    const getRoute = vi.fn().mockResolvedValue({ ok: false });
    expect(await runSearch({ from: A, to: B, radiusMiles: 1, cameras, getRoute })).toEqual({
      mode: "error",
      message: MESSAGES.routingBusy,
    });
  });

  it("runs a radius search around A when only A is set", async () => {
    const getRoute = vi.fn();
    const outcome = await runSearch({ from: A, to: null, radiusMiles: 5, cameras, getRoute });
    expect(getRoute).not.toHaveBeenCalled();
    expect(outcome).toMatchObject({ mode: "radius", center: A.lngLat, radiusMiles: 5 });
    if (outcome.mode === "radius") expect(outcome.matches.map((m) => m.camera.properties.id)).toEqual([1, 2]);
  });

  it("runs a radius search around B when only B is set", async () => {
    const getRoute = vi.fn();
    const outcome = await runSearch({ from: null, to: B, radiusMiles: 1, cameras, getRoute });
    expect(outcome).toMatchObject({ mode: "radius", center: B.lngLat, radiusMiles: 1 });
  });
});
