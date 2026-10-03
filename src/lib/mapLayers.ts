import type * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, MapLayerMouseEvent } from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import type { Camera, LngLat } from "./types";

// Muted basemaps (closest to Apple Maps); the dark one is used when the device is in dark mode.
export const STYLE_URLS = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};
export const UTAH_CENTER: LngLat = [-111.6, 39.5];
export const SOURCE = {
  cameras: "cameras",
  matched: "matched",
  selected: "selected",
  route: "route",
  area: "area",
} as const;

// iOS system colors.
export const COLORS = {
  camera: "#ff3b30",
  route: "#0a84ff",
  routeCasing: "#0060df",
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
  ctx.fillStyle = "rgba(255, 59, 48, 0.35)";
  ctx.beginPath();
  ctx.moveTo(c, c);
  ctx.arc(c, c, c, -Math.PI / 2 - Math.PI / 6, -Math.PI / 2 + Math.PI / 6);
  ctx.closePath();
  ctx.fill();
  return { width: size, height: size, data: ctx.getImageData(0, 0, size, size).data };
}

const HAS_DIRECTION: maplibregl.ExpressionSpecification = ["==", ["typeof", ["get", "direction"]], "number"];
// View cones grow with zoom so they read from the neighborhood level down to the street.
const CONE_LAYOUT: maplibregl.SymbolLayerSpecification["layout"] = {
  "icon-image": CONE_IMAGE,
  "icon-rotate": ["get", "direction"],
  "icon-rotation-alignment": "map",
  "icon-allow-overlap": true,
  "icon-ignore-placement": true,
  "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.5, 13, 0.7, 17, 1.1],
};

/** Add our sources and layers; called again whenever the basemap style changes. */
export function addMapLayers(map: maplibregl.Map): void {
  if (!map.hasImage(CONE_IMAGE)) map.addImage(CONE_IMAGE, coneImage());

  map.addSource(SOURCE.area, { type: "geojson", data: EMPTY });
  map.addSource(SOURCE.route, { type: "geojson", data: EMPTY });
  map.addSource(SOURCE.cameras, {
    type: "geojson",
    data: EMPTY,
    cluster: true,
    clusterMaxZoom: 10,
    clusterRadius: 50,
  });
  map.addSource(SOURCE.matched, { type: "geojson", data: EMPTY });
  map.addSource(SOURCE.selected, { type: "geojson", data: EMPTY });

  map.addLayer({
    id: "area-fill",
    type: "fill",
    source: SOURCE.area,
    paint: { "fill-color": COLORS.route, "fill-opacity": 0.1 },
  });
  map.addLayer({
    id: "area-line",
    type: "line",
    source: SOURCE.area,
    paint: { "line-color": COLORS.route, "line-width": 1.5, "line-opacity": 0.8 },
  });
  map.addLayer({
    id: "route-casing",
    type: "line",
    source: SOURCE.route,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": COLORS.routeCasing, "line-width": 9 },
  });
  map.addLayer({
    id: "route-line",
    type: "line",
    source: SOURCE.route,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": COLORS.route, "line-width": 6 },
  });
  map.addLayer({
    id: "clusters",
    type: "circle",
    source: SOURCE.cameras,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": COLORS.camera,
      "circle-opacity": 0.9,
      "circle-radius": ["step", ["get", "point_count"], 10, 50, 13, 500, 16, 5000, 19],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1.5,
    },
  });
  map.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: SOURCE.cameras,
    filter: ["has", "point_count"],
    layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Bold"], "text-size": 11 },
    paint: { "text-color": "#ffffff" },
  });
  map.addLayer({
    id: "camera-cones",
    type: "symbol",
    source: SOURCE.cameras,
    minzoom: 11,
    filter: ["all", ["!", ["has", "point_count"]], HAS_DIRECTION],
    layout: CONE_LAYOUT,
  });
  map.addLayer({
    id: "camera-points",
    type: "circle",
    source: SOURCE.cameras,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": COLORS.camera,
      "circle-radius": 4.5,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1.5,
    },
  });
  // Search results always show which way they face (there are few of them).
  map.addLayer({
    id: "matched-cones",
    type: "symbol",
    source: SOURCE.matched,
    filter: HAS_DIRECTION,
    layout: CONE_LAYOUT,
  });
  map.addLayer({
    id: "matched-points",
    type: "circle",
    source: SOURCE.matched,
    paint: {
      "circle-color": COLORS.camera,
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 4, 14, 7],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 10, 1.5, 14, 2.5],
    },
  });

  map.addLayer({
    id: "selected-point",
    type: "circle",
    source: SOURCE.selected,
    paint: {
      "circle-color": COLORS.camera,
      "circle-radius": 11,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 4,
      "circle-stroke-opacity": 0.95,
    },
  });
}

const BACKGROUND_LAYERS = ["clusters", "cluster-count", "camera-points", "camera-cones"];

/** While a search is showing, fade the other cameras so the matches stand out. */
export function dimOtherCameras(map: maplibregl.Map, dim: boolean): void {
  const opacity = dim ? 0.3 : 1;
  for (const id of BACKGROUND_LAYERS) {
    if (!map.getLayer(id)) continue;
    const type = map.getLayer(id)!.type;
    if (type === "circle") {
      map.setPaintProperty(id, "circle-opacity", id === "clusters" ? 0.9 * opacity : opacity);
      map.setPaintProperty(id, "circle-stroke-opacity", opacity);
    } else {
      map.setPaintProperty(id, type === "symbol" && id === "cluster-count" ? "text-opacity" : "icon-opacity", opacity);
    }
  }
}

/** Clicks and cursors; bound once per map since handlers survive style changes. */
export function bindMapInteractions(map: maplibregl.Map, onSelectCamera: (camera: Camera | null) => void): void {
  map.on("click", "clusters", async (e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (!feature) return;
    const source = map.getSource(SOURCE.cameras) as GeoJSONSource;
    const zoom = await source.getClusterExpansionZoom(feature.properties.cluster_id);
    map.easeTo({ center: (feature.geometry as Point).coordinates as LngLat, zoom });
  });

  map.on("click", (e) => {
    const [feature] = map.queryRenderedFeatures(e.point, { layers: POINT_LAYERS.filter((id) => map.getLayer(id)) });
    if (!feature) return onSelectCamera(null);
    const props = feature.properties;
    onSelectCamera({
      type: "Feature",
      geometry: { type: "Point", coordinates: (feature.geometry as Point).coordinates },
      properties: {
        id: Number(props.id),
        direction: typeof props.direction === "number" ? props.direction : null,
        operator: typeof props.operator === "string" && props.operator !== "null" ? props.operator : null,
      },
    });
  });

  for (const layer of ["clusters", ...POINT_LAYERS]) {
    map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
  }
}
