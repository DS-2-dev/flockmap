import { formatLngLat, parseLngLat } from "./lngLat";
import { RADIUS_OPTIONS, type Place, type RadiusMiles } from "./types";

export type SearchState = { from: Place | null; to: Place | null; radiusMiles: RadiusMiles };

function parsePlace(params: URLSearchParams, coordKey: string, labelKey: string): Place | null {
  const lngLat = parseLngLat(params.get(coordKey));
  if (!lngLat) return null;
  const label = params.get(labelKey)?.trim() || `${lngLat[1].toFixed(5)}, ${lngLat[0].toFixed(5)}`;
  return { label, lngLat };
}

function parseRadius(raw: string | null): RadiusMiles {
  const n = Number(raw);
  return (RADIUS_OPTIONS as readonly number[]).includes(n) ? (n as RadiusMiles) : 1;
}

export function parseSearchState(params: URLSearchParams): SearchState {
  return {
    from: parsePlace(params, "from", "fl"),
    to: parsePlace(params, "to", "tl"),
    radiusMiles: parseRadius(params.get("r")),
  };
}

export function serializeSearchState({ from, to, radiusMiles }: SearchState): string {
  if (!from && !to) return "";
  const params = new URLSearchParams();
  if (from) {
    params.set("from", formatLngLat(from.lngLat));
    params.set("fl", from.label);
  }
  if (to) {
    params.set("to", formatLngLat(to.lngLat));
    params.set("tl", to.label);
  }
  params.set("r", String(radiusMiles));
  return params.toString();
}
