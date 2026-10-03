"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCameras } from "@/hooks/useCameras";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { fetchRoute, type ApiResult } from "@/lib/api";
import { formatLngLat } from "@/lib/lngLat";
import { computeOutcome } from "@/lib/search";
import type { Detent } from "@/lib/sheet";
import type { Camera, LngLat, Place, RadiusMiles, RouteResult } from "@/lib/types";
import { parseSearchState, serializeSearchState } from "@/lib/urlState";
import MapView from "./MapView";
import SearchPanel from "./SearchPanel";

// App is client-only (see page.tsx), so reading window here is safe.
const initial = () => parseSearchState(new URLSearchParams(window.location.search));

export default function App() {
  const { cameras, scope, failed, retry } = useCameras();
  const [from, setFrom] = useState<Place | null>(() => initial().from);
  const [to, setTo] = useState<Place | null>(() => initial().to);
  const [radiusMiles, setRadiusMiles] = useState<RadiusMiles>(() => initial().radiusMiles);
  const [focus, setFocus] = useState<LngLat | null>(null);
  const [selected, setSelected] = useState<Camera | null>(null);
  const [detent, setDetent] = useState<Detent>(() => (initial().from || initial().to ? "half" : "peek"));
  const [sheetHeight, setSheetHeight] = useState(0);
  const desktop = useMediaQuery("(min-width: 640px)");
  const [fetched, setFetched] = useState<{ key: string; result: ApiResult<RouteResult> } | null>(null);

  // The route depends only on the two places, so swapping camera data never refetches it.
  const routeKey = from && to ? `${formatLngLat(from.lngLat)};${formatLngLat(to.lngLat)}` : null;
  const route = fetched && fetched.key === routeKey ? fetched.result : null;

  useEffect(() => {
    if (!from || !to || !routeKey) return;
    const controller = new AbortController();
    fetchRoute(from.lngLat, to.lngLat, controller.signal).then((result) => {
      if (!controller.signal.aborted) setFetched({ key: routeKey, result });
    });
    return () => controller.abort();
  }, [from, to, routeKey]);

  const outcome = useMemo(
    () => computeOutcome({ from, to, radiusMiles, cameras, scope, route }),
    [from, to, radiusMiles, cameras, scope, route],
  );

  useEffect(() => {
    const qs = serializeSearchState({ from, to, radiusMiles });
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [from, to, radiusMiles]);

  // Picking a place shows results at half height so the map stays visible.
  const changePlace = (set: (p: Place | null) => void) => (place: Place | null) => {
    set(place);
    setSelected(null);
    if (place) setDetent("half");
  };

  const selectCamera = useCallback((camera: Camera | null) => {
    setSelected(camera);
    if (!camera) return;
    setFocus([...(camera.geometry.coordinates as LngLat)] as LngLat);
    setDetent("half");
  }, []);

  // Keep fitted results clear of the floating card (desktop) or the sheet (phone).
  const padding = desktop
    ? { top: 0, bottom: 0, left: 400, right: 56 }
    : { top: 56, bottom: Math.min(sheetHeight, window.innerHeight * 0.6), left: 0, right: 0 };

  return (
    // Sized to the visible area; Safari's bars are tinted to match the map (map/layout.tsx).
    <main className="relative h-dvh w-full overflow-hidden bg-[#f2f3f0] dark:bg-[#0c0c0c]">
      <MapView
        cameras={cameras}
        outcome={outcome}
        focus={focus}
        selected={selected}
        onSelectCamera={selectCamera}
        padding={padding}
      />
      <Link
        href="/"
        aria-label="ALPR Atlas home"
        className="glass absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] grid size-11 place-items-center rounded-2xl sm:hidden"
      >
        <Image src="/logo.png" alt="" width={512} height={512} className="size-7 dark:invert" />
      </Link>
      <SearchPanel
        from={from}
        to={to}
        radiusMiles={radiusMiles}
        onFromChange={changePlace(setFrom)}
        onToChange={changePlace(setTo)}
        onRadiusChange={setRadiusMiles}
        outcome={outcome}
        camerasFailed={failed}
        onRetry={retry}
        selected={selected}
        onSelectCamera={selectCamera}
        detent={detent}
        onDetentChange={setDetent}
        onSheetHeightChange={setSheetHeight}
      />
    </main>
  );
}
