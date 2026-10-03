import type { ApiResult } from "./api";
import { camerasNearPoint, camerasNearRoute, METERS_PER_MILE } from "./geo";
import { isInUtah } from "./overpass";
import type { CameraCollection, LngLat, MatchedCamera, Place, RadiusMiles, RouteResult } from "./types";

export const ROUTE_BUFFER_METERS = 50;

export const MESSAGES = {
  notFound: "Couldn't find that address — try adding city/state.",
  routingBusy: "Routing service busy — try again in a minute.",
  geocodingBusy: "Address search busy — try again in a minute.",
  dataFailed: "Couldn't load camera data.",
  loadingCameras: "Loading camera data…",
  loadingUs: "Loading full US camera data…",
  checking: "Checking for cameras…",
};

// "utah" while only the small Utah file has loaded; "us" once the full set is in.
export type CameraScope = "utah" | "us";

export type SearchOutcome =
  | { mode: "idle" }
  | { mode: "pending"; message: string }
  | { mode: "route"; route: RouteResult; matches: MatchedCamera[] }
  | { mode: "radius"; center: LngLat; radiusMiles: RadiusMiles; matches: MatchedCamera[] }
  | { mode: "error"; message: string };

const METERS_PER_DEG = 111_000;

function radiusStaysInUtah([lng, lat]: LngLat, radiusMiles: number): boolean {
  const dLat = (radiusMiles * METERS_PER_MILE) / METERS_PER_DEG;
  const dLng = dLat / Math.cos((lat * Math.PI) / 180);
  return [
    [lng - dLng, lat - dLat],
    [lng - dLng, lat + dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
  ].every((corner) => isInUtah(corner as LngLat));
}

/**
 * Pure search result for the current inputs. `route` is null while the route is
 * still being fetched. With only Utah cameras loaded, anything that reaches
 * outside Utah waits for the US data rather than reporting a false zero.
 */
export function computeOutcome(input: {
  from: Place | null;
  to: Place | null;
  radiusMiles: RadiusMiles;
  cameras: CameraCollection | null;
  scope: CameraScope;
  route: ApiResult<RouteResult> | null;
}): SearchOutcome {
  const { from, to, radiusMiles, cameras, scope, route } = input;
  const single = from && to ? null : (from ?? to);
  if (!from && !to) return { mode: "idle" };
  if (!cameras) return { mode: "pending", message: MESSAGES.loadingCameras };

  if (single) {
    if (scope === "utah" && !radiusStaysInUtah(single.lngLat, radiusMiles)) {
      return { mode: "pending", message: MESSAGES.loadingUs };
    }
    return {
      mode: "radius",
      center: single.lngLat,
      radiusMiles,
      matches: camerasNearPoint(single.lngLat, cameras, radiusMiles),
    };
  }

  if (!route) return { mode: "pending", message: MESSAGES.checking };
  if (!route.ok) return { mode: "error", message: MESSAGES.routingBusy };
  const coords = route.data.geometry.coordinates as LngLat[];
  if (scope === "utah" && !coords.every(isInUtah)) return { mode: "pending", message: MESSAGES.loadingUs };
  return {
    mode: "route",
    route: route.data,
    matches: camerasNearRoute(route.data.geometry, cameras, ROUTE_BUFFER_METERS),
  };
}
