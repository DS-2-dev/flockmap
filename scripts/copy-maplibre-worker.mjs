// MapLibre v6 loads its web worker from a URL next to its own module file, which
// doesn't exist once Next bundles it. Serve the worker (and the shared chunk it
// imports) from public/ instead; MapView points setWorkerUrl at it.
import { copyFile, mkdir } from "node:fs/promises";

const FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];
await mkdir("public/maplibre", { recursive: true });
for (const file of FILES) {
  await copyFile(`node_modules/maplibre-gl/dist/${file}`, `public/maplibre/${file}`);
}
