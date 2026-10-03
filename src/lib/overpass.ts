import type { Camera, CameraCollection, LngLat } from "./types";

export type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
};
export type OverpassResponse = { elements: OverpassElement[] };

const CARDINALS: Record<string, number> = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
  S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
};

// OSM direction tags are free text: "90", "NE", "90;270", "45-90". Take the first value.
export function parseDirection(raw: string | undefined): number | null {
  if (!raw) return null;
  const first = raw.split(/[;,]/)[0].trim().toUpperCase();
  if (first in CARDINALS) return CARDINALS[first];
  const match = first.match(/^-?\d+(\.\d+)?/);
  if (!match) return null;
  const deg = Number(match[0]);
  return ((deg % 360) + 360) % 360;
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

export function overpassToGeoJSON(res: OverpassResponse): CameraCollection {
  const seen = new Set<number>();
  const features: Camera[] = [];
  for (const el of res.elements) {
    if (el.type !== "node" || el.lat === undefined || el.lon === undefined || seen.has(el.id)) continue;
    seen.add(el.id);
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [round6(el.lon), round6(el.lat)] },
      properties: {
        id: el.id,
        direction: parseDirection(el.tags?.direction ?? el.tags?.["camera:direction"]),
        operator: el.tags?.operator ?? null,
      },
    });
  }
  return { type: "FeatureCollection", features };
}

// Utah is its bounding box minus Wyoming's notch in the northeast corner.
export function isInUtah([lng, lat]: LngLat): boolean {
  const inBox = lng >= -114.0529 && lng <= -109.041 && lat >= 36.998 && lat <= 42.0017;
  const inWyomingNotch = lng > -111.0466 && lat > 41.0;
  return inBox && !inWyomingNotch;
}
