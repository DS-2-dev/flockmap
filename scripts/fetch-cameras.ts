import { mkdir, writeFile } from "node:fs/promises";
import { isInUtah, overpassToGeoJSON, type OverpassResponse } from "../src/lib/overpass";
import type { CameraCollection, LngLat } from "../src/lib/types";

// Public Overpass servers are often busy; try each in turn.
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const ROUNDS = 3;
const RETRY_DELAY_MS = 30_000;
const QUERY = `
[out:json][timeout:300];
area["ISO3166-1"="US"][admin_level=2]->.us;
(
  node["surveillance:type"="ALPR"]["manufacturer"="Flock Safety"](area.us);
  node["surveillance:type"="ALPR"]["manufacturer:wikidata"="Q108485435"](area.us);
);
out body;
`;
// Overpass sometimes returns a truncated result on timeout; refuse to overwrite good data with it.
const MIN_EXPECTED = 1000;

async function queryOverpass(endpoint: string): Promise<OverpassResponse> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "flockmap/1.0 (school project)",
    },
    body: new URLSearchParams({ data: QUERY }),
    signal: AbortSignal.timeout(330_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as OverpassResponse;
}

async function fetchWithRetries(): Promise<OverpassResponse> {
  for (let round = 1; round <= ROUNDS; round++) {
    for (const endpoint of ENDPOINTS) {
      try {
        return await queryOverpass(endpoint);
      } catch (err) {
        console.warn(`${endpoint} failed (round ${round}): ${err instanceof Error ? err.message : err}`);
      }
    }
    if (round < ROUNDS) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  }
  throw new Error("All Overpass servers failed");
}

async function main() {
  const us = overpassToGeoJSON(await fetchWithRetries());
  if (us.features.length < MIN_EXPECTED) {
    throw new Error(`Only ${us.features.length} cameras returned; refusing to overwrite data`);
  }
  const utah: CameraCollection = {
    type: "FeatureCollection",
    features: us.features.filter((f) => isInUtah(f.geometry.coordinates as LngLat)),
  };

  await mkdir("public/data", { recursive: true });
  await writeFile("public/data/us.geojson", JSON.stringify(us));
  await writeFile("public/data/utah.geojson", JSON.stringify(utah));
  console.log(`Wrote ${us.features.length} US cameras, ${utah.features.length} Utah cameras`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
