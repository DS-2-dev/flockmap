import { distance } from "@turf/turf";
import type { LngLat } from "../types";

// The public API routes only serve US trips, so they can't be used as a free
// proxy for anyone's routing or geocoding quota.

// Generous box around the 50 states (Alaska's far Aleutians excluded).
const US_BOUNDS = { minLng: -180, maxLng: -65, minLat: 18, maxLat: 72 };
// Longer than any coast-to-coast drive in the lower 48 (~4,500 km straight line).
export const MAX_ROUTE_KM = 5000;
export const MAX_QUERY_LENGTH = 200;

function inUs([lng, lat]: LngLat): boolean {
  return lng >= US_BOUNDS.minLng && lng <= US_BOUNDS.maxLng && lat >= US_BOUNDS.minLat && lat <= US_BOUNDS.maxLat;
}

export function checkRouteRequest(from: LngLat, to: LngLat): "ok" | "outside_us" | "too_far" {
  if (!inUs(from) || !inUs(to)) return "outside_us";
  if (distance(from, to, { units: "kilometers" }) > MAX_ROUTE_KM) return "too_far";
  return "ok";
}

export function checkGeocodeQuery(query: string): boolean {
  return query.length <= MAX_QUERY_LENGTH;
}
