import type { ApiResult } from "./api";
import { camerasNearPoint, camerasNearRoute } from "./geo";
import type { CameraCollection, LngLat, MatchedCamera, Place, RadiusMiles, RouteResult } from "./types";

export const ROUTE_BUFFER_METERS = 50;

export const MESSAGES = {
  notFound: "Couldn't find that address — try adding city/state.",
  routingBusy: "Routing service busy — try again in a minute.",
  geocodingBusy: "Address search busy — try again in a minute.",
  dataFailed: "Couldn't load camera data.",
};

export type SearchOutcome =
  | { mode: "idle" }
  | { mode: "route"; route: RouteResult; matches: MatchedCamera[] }
  | { mode: "radius"; center: LngLat; radiusMiles: RadiusMiles; matches: MatchedCamera[] }
  | { mode: "error"; message: string };

export async function runSearch(input: {
  from: Place | null;
  to: Place | null;
  radiusMiles: RadiusMiles;
  cameras: CameraCollection;
  getRoute: (from: LngLat, to: LngLat) => Promise<ApiResult<RouteResult>>;
}): Promise<SearchOutcome> {
  const { from, to, radiusMiles, cameras, getRoute } = input;

  if (from && to) {
    const res = await getRoute(from.lngLat, to.lngLat);
    if (!res.ok) return { mode: "error", message: MESSAGES.routingBusy };
    return { mode: "route", route: res.data, matches: camerasNearRoute(res.data.geometry, cameras, ROUTE_BUFFER_METERS) };
  }

  const single = from ?? to;
  if (!single) return { mode: "idle" };
  return {
    mode: "radius",
    center: single.lngLat,
    radiusMiles,
    matches: camerasNearPoint(single.lngLat, cameras, radiusMiles),
  };
}
