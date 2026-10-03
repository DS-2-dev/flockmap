import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, MapLayerMouseEvent } from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import type { LngLat } from "./types";

export const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
export const UTAH_CENTER: LngLat = [-111.6, 39.5];
export const SOURCE = { cameras: "cameras", matched: "matched", route: "route", area: "area" } as const;

export const COLORS = {
  camera: "#e11d48",
  cluster: "#be123c",
  matched: "#facc15",
  route: "#2563eb",
};

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };
const CONE_IMAGE = "camera-cone";
const POINT_LAYERS = ["camera-points", "matched-points"];

// A 60° wedge pointing up; rotated per camera by its `direction`.
function coneImage(size = 64) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  ctx.fillStyle = "rgba(225, 29, 72, 0.35)";
  ctx.beginPath();
  ctx.moveTo(c, c);
  ctx.arc(c, c, c, -Math.PI / 2 - Math.PI / 6, -Math.PI / 2 + Math.PI / 6);
  ctx.closePath();
  ctx.fill();
  return { width: size, height: size, data: ctx.getImageData(0, 0, size, size).data };
}

function popupContent(props: Record<string, unknown>): HTMLElement {
  const root = document.createElement("div");
  root.className = "text-sm";
  const rows: [string, string][] = [
    ["Operator", typeof props.operator === "string" && props.operator !== "null" ? props.operator : "Unknown"],
    ["Facing", typeof props.direction === "number" ? `${Math.round(props.direction)}°` : "Unknown"],
  ];
  for (const [label, value] of rows) {
    const row = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = `${label}: `;
    row.append(strong, document.createTextNode(value));
    root.append(row);
  }
  const link = document.createElement("a");
  link.href = `https://www.openstreetmap.org/node/${Number(props.id)}`;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "View on OpenStreetMap";
  link.className = "underline";
  root.append(link);
  return root;
}

export function addMapLayers(map: maplibregl.Map): void {
  map.addImage(CONE_IMAGE, coneImage());

  map.addSource(SOURCE.area, { type: "geojson", data: EMPTY });
  map.addSource(SOURCE.route, { type: "geojson", data: EMPTY });
  map.addSource(SOURCE.cameras, {
    type: "geojson",
    data: EMPTY,
    cluster: true,
    clusterMaxZoom: 12,
    clusterRadius: 50,
  });
  map.addSource(SOURCE.matched, { type: "geojson", data: EMPTY });

  map.addLayer({
    id: "area-fill",
    type: "fill",
    source: SOURCE.area,
    paint: { "fill-color": COLORS.route, "fill-opacity": 0.08 },
  });
  map.addLayer({
    id: "area-line",
    type: "line",
    source: SOURCE.area,
    paint: { "line-color": COLORS.route, "line-width": 2, "line-dasharray": [2, 2] },
  });
  map.addLayer({
    id: "route-casing",
    type: "line",
    source: SOURCE.route,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#ffffff", "line-width": 9 },
  });
  map.addLayer({
    id: "route-line",
    type: "line",
    source: SOURCE.route,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": COLORS.route, "line-width": 5 },
  });
  map.addLayer({
    id: "clusters",
    type: "circle",
    source: SOURCE.cameras,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": COLORS.cluster,
      "circle-opacity": 0.85,
      "circle-radius": ["step", ["get", "point_count"], 14, 50, 18, 500, 24, 5000, 30],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2,
    },
  });
  map.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: SOURCE.cameras,
    filter: ["has", "point_count"],
    layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Bold"], "text-size": 12 },
    paint: { "text-color": "#ffffff" },
  });
  map.addLayer({
    id: "camera-cones",
    type: "symbol",
    source: SOURCE.cameras,
    minzoom: 13,
    filter: ["all", ["!", ["has", "point_count"]], ["==", ["typeof", ["get", "direction"]], "number"]],
    layout: {
      "icon-image": CONE_IMAGE,
      "icon-rotate": ["get", "direction"],
      "icon-rotation-alignment": "map",
      "icon-allow-overlap": true,
      "icon-size": 0.6,
    },
  });
  map.addLayer({
    id: "camera-points",
    type: "circle",
    source: SOURCE.cameras,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": COLORS.camera,
      "circle-radius": 5,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1.5,
    },
  });
  map.addLayer({
    id: "matched-points",
    type: "circle",
    source: SOURCE.matched,
    paint: {
      "circle-color": COLORS.matched,
      "circle-radius": 7,
      "circle-stroke-color": "#000000",
      "circle-stroke-width": 2,
    },
  });

  map.on("click", "clusters", async (e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature) return;
    const source = map.getSource(SOURCE.cameras) as GeoJSONSource;
    const zoom = await source.getClusterExpansionZoom(feature.properties.cluster_id);
    map.easeTo({ center: (feature.geometry as Point).coordinates as LngLat, zoom });
  });

  for (const layer of POINT_LAYERS) {
    map.on("click", layer, (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;
      new maplibregl.Popup({ offset: 10 })
        .setLngLat((feature.geometry as Point).coordinates as LngLat)
        .setDOMContent(popupContent(feature.properties))
        .addTo(map);
    });
  }

  for (const layer of ["clusters", ...POINT_LAYERS]) {
    map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
  }
}
