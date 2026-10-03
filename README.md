# ALPR Atlas

Interactive map of Flock Safety license plate cameras across the US (Utah-first), with:

- **Route check:** enter a start and destination to see which cameras are along the drive.
- **Address check:** enter one address to see cameras within ½, 1 or 5 miles.
- **Shareable links:** every search is saved in the URL.

Camera data is crowdsourced via [DeFlock](https://deflock.me) / OpenStreetMap and refreshed daily. Not every camera is mapped.

## Run locally

```bash
npm install
cp .env.example .env.local   # optionally add ORS_API_KEY
npm run dev                  # http://localhost:3000 (map at /map)
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm test` | Unit tests (Vitest) |
| `npm run fetch-cameras` | Re-download camera data from Overpass into `public/data/` |
| `npm run build` | Production build |

`dev` and `build` first copy MapLibre's web worker into `public/maplibre/` (see `scripts/copy-maplibre-worker.mjs`).

## Deploy (Vercel)

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project → Import** the repo. Framework preset: Next.js.
3. **Settings → Environment Variables:** add `NEXT_PUBLIC_UGRC_API_KEY` (a UGRC *browser* key whose URL pattern matches the live site; see `.env.example`) and, optionally, `ORS_API_KEY`. Redeploy after adding them.
4. Deploy. Every push to `main` redeploys.

The GitHub Action `.github/workflows/refresh-cameras.yml` refreshes camera data daily and commits it, which triggers a redeploy. Run it manually from the repo's **Actions** tab if needed.

## How it works

- `scripts/fetch-cameras.ts` queries Overpass for `surveillance:type=ALPR` + Flock Safety nodes and writes `public/data/us.geojson` and `utah.geojson`.
- The map loads Utah first, then the full US set, clustered with MapLibre.
- Address search: Utah's UGRC geocoder (called from the browser when `NEXT_PUBLIC_UGRC_API_KEY` is set) for exact street addresses, plus `/api/geocode` (Photon → Nominatim, with the US Census geocoder added for street addresses) and `/api/route` (OpenRouteService → OSRM → Valhalla) fall back automatically and are cached at Vercel's edge for 24 h.
- Cameras within 50 m of the route line count as "on the route".

## Data & services

Map tiles © OpenFreeMap / OpenMapTiles, data © OpenStreetMap contributors. Geocoding by Photon (Komoot) and Nominatim. Routing by OpenRouteService, OSRM and Valhalla (FOSSGIS).
