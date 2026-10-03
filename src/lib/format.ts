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

// Words kept as typed when title-casing addresses: grid directions and abbreviations.
const KEEP_UPPER = new Set(["N", "S", "E", "W", "NE", "NW", "SE", "SW", "UT", "US", "PO"]);

/** "3848 HARRISON BLVD" -> "3848 Harrison Blvd"; "1566 S 350 E" stays as is. */
export function titleCaseAddress(text: string): string {
  return text.replace(/[A-Za-z][A-Za-z']*/g, (w) =>
    KEEP_UPPER.has(w.toUpperCase()) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1).toLowerCase(),
  );
}
