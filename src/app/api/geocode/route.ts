import type { NextRequest } from "next/server";
import { tryInOrder } from "@/lib/server/fallback";
import { geocodeAttempts } from "@/lib/server/geocodeProviders";

const CACHE_HEADERS = { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" };
const PROVIDER_TIMEOUT_MS = 3000;
const MIN_QUERY_LENGTH = 3;

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (query.length < MIN_QUERY_LENGTH) return Response.json([], { headers: CACHE_HEADERS });

  try {
    const { value } = await tryInOrder(geocodeAttempts(query), PROVIDER_TIMEOUT_MS);
    return Response.json(value, { headers: CACHE_HEADERS });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "geocoding_unavailable" }, { status: 503 });
  }
}
