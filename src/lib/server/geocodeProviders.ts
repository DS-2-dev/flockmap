import type { GeocodeResult } from "../types";
import type { Attempt } from "./fallback";

export type PhotonProps = {
  name?: string;
  housenumber?: string;
  street?: string;
  city?: string;
  state?: string;
  postcode?: string;
  countrycode?: string;
};
type PhotonResponse = {
  features?: Array<{ geometry?: { coordinates?: [number, number] }; properties?: PhotonProps }>;
};
type NominatimResponse = Array<{ display_name?: string; lat?: string; lon?: string }>;

const MAX_RESULTS = 5;
// Bias suggestions toward Salt Lake City.
const BIAS = { lat: 40.76, lon: -111.89 };
const USER_AGENT = "flockmap/1.0 (school project)";

export function photonLabel(p: PhotonProps): string {
  const streetLine = [p.housenumber, p.street].filter(Boolean).join(" ");
  const parts = [p.name, streetLine, p.city, p.state, p.postcode].filter((s): s is string => Boolean(s));
  return [...new Set(parts)].join(", ");
}

async function getJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

function photon(query: string, fetchFn: typeof fetch): Attempt<GeocodeResult[]> {
  return {
    name: "photon",
    run: async (signal) => {
      const url =
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}` +
        `&limit=10&lat=${BIAS.lat}&lon=${BIAS.lon}&lang=en`;
      const body = await getJson<PhotonResponse>(await fetchFn(url, { signal }));
      return (body.features ?? [])
        .filter((f) => f.properties?.countrycode?.toUpperCase() === "US" && f.geometry?.coordinates)
        .slice(0, MAX_RESULTS)
        .map((f) => ({
          label: photonLabel(f.properties ?? {}),
          lng: f.geometry!.coordinates![0],
          lat: f.geometry!.coordinates![1],
        }));
    },
  };
}

function nominatim(query: string, fetchFn: typeof fetch): Attempt<GeocodeResult[]> {
  return {
    name: "nominatim",
    run: async (signal) => {
      const url =
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}` +
        `&format=jsonv2&limit=${MAX_RESULTS}&countrycodes=us`;
      const body = await getJson<NominatimResponse>(
        await fetchFn(url, { signal, headers: { "User-Agent": USER_AGENT } }),
      );
      return body
        .filter((r) => r.display_name && r.lat && r.lon)
        .map((r) => ({ label: r.display_name!, lng: Number(r.lon), lat: Number(r.lat) }));
    },
  };
}

export function geocodeAttempts(query: string, fetchFn: typeof fetch = fetch): Attempt<GeocodeResult[]>[] {
  return [photon(query, fetchFn), nominatim(query, fetchFn)];
}
