import type { LineString } from "geojson";
import type { LngLat, RouteResult } from "../types";
import type { Attempt } from "./fallback";
import { decodePolyline } from "./polyline";

export type RouteData = Omit<RouteResult, "provider">;

type OrsResponse = {
  features?: Array<{ geometry?: LineString; properties?: { summary?: { distance?: number; duration?: number } } }>;
};
type OsrmResponse = {
  code?: string;
  routes?: Array<{ geometry?: LineString; distance?: number; duration?: number }>;
};
type ValhallaResponse = {
  trip?: { legs?: Array<{ shape?: string }>; summary?: { length?: number; time?: number } };
};

async function getJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

function ors(from: LngLat, to: LngLat, apiKey: string, fetchFn: typeof fetch): Attempt<RouteData> {
  return {
    name: "openrouteservice",
    run: async (signal) => {
      const res = await fetchFn("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
        method: "POST",
        headers: { Authorization: apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ coordinates: [from, to] }),
        signal,
      });
      const feature = (await getJson<OrsResponse>(res)).features?.[0];
      if (feature?.geometry?.type !== "LineString") throw new Error("no route");
      return {
        geometry: feature.geometry,
        distanceMeters: feature.properties?.summary?.distance ?? 0,
        durationSeconds: feature.properties?.summary?.duration ?? 0,
      };
    },
  };
}

function osrm(from: LngLat, to: LngLat, fetchFn: typeof fetch): Attempt<RouteData> {
  return {
    name: "osrm",
    run: async (signal) => {
      const url =
        `https://router.project-osrm.org/route/v1/driving/${from.join(",")};${to.join(",")}` +
        `?overview=full&geometries=geojson`;
      const body = await getJson<OsrmResponse>(await fetchFn(url, { signal }));
      const route = body.routes?.[0];
      if (body.code !== "Ok" || route?.geometry?.type !== "LineString") throw new Error(body.code ?? "no route");
      return { geometry: route.geometry, distanceMeters: route.distance ?? 0, durationSeconds: route.duration ?? 0 };
    },
  };
}

function valhalla(from: LngLat, to: LngLat, fetchFn: typeof fetch): Attempt<RouteData> {
  return {
    name: "valhalla",
    run: async (signal) => {
      const request = {
        locations: [
          { lon: from[0], lat: from[1] },
          { lon: to[0], lat: to[1] },
        ],
        costing: "auto",
        directions_type: "none",
      };
      const url = `https://valhalla1.openstreetmap.de/route?json=${encodeURIComponent(JSON.stringify(request))}`;
      const { trip } = await getJson<ValhallaResponse>(await fetchFn(url, { signal }));
      const shape = trip?.legs?.[0]?.shape;
      if (!shape) throw new Error("no route");
      return {
        geometry: { type: "LineString", coordinates: decodePolyline(shape, 6) },
        // Valhalla reports length in kilometers
        distanceMeters: (trip?.summary?.length ?? 0) * 1000,
        durationSeconds: trip?.summary?.time ?? 0,
      };
    },
  };
}

export function routeAttempts(
  from: LngLat,
  to: LngLat,
  orsApiKey: string | undefined,
  fetchFn: typeof fetch = fetch,
): Attempt<RouteData>[] {
  return [
    ...(orsApiKey ? [ors(from, to, orsApiKey, fetchFn)] : []),
    osrm(from, to, fetchFn),
    valhalla(from, to, fetchFn),
  ];
}
