import type { LayerSpecification, StyleSpecification } from "maplibre-gl";

// OpenFreeMap's Liberty style (the most detailed one) repainted to look like Apple Maps.
export const BASE_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export type MapTheme = "light" | "dark";

// Land colors also tint Safari's bars (see app/map/layout.tsx and globals.css).
export const LAND = { light: "#f6f4ee", dark: "#212224" } as const;

const PALETTE = {
  light: {
    land: LAND.light,
    residential: "#f2efe8",
    park: "#d3eac2",
    wood: "#cbe5b8",
    ice: "#eef4f6",
    sport: "#d5ebc3",
    hospital: "#f8e1e0",
    school: "#f3ebd8",
    sand: "#f4ecd2",
    water: "#a3d3f5",
    airport: "#ebe8e2",
    runway: "#d9d6cf",
    building: "#ebe7df",
    buildingOutline: "#dedad1",
    minor: "#ffffff",
    minorCasing: "#e1ddd4",
    arterial: "#ffffff",
    arterialCasing: "#d6d1c6",
    primary: "#fff1c2",
    primaryCasing: "#e6d197",
    motorway: "#f8c75c",
    motorwayCasing: "#dda23d",
    path: "#ffffff",
    rail: "#cfcbc4",
    boundary: "#b6b2ab",
    text: "#3a3a3c",
    textStrong: "#1c1c1e",
    textMuted: "#6d6d72",
    waterText: "#4a80b2",
    halo: "#ffffff",
  },
  dark: {
    land: LAND.dark,
    residential: "#242528",
    park: "#1d2f23",
    wood: "#1e3224",
    ice: "#2a2d30",
    sport: "#1f3022",
    hospital: "#302325",
    school: "#2b2923",
    sand: "#2c2a23",
    water: "#112a45",
    airport: "#2a2b2e",
    runway: "#3a3b3f",
    building: "#2c2d31",
    buildingOutline: "#35363a",
    minor: "#3b3c41",
    minorCasing: "#2b2c30",
    arterial: "#4b4c52",
    arterialCasing: "#303135",
    primary: "#5d5748",
    primaryCasing: "#3c382e",
    motorway: "#8d6c33",
    motorwayCasing: "#5e4823",
    path: "#45464b",
    rail: "#3d3e42",
    boundary: "#56575d",
    text: "#c7c7cc",
    textStrong: "#ebebf0",
    textMuted: "#98989f",
    waterText: "#6f9cc6",
    halo: "#1c1c1e",
  },
};
type Palette = Record<keyof (typeof PALETTE)["light"], string>;

// Points of interest beyond the most important ones crowd out the cameras.
const HIDDEN = new Set(["poi_r20", "poi_r7"]);

function roadColor(id: string, p: Palette): string | null {
  const casing = id.endsWith("_casing");
  if (/rail/.test(id)) return p.rail;
  if (/path_pedestrian/.test(id)) return casing ? p.minorCasing : p.path;
  if (/motorway/.test(id)) return casing ? p.motorwayCasing : p.motorway;
  if (/trunk_primary/.test(id)) return casing ? p.primaryCasing : p.primary;
  if (/secondary_tertiary|_link/.test(id)) return casing ? p.arterialCasing : p.arterial;
  if (/minor|service_track|street/.test(id)) return casing ? p.minorCasing : p.minor;
  return null;
}

function fillColor(id: string, p: Palette): string | null {
  if (id === "park") return p.park;
  if (id === "landuse_residential") return p.residential;
  if (/landcover_(wood|grass)/.test(id)) return p.wood;
  if (id === "landcover_ice") return p.ice;
  if (/landuse_(pitch|track|cemetery)/.test(id)) return p.sport;
  if (id === "landuse_hospital") return p.hospital;
  if (id === "landuse_school") return p.school;
  if (id === "landcover_sand") return p.sand;
  if (id === "water") return p.water;
  if (id === "aeroway_fill") return p.airport;
  if (id === "building") return p.building;
  return null;
}

function textColor(id: string, p: Palette): string {
  if (/water/.test(id)) return p.waterText;
  if (/label_(city|town|country)/.test(id)) return p.textStrong;
  if (/poi|airport|highway-name/.test(id)) return p.textMuted;
  return p.text;
}

function paintLayer(layer: LayerSpecification, p: Palette, theme: MapTheme): LayerSpecification {
  const id = layer.id;
  if (HIDDEN.has(id)) return { ...layer, layout: { ...layer.layout, visibility: "none" } } as LayerSpecification;
  switch (layer.type) {
    case "background":
      return { ...layer, paint: { ...layer.paint, "background-color": p.land } };
    case "raster":
      // Shaded relief at low zoom: soft in light mode, off in dark (it's a light image).
      return theme === "dark"
        ? { ...layer, layout: { ...layer.layout, visibility: "none" } }
        : { ...layer, paint: { ...layer.paint, "raster-opacity": 0.35 } };
    case "fill": {
      const color = fillColor(id, p);
      if (!color) return layer;
      const paint: Record<string, unknown> = { ...layer.paint, "fill-color": color };
      if (id === "building") paint["fill-outline-color"] = p.buildingOutline;
      if (id === "park") paint["fill-outline-color"] = color;
      return { ...layer, paint } as LayerSpecification;
    }
    case "fill-extrusion":
      return { ...layer, paint: { ...layer.paint, "fill-extrusion-color": p.building } };
    case "line": {
      let color: string | null = null;
      if (/^(road|tunnel|bridge)_/.test(id)) color = roadColor(id, p);
      else if (/^waterway/.test(id)) color = p.water;
      else if (/^aeroway/.test(id)) color = p.runway;
      else if (/^boundary/.test(id)) color = p.boundary;
      else if (id === "park_outline") color = p.park;
      return color ? { ...layer, paint: { ...layer.paint, "line-color": color } } : layer;
    }
    case "symbol": {
      // Shields and arrows are images; only recolor text labels.
      if (!layer.layout?.["text-field"]) return layer;
      return {
        ...layer,
        paint: { ...layer.paint, "text-color": textColor(id, p), "text-halo-color": p.halo, "text-halo-width": 1.2 },
      };
    }
    default:
      return layer;
  }
}

/** Repaint the base style for the device theme (pass to map.setStyle's transformStyle). */
export function appleStyle(style: StyleSpecification, theme: MapTheme): StyleSpecification {
  const p = PALETTE[theme];
  return { ...style, layers: style.layers.map((l) => paintLayer(l, p, theme)) };
}
