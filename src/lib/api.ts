import { formatLngLat } from "./lngLat";
import type { GeocodeResult, LngLat, RouteResult } from "./types";

export type ApiResult<T> = { ok: true; data: T } | { ok: false };

async function getJson<T>(url: string, signal?: AbortSignal): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return { ok: false };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false };
  }
}

export function fetchSuggestions(query: string, signal?: AbortSignal): Promise<ApiResult<GeocodeResult[]>> {
  return getJson(`/api/geocode?q=${encodeURIComponent(query)}`, signal);
}

export function fetchRoute(from: LngLat, to: LngLat): Promise<ApiResult<RouteResult>> {
  return getJson(`/api/route?from=${formatLngLat(from)}&to=${formatLngLat(to)}`);
}
