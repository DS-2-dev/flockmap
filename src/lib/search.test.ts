import { describe, expect, it } from "vitest";
import { computeOutcome, MESSAGES } from "./search";
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
const DENVER: Place = { label: "Denver", lngLat: [-104.99, 39.74] };
const route: RouteResult = {
  geometry: { type: "LineString", coordinates: [A.lngLat, B.lngLat] },
  distanceMeters: 8400,
  durationSeconds: 600,
  provider: "osrm",
};
const base = { from: null, to: null, radiusMiles: 1 as const, cameras, scope: "us" as const, route: null };

describe("computeOutcome", () => {
  it("is idle with no places", () => {
    expect(computeOutcome(base)).toEqual({ mode: "idle" });
  });

  it("waits while camera data is loading", () => {
    expect(computeOutcome({ ...base, from: A, cameras: null })).toEqual({
      mode: "pending",
      message: MESSAGES.loadingCameras,
    });
  });

  it("waits for the route while it is being fetched", () => {
    expect(computeOutcome({ ...base, from: A, to: B })).toEqual({ mode: "pending", message: MESSAGES.checking });
  });

  it("matches cameras along a fetched route", () => {
    const outcome = computeOutcome({ ...base, from: A, to: B, route: { ok: true, data: route } });
    expect(outcome.mode).toBe("route");
    if (outcome.mode === "route") expect(outcome.matches.map((m) => m.camera.properties.id)).toEqual([1]);
  });

  it("returns the routing-busy message when routing fails", () => {
    expect(computeOutcome({ ...base, from: A, to: B, route: { ok: false } })).toEqual({
      mode: "error",
      message: MESSAGES.routingBusy,
    });
  });

  it("runs a radius search around A when only A is set", () => {
    const outcome = computeOutcome({ ...base, from: A, radiusMiles: 5 });
    expect(outcome).toMatchObject({ mode: "radius", center: A.lngLat, radiusMiles: 5 });
    if (outcome.mode === "radius") expect(outcome.matches.map((m) => m.camera.properties.id)).toEqual([1, 2]);
  });

  it("runs a radius search around B when only B is set", () => {
    expect(computeOutcome({ ...base, to: B })).toMatchObject({ mode: "radius", center: B.lngLat });
  });

  describe("with only Utah cameras loaded", () => {
    const utahOnly = { ...base, scope: "utah" as const };

    it("searches normally inside Utah", () => {
      expect(computeOutcome({ ...utahOnly, from: A }).mode).toBe("radius");
    });

    it("waits for US data instead of reporting zero cameras outside Utah", () => {
      expect(computeOutcome({ ...utahOnly, from: DENVER })).toEqual({ mode: "pending", message: MESSAGES.loadingUs });
    });

    it("waits for US data when a radius crosses the state line", () => {
      const nearBorder: Place = { label: "Wendover", lngLat: [-114.04, 40.74] };
      expect(computeOutcome({ ...utahOnly, from: nearBorder }).mode).toBe("pending");
    });

    it("waits for US data when a route leaves Utah", () => {
      const leaving: RouteResult = { ...route, geometry: { type: "LineString", coordinates: [A.lngLat, DENVER.lngLat] } };
      expect(computeOutcome({ ...utahOnly, from: A, to: B, route: { ok: true, data: leaving } })).toEqual({
        mode: "pending",
        message: MESSAGES.loadingUs,
      });
    });
  });
});
