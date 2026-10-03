import type { NextRequest } from "next/server";
import { tryInOrder } from "@/lib/server/fallback";
import { censusAddresses, geocodeAttempts, looksLikeStreetAddress } from "@/lib/server/geocodeProviders";
import type { GeocodeResult } from "@/lib/types";
import { checkGeocodeQuery } from "@/lib/server/limits";

const CACHE_HEADERS = { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" };
const PROVIDER_TIMEOUT_MS = 3000;
const MIN_QUERY_LENGTH = 3;
const MAX_RESULTS = 6;

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (query.length < MIN_QUERY_LENGTH) return Response.json([], { headers: CACHE_HEADERS });
  if (!checkGeocodeQuery(query)) return Response.json({ error: "query_too_long" }, { status: 400 });

  // Street addresses also go to the Census geocoder (in parallel); its exact house
  // matches come first. If it fails or times out, Photon's results stand alone.
  const census: Promise<GeocodeResult[]> = looksLikeStreetAddress(query)
    ? censusAddresses(query, AbortSignal.timeout(PROVIDER_TIMEOUT_MS)).catch((err) => {
        console.error(err);
        return [];
      })
    : Promise.resolve([]);

  const [suggested, exact] = await Promise.all([
    tryInOrder(geocodeAttempts(query), PROVIDER_TIMEOUT_MS).then(
      ({ value }) => value,
      (err) => {
        console.error(err);
        return null;
      },
    ),
    census,
  ]);
  if (!suggested && exact.length === 0) {
    return Response.json({ error: "geocoding_unavailable" }, { status: 503 });
  }
  return Response.json([...exact, ...(suggested ?? [])].slice(0, MAX_RESULTS), { headers: CACHE_HEADERS });
}
