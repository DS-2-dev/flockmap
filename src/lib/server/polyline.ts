import type { LngLat } from "../types";

// Google encoded-polyline algorithm. Valhalla uses precision 6.
export function decodePolyline(encoded: string, precision = 6): LngLat[] {
  const factor = 10 ** precision;
  const coords: LngLat[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  const nextValue = () => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };

  while (index < encoded.length) {
    lat += nextValue();
    lng += nextValue();
    coords.push([lng / factor, lat / factor]);
  }
  return coords;
}
