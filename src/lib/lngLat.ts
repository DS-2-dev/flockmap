import type { LngLat } from "./types";

const round5 = (n: number) => Math.round(n * 1e5) / 1e5;

export function parseLngLat(raw: string | null): LngLat | null {
  if (!raw) return null;
  const parts = raw.split(",");
  if (parts.length !== 2 || parts.some((p) => p.trim() === "")) return null;
  const [lng, lat] = parts.map(Number);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null;
  return [round5(lng), round5(lat)];
}

export function formatLngLat([lng, lat]: LngLat): string {
  return `${lng.toFixed(5)},${lat.toFixed(5)}`;
}
