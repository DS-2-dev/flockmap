import type { LineString } from "geojson";
import { describe, expect, it } from "vitest";
import { camerasNearPoint, camerasNearRoute } from "./geo";
import type { Camera, CameraCollection } from "./types";

// turf uses mean earth radius 6371008.8 m → 1° latitude ≈ 111195 m
const degNorth = (meters: number) => meters / 111_195;

const cam = (id: number, lng: number, lat: number): Camera => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [lng, lat] },
  properties: { id, direction: null, operator: null },
});
const fc = (...features: Camera[]): CameraCollection => ({ type: "FeatureCollection", features });
const ids = (matches: { camera: Camera }[]) => matches.map((m) => m.camera.properties.id);

const route: LineString = { type: "LineString", coordinates: [[-111.95, 40.7], [-111.85, 40.7]] };

describe("camerasNearRoute", () => {
  it("includes cameras within 50 m and excludes farther ones", () => {
    const cameras = fc(
      cam(1, -111.9, 40.7 + degNorth(30)),
      cam(2, -111.9, 40.7 + degNorth(49)),
      cam(3, -111.9, 40.7 + degNorth(80)),
      cam(4, -111.84, 40.7),
    );
    expect(ids(camerasNearRoute(route, cameras))).toEqual([1, 2]);
  });

  it("orders cameras by position along the route, not by id", () => {
    const cameras = fc(cam(1, -111.86, 40.7 + degNorth(10)), cam(2, -111.94, 40.7 - degNorth(10)));
    expect(ids(camerasNearRoute(route, cameras))).toEqual([2, 1]);
  });

  it("reports distance from the route in meters", () => {
    const [match] = camerasNearRoute(route, fc(cam(1, -111.9, 40.7 + degNorth(30))));
    // turf measures to the great-circle segment, which bows ~1.2 m north of the parallel here
    expect(Math.abs(match.distanceMeters - 30)).toBeLessThan(2);
  });

  it("handles a degenerate route where start equals destination", () => {
    const same: LineString = { type: "LineString", coordinates: [[-111.9, 40.7], [-111.9, 40.7]] };
    const cameras = fc(cam(1, -111.9, 40.7 + degNorth(20)), cam(2, -111.9, 40.7 + degNorth(80)));
    expect(ids(camerasNearRoute(same, cameras))).toEqual([1]);
  });

  it("returns nothing for an empty route", () => {
    const empty: LineString = { type: "LineString", coordinates: [] };
    expect(camerasNearRoute(empty, fc(cam(1, -111.9, 40.7)))).toEqual([]);
  });
});

describe("camerasNearPoint", () => {
  it("includes cameras inside the radius, sorted nearest first", () => {
    const cameras = fc(
      cam(1, -111.9, 40.7 + degNorth(0.9 * 1609.344)),
      cam(2, -111.9, 40.7 + degNorth(1.1 * 1609.344)),
      cam(3, -111.9, 40.7 + degNorth(100)),
    );
    expect(ids(camerasNearPoint([-111.9, 40.7], cameras, 1))).toEqual([3, 1]);
  });

  it("defaults to a 1 mile radius", () => {
    const cameras = fc(cam(1, -111.9, 40.7 + degNorth(1500)), cam(2, -111.9, 40.7 + degNorth(1700)));
    expect(ids(camerasNearPoint([-111.9, 40.7], cameras))).toEqual([1]);
  });
});

describe("camerasNearRoute on long routes", () => {
  // Deterministic pseudo-random numbers so the test is repeatable.
  let seed = 42;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

  // ~1,100 km route with 6,000 vertices, roughly SLC → LA.
  const N = 6000;
  const long: LineString = {
    type: "LineString",
    coordinates: Array.from({ length: N }, (_, i) => [-111.9 - (6.3 * i) / (N - 1), 40.76 - (6.7 * i) / (N - 1)]),
  };
  // 100k cameras scattered inside the route's bounding box, the worst case for a single-bbox prefilter.
  const many = fc(
    ...Array.from({ length: 100_000 }, (_, i) => cam(i, -118.2 + rand() * 6.3, 34.06 + rand() * 6.7)),
  );

  it("matches 100k cameras against a 6,000-vertex route in under a second", () => {
    const start = performance.now();
    camerasNearRoute(long, many);
    expect(performance.now() - start).toBeLessThan(1000);
  });

  it("finds cameras on every part of a multi-chunk route, in driving order", () => {
    const [lng0, lat0] = long.coordinates[10];
    const [lng1, lat1] = long.coordinates[3000];
    const [lng2, lat2] = long.coordinates[5990];
    const cameras = fc(cam(3, lng2, lat2 + degNorth(20)), cam(1, lng0, lat0 + degNorth(20)), cam(2, lng1, lat1));
    expect(ids(camerasNearRoute(long, cameras))).toEqual([1, 2, 3]);
  });
});
