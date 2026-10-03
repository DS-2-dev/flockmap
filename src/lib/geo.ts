import { distance, nearestPointOnLine } from "@turf/turf";
import type { LineString } from "geojson";
import type { CameraCollection, LngLat, MatchedCamera } from "./types";

export const METERS_PER_MILE = 1609.344;
// Deliberately smaller than the true ~111.2 km so the prefilter box is never too tight.
const METERS_PER_DEG_LAT = 110_000;

type Bbox = [number, number, number, number];

function expandedBbox(coords: LngLat[], meters: number): Bbox {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  const dLat = meters / METERS_PER_DEG_LAT;
  const maxAbsLat = Math.min(89, Math.max(Math.abs(minLat), Math.abs(maxLat)) + dLat);
  const dLng = meters / (METERS_PER_DEG_LAT * Math.cos((maxAbsLat * Math.PI) / 180));
  return [minLng - dLng, minLat - dLat, maxLng + dLng, maxLat + dLat];
}

function inBbox([lng, lat]: LngLat, [minLng, minLat, maxLng, maxLat]: Bbox): boolean {
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
}

export function camerasNearPoint(center: LngLat, cameras: CameraCollection, radiusMiles = 1): MatchedCamera[] {
  const radiusMeters = radiusMiles * METERS_PER_MILE;
  const box = expandedBbox([center], radiusMeters);
  const matches: MatchedCamera[] = [];
  for (const camera of cameras.features) {
    const coord = camera.geometry.coordinates as LngLat;
    if (!inBbox(coord, box)) continue;
    const d = distance(center, coord, { units: "meters" });
    if (d <= radiusMeters) matches.push({ camera, distanceMeters: d });
  }
  return matches.sort((a, b) => a.distanceMeters - b.distanceMeters);
}

export function camerasNearRoute(route: LineString, cameras: CameraCollection, meters = 50): MatchedCamera[] {
  const coords = route.coordinates as LngLat[];
  if (coords.length === 0) return [];
  const distinct = new Set(coords.map(([lng, lat]) => `${lng},${lat}`));
  if (distinct.size < 2) return camerasNearPoint(coords[0], cameras, meters / METERS_PER_MILE);

  // cumulative[i] = meters from route start to vertex i
  const cumulative = [0];
  for (let i = 1; i < coords.length; i++) {
    cumulative.push(cumulative[i - 1] + distance(coords[i - 1], coords[i], { units: "meters" }));
  }

  const box = expandedBbox(coords, meters);
  const hits: { match: MatchedCamera; along: number }[] = [];
  for (const camera of cameras.features) {
    const coord = camera.geometry.coordinates as LngLat;
    if (!inBbox(coord, box)) continue;
    const nearest = nearestPointOnLine(route, coord);
    const snapped = nearest.geometry.coordinates;
    const d = distance(coord, snapped, { units: "meters" });
    if (d > meters) continue;
    const index = nearest.properties.index;
    const along = cumulative[index] + distance(coords[index], snapped, { units: "meters" });
    hits.push({ match: { camera, distanceMeters: d }, along });
  }
  return hits.sort((a, b) => a.along - b.along).map((h) => h.match);
}
