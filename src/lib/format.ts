import { METERS_PER_MILE } from "./geo";

const WINDS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export function compassLabel(degrees: number): string {
  return WINDS[Math.round((((degrees % 360) + 360) % 360) / 45) % 8];
}

const FEET_PER_METER = 3.28084;

export function formatDistance(meters: number): string {
  const miles = meters / METERS_PER_MILE;
  return miles < 0.1 ? `${Math.round(meters * FEET_PER_METER)} ft` : `${miles.toFixed(1)} mi`;
}
