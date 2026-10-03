"use client";

import { bbox, circle } from "@turf/turf";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection } from "geojson";
import { useEffect, useRef, useState } from "react";
import { addMapLayers, SOURCE, STYLE_URL, UTAH_CENTER } from "@/lib/mapLayers";
import type { SearchOutcome } from "@/lib/search";
import type { CameraCollection, LngLat } from "@/lib/types";

type MapViewProps = { cameras: CameraCollection | null; outcome: SearchOutcome; focus: LngLat | null };

// See scripts/copy-maplibre-worker.mjs.
maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };
// On phones the search panel covers the top ~60% of the map (see SearchPanel max-h).
function fitPadding(map: maplibregl.Map) {
  const { clientWidth, clientHeight } = map.getContainer();
  const top = clientWidth < 640 ? Math.round(clientHeight * 0.6) + 24 : 60;
  return { top, bottom: 60, left: 60, right: 60 };
}

export default function MapView({ cameras, outcome, focus }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current!,
      style: STYLE_URL,
      center: UTAH_CENTER,
      zoom: 6,
    });
    map.addControl(new maplibregl.NavigationControl(), "bottom-right");
    map.addControl(new maplibregl.GeolocateControl({}), "bottom-right");
    map.on("load", () => {
      addMapLayers(map);
      setLoaded(true);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      setLoaded(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map || !cameras) return;
    (map.getSource(SOURCE.cameras) as GeoJSONSource).setData(cameras);
  }, [loaded, cameras]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    const set = (id: string, data: FeatureCollection) => (map.getSource(id) as GeoJSONSource).setData(data);

    const matched: FeatureCollection =
      outcome.mode === "route" || outcome.mode === "radius"
        ? { type: "FeatureCollection", features: outcome.matches.map((m) => m.camera) }
        : EMPTY;
    set(SOURCE.matched, matched);

    if (outcome.mode === "route") {
      const routeFc: FeatureCollection = {
        type: "FeatureCollection",
        features: [{ type: "Feature", geometry: outcome.route.geometry, properties: {} }],
      };
      set(SOURCE.route, routeFc);
      set(SOURCE.area, EMPTY);
      map.fitBounds(bbox(routeFc) as [number, number, number, number], { padding: fitPadding(map) });
    } else if (outcome.mode === "radius") {
      const area = circle(outcome.center, outcome.radiusMiles, { units: "miles", steps: 64 });
      set(SOURCE.route, EMPTY);
      set(SOURCE.area, { type: "FeatureCollection", features: [area] });
      map.fitBounds(bbox(area) as [number, number, number, number], { padding: fitPadding(map) });
    } else {
      set(SOURCE.route, EMPTY);
      set(SOURCE.area, EMPTY);
    }
  }, [loaded, outcome]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map || !focus) return;
    map.flyTo({ center: focus, zoom: 16 });
  }, [loaded, focus]);

  return <div ref={containerRef} className="h-full w-full" />;
}
