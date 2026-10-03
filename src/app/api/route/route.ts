import type { NextRequest } from "next/server";
import { parseLngLat } from "@/lib/lngLat";
import { tryInOrder } from "@/lib/server/fallback";
import { routeAttempts } from "@/lib/server/routeProviders";
import type { RouteResult } from "@/lib/types";

export const maxDuration = 30;

const CACHE_HEADERS = { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" };
const PROVIDER_TIMEOUT_MS = 5000;

export async function GET(request: NextRequest) {
  const from = parseLngLat(request.nextUrl.searchParams.get("from"));
  const to = parseLngLat(request.nextUrl.searchParams.get("to"));
  if (!from || !to) return Response.json({ error: "bad_request" }, { status: 400 });

  try {
    const { value, provider } = await tryInOrder(
      routeAttempts(from, to, process.env.ORS_API_KEY),
      PROVIDER_TIMEOUT_MS,
    );
    const body: RouteResult = { ...value, provider };
    return Response.json(body, { headers: CACHE_HEADERS });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "routing_unavailable" }, { status: 503 });
  }
}
