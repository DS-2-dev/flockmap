"use client";

import { bbox, circle } from "@turf/turf";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection } from "geojson";
import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { addMapLayers, bindMapInteractions, dimOtherCameras, SOURCE, STYLE_URLS, UTAH_CENTER } from "@/lib/mapLayers";
import type { SearchOutcome } from "@/lib/search";
import type { Camera, CameraCollection, LngLat } from "@/lib/types";

type MapViewProps = {
  cameras: CameraCollection | null;
  outcome: SearchOutcome;
  focus: LngLat | null;
  selected: Camera | null;
  onSelectCamera: (camera: Camera | null) => void;
  /** Map padding (px) for space covered by the search sheet/card, so fits land in the open area. */
  padding: { top: number; bottom: number; left: number; right: number };
};

// See scripts/copy-maplibre-worker.mjs.
maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };
const FIT_MARGIN = 48;

// Dropped pin for the searched place (blue like the radius and route, so it doesn't read as a camera).
function pinElement() {
  const el = document.createElement("div");
  el.innerHTML =
    '<svg class="place-pin" viewBox="0 0 32 42" width="32" height="42" aria-hidden="true">' +
    '<path d="M16 40.5S29.5 26.6 29.5 16a13.5 13.5 0 0 0-27 0C2.5 26.6 16 40.5 16 40.5Z" fill="#0a84ff" stroke="#fff" stroke-width="2"/>' +
    '<circle cx="16" cy="16" r="5" fill="#fff"/></svg>';
  return el;
}

// Start of a route: a small ringed dot.
function startElement() {
  const el = document.createElement("div");
  el.className = "place-start";
  return el;
}

export default function MapView({ cameras, outcome, focus, selected, onSelectCamera, padding }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const geolocateRef = useRef<maplibregl.GeolocateControl | null>(null);
  const onSelectRef = useRef(onSelectCamera);
  // What the map was last fitted to, so new matches alone don't move the view.
  const fittedRef = useRef<string | null>(null);
  // Pins for the searched place(s), keyed by position so they only drop when the place changes.
  const pinsRef = useRef<{ key: string; markers: maplibregl.Marker[] }>({ key: "", markers: [] });
  const [loaded, setLoaded] = useState(false);
  const [bearing, setBearing] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const dark = useMediaQuery("(prefers-color-scheme: dark)");

  useEffect(() => {
    onSelectRef.current = onSelectCamera;
  }, [onSelectCamera]);

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current!,
      style: STYLE_URLS[window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"],
      center: UTAH_CENTER,
      zoom: 6,
      attributionControl: false,
    });
    // The license needs attribution on the map; keep it to a small, faint ⓘ (see globals.css).
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "top-right");
    // Hidden control that draws the blue location dot; our own button triggers it.
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    });
    map.addControl(geolocate, "top-left");
    geolocate.on("error", (e) =>
      setNotice(
        e.code === 1 // PERMISSION_DENIED
          ? "Location is blocked. Allow it for this site in Settings › Apps › Safari › Location."
          : "Couldn't get your location. Try again in a moment.",
      ),
    );
    geolocateRef.current = geolocate;

    bindMapInteractions(map, (camera) => onSelectRef.current(camera));
    map.on("style.load", () => {
      addMapLayers(map);
      setLoaded(true);
    });
    // Compact attribution starts expanded until the first interaction; start it collapsed.
    map.once("load", () => {
      containerRef.current
        ?.querySelector(".maplibregl-ctrl-attrib")
        ?.classList.remove("maplibregl-compact-show");
    });
    map.on("rotate", () => setBearing(map.getBearing()));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      setLoaded(false);
    };
  }, []);

  // Swap basemap with the device theme; style.load re-adds our layers.
  const styleUrl = STYLE_URLS[dark ? "dark" : "light"];
  const styleRef = useRef(styleUrl);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || styleRef.current === styleUrl) return;
    styleRef.current = styleUrl;
    setLoaded(false);
    map.setStyle(styleUrl);
  }, [styleUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map || !cameras) return;
    (map.getSource(SOURCE.cameras) as GeoJSONSource).setData(cameras);
  }, [loaded, cameras]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    (map.getSource(SOURCE.selected) as GeoJSONSource).setData(
      selected ? { type: "FeatureCollection", features: [selected] } : EMPTY,
    );
  }, [loaded, selected]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    const set = (id: string, data: FeatureCollection) => (map.getSource(id) as GeoJSONSource).setData(data);
    const fitPadding = {
      top: padding.top + FIT_MARGIN,
      bottom: padding.bottom + FIT_MARGIN,
      left: padding.left + FIT_MARGIN,
      right: padding.right + FIT_MARGIN,
    };

    const matched: FeatureCollection =
      outcome.mode === "route" || outcome.mode === "radius"
        ? { type: "FeatureCollection", features: outcome.matches.map((m) => m.camera) }
        : EMPTY;
    set(SOURCE.matched, matched);
    dimOtherCameras(map, outcome.mode === "route" || outcome.mode === "radius");

    if (outcome.mode === "route") {
      const routeFc: FeatureCollection = {
        type: "FeatureCollection",
        features: [{ type: "Feature", geometry: outcome.route.geometry, properties: {} }],
      };
      set(SOURCE.route, routeFc);
      set(SOURCE.area, EMPTY);
      const target = JSON.stringify(bbox(routeFc));
      if (fittedRef.current !== target) {
        fittedRef.current = target;
        map.fitBounds(bbox(routeFc) as [number, number, number, number], { padding: fitPadding, maxZoom: 16 });
      }
    } else if (outcome.mode === "radius") {
      const area = circle(outcome.center, outcome.radiusMiles, { units: "miles", steps: 64 });
      set(SOURCE.route, EMPTY);
      set(SOURCE.area, { type: "FeatureCollection", features: [area] });
      const target = JSON.stringify([outcome.center, outcome.radiusMiles]);
      if (fittedRef.current !== target) {
        fittedRef.current = target;
        map.fitBounds(bbox(area) as [number, number, number, number], { padding: fitPadding });
      }
    } else {
      if (outcome.mode === "idle") fittedRef.current = null;
      set(SOURCE.route, EMPTY);
      set(SOURCE.area, EMPTY);
    }

    const coords = outcome.mode === "route" ? outcome.route.geometry.coordinates : null;
    const pins: { at: LngLat; start?: boolean }[] =
      outcome.mode === "radius"
        ? [{ at: outcome.center }]
        : coords && coords.length > 1
          ? [
              { at: coords[0] as LngLat, start: true },
              { at: coords[coords.length - 1] as LngLat },
            ]
          : [];
    const key = JSON.stringify(pins);
    if (pinsRef.current.key !== key) {
      pinsRef.current.markers.forEach((m) => m.remove());
      pinsRef.current = {
        key,
        markers: pins.map(({ at, start }) =>
          new maplibregl.Marker(
            start ? { element: startElement() } : { element: pinElement(), anchor: "bottom" },
          )
            .setLngLat(at)
            .addTo(map),
        ),
      };
    }
    // Padding changes with the sheet height; refitting on every drag would fight the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, outcome]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map || !focus) return;
    map.flyTo({ center: focus, zoom: 16, padding });
    // Same as above: only fly when the focus target changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, focus]);

  // Browsers only share location with https pages (the LAN dev URL is plain http).
  const locate = () => {
    if (!window.isSecureContext || !("geolocation" in navigator)) {
      setNotice("Location needs a secure (https) connection. It works on the live site.");
      return;
    }
    geolocateRef.current?.trigger();
  };

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  return (
    <div className="relative h-full w-full">
      {notice && (
        <div
          role="status"
          className="glass fixed inset-x-16 top-[max(0.75rem,env(safe-area-inset-top))] z-10 rounded-2xl px-4 py-3 text-center text-[14px] text-neutral-900 sm:inset-x-auto sm:left-1/2 sm:w-96 sm:-translate-x-1/2 dark:text-neutral-100"
        >
          {notice}
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] flex flex-col items-center gap-2">
        <div className="glass pointer-events-auto flex flex-col overflow-hidden rounded-2xl">
          <MapButton label="Show my location" onClick={locate}>
            <path d="M12 2 4 20l8-4 8 4z" transform="rotate(45 12 12)" />
          </MapButton>
          <div className="mx-2 h-px bg-black/10 dark:bg-white/15" />
          <MapButton
            label="Reset to north"
            onClick={() => mapRef.current?.easeTo({ bearing: 0, pitch: 0 })}
          >
            <g transform={`rotate(${-bearing} 12 12)`}>
              <path d="M12 3 8 12h8z" className="fill-red-500 stroke-red-500" />
              <path d="M12 21l-4-9h8z" />
            </g>
          </MapButton>
        </div>
      </div>
    </div>
  );
}

function MapButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-11 place-items-center text-neutral-800 active:bg-black/5 dark:text-neutral-100 dark:active:bg-white/10"
    >
      <svg viewBox="0 0 24 24" className="size-5 fill-current stroke-current" strokeWidth={1} strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}
