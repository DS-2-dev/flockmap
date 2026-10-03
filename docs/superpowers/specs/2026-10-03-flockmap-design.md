# FlockMap — Design Spec

Date: 2026-10-03
Status: Approved in brainstorming, pending written-spec review

## Purpose

Interactive web map of Flock Safety ALPR cameras across the US, focused on Utah,
deployed to a public Vercel URL as part of a school project. Users can:

1. Browse all known Flock cameras on a map.
2. Enter a start and destination address and see which cameras lie on the driving route.
3. Enter a single address and see cameras within a radius.

Visual styling will be refined by the owner later; v1 must keep UI components thin so
restyling cannot break logic.

## Non-goals (v1)

- User accounts or saved searches (beyond shareable URLs)
- Submitting or editing cameras (link out to DeFlock instead)
- Turn-by-turn directions
- Self-hosted routing server
- End-to-end browser tests

## Stack

- Next.js (App Router) + React + TypeScript + Tailwind CSS
- MapLibre GL JS with OpenFreeMap basemap tiles (free, no key)
- Turf.js for geometry
- Vitest for unit tests
- Hosted on Vercel; data refresh via GitHub Actions

## Data source

Camera locations come from OpenStreetMap (crowdsourced largely via DeFlock), pulled
from the Overpass API. Matching tags:

- `surveillance:type=ALPR`
- AND (`manufacturer=Flock Safety` OR `manufacturer:wikidata=Q108485435`)

Nodes only. Areas: `ISO3166-1=US` for the national file, `ISO3166-2=US-UT` for Utah.

## Architecture

```
GitHub Action (daily cron)
  └─ scripts/fetch-cameras.ts ─▶ Overpass API
       └─ public/data/utah.geojson + public/data/us.geojson ─▶ commit if changed ─▶ Vercel redeploy

Browser
  ├─ Map            MapLibre + OpenFreeMap basemap, initial view = Utah
  ├─ CameraLayer    utah.geojson first, then us.geojson; clustered GeoJSON source
  ├─ SearchPanel    inputs A and B with autocomplete
  ├─ RouteLayer     route line, radius circle, highlighted cameras
  └─ ResultsList    count + list of matching cameras; click to fly to camera

Next.js API routes (edge-cached)
  ├─ /api/geocode   Photon ─▶ fallback Nominatim
  └─ /api/route     OpenRouteService ─▶ fallback OSRM public ─▶ fallback Valhalla (FOSSGIS)
```

## Units

### `scripts/fetch-cameras.ts`
- Queries Overpass (timeout 300 s), converts to GeoJSON FeatureCollection of Points.
- Feature properties kept: `id` (OSM node id), `direction` (number or null),
  `operator` (string or null).
- Writes `utah.geojson` (Utah subset) and `us.geojson` (all US).
- Parsing logic lives in a pure function `overpassToGeoJSON(json)` so it can be tested
  against a saved fixture.
- On Overpass failure: exits non-zero, existing files untouched (Action fails, site keeps
  last good data).

### `lib/geo.ts` (pure, no I/O)
- `camerasNearRoute(route: LineString, cameras: FeatureCollection, meters = 50)`:
  prefilter by route bbox expanded by `meters`, then keep cameras with
  point-to-line distance ≤ `meters`; return sorted by distance along route.
- `camerasNearPoint(point, cameras, radiusMiles = 1)`: cameras within radius, sorted by
  distance.

### `lib/geocode.ts`, `lib/routing.ts`
- Thin client wrappers calling `/api/geocode` and `/api/route`; return typed results or a
  typed error.

### `/api/geocode`
- `GET ?q=<text>` → up to 5 suggestions `{label, lng, lat}`, US-biased toward Utah.
- Tries Photon, falls back to Nominatim on error or timeout (3 s per provider).
- Response header `Cache-Control: s-maxage=86400`.

### `/api/route`
- `GET ?from=lng,lat&to=lng,lat` → `{ geometry: LineString, distanceMeters, durationSeconds, provider }`.
- Provider chain: OpenRouteService (key in `ORS_API_KEY` env var) → OSRM public demo →
  Valhalla FOSSGIS. Each attempt has a 5 s timeout; move to next on error, timeout or 429.
- Coordinates rounded to 5 decimals before calling, so cache keys repeat.
- `Cache-Control: s-maxage=86400`.
- All providers fail → 503 with `{ error: "routing_unavailable" }`.

### UI components
- Render only; all logic in `lib/`.
- `SearchPanel`: autocomplete debounced 300 ms. Only A filled → radius mode
  (½ / 1 / 5 mi selector, default 1). A and B filled → route mode.
- `CameraLayer`: clusters with counts when zoomed out; individual pins when zoomed in;
  pins with `direction` show a view-cone. Matching cameras use a highlight color.
- `ResultsList`: "N Flock cameras on this route" / "within X mi"; click to fly to a camera.
- Popup on camera click: operator, direction, link to the OSM node.

## Data flow

1. Page load: map centered on Utah; fetch `utah.geojson`, render; then fetch
   `us.geojson` in background and swap the source data.
2. Route mode: geocode A and B → `/api/route` → `camerasNearRoute` → draw route, highlight
   cameras, fit bounds, fill list. Loading animation on route while pending.
3. Radius mode: geocode A → `camerasNearPoint` → draw circle, highlight, list. No API call
   beyond geocoding.
4. Search state stored in URL (`?from=lng,lat&to=lng,lat&r=1`) so links are shareable;
   loading a URL with params replays the search.

## Error handling

All errors render as inline messages in the panel; the map stays usable.

- No geocode results: "Couldn't find that address — try adding city/state."
- `/api/route` 503: "Routing service busy — try again in a minute."
- Camera data fetch fails: message + retry button.
- Footer disclaimer: "Camera data is crowdsourced via DeFlock / OpenStreetMap. Not every
  camera is mapped." with link to deflock.me.

## Testing

- Vitest unit tests for `lib/geo.ts` with fixtures (e.g. camera 30 m from line included,
  80 m excluded; radius boundaries; sort order).
- Vitest test for `overpassToGeoJSON` against saved Overpass sample.
- Vitest test for `/api/route` fallback order with mocked fetch (first provider fails →
  second used; all fail → 503).
- Manual smoke test before deploy: Ogden → Salt Lake City route, single Utah address.

## Configuration

- `ORS_API_KEY` — Vercel env var and local `.env.local` (gitignored).
- GitHub Action needs repo write permission to commit refreshed data.
