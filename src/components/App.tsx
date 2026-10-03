"use client";

import { useEffect, useMemo, useState } from "react";
import { useCameras } from "@/hooks/useCameras";
import { fetchRoute, type ApiResult } from "@/lib/api";
import { formatLngLat } from "@/lib/lngLat";
import { computeOutcome } from "@/lib/search";
import type { LngLat, Place, RadiusMiles, RouteResult } from "@/lib/types";
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

  return (
    <main className="relative h-dvh w-full">
      <MapView cameras={cameras} outcome={outcome} focus={focus} />
      <div className="absolute left-0 right-0 top-0 p-4 sm:right-auto sm:w-96">
        <SearchPanel
          from={from}
          to={to}
          radiusMiles={radiusMiles}
          onFromChange={setFrom}
          onToChange={setTo}
          onRadiusChange={setRadiusMiles}
          outcome={outcome}
          camerasFailed={failed}
          onRetry={retry}
          onSelectCamera={(lngLat) => setFocus([...lngLat] as LngLat)}
        />
      </div>
    </main>
  );
}
