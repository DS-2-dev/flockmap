"use client";

import { useEffect, useState } from "react";
import { useCameras } from "@/hooks/useCameras";
import { fetchRoute } from "@/lib/api";
import { runSearch, type SearchOutcome } from "@/lib/search";
import type { LngLat, Place, RadiusMiles } from "@/lib/types";
import { parseSearchState, serializeSearchState } from "@/lib/urlState";
import MapView from "./MapView";
import SearchPanel from "./SearchPanel";

// App is client-only (see page.tsx), so reading window here is safe.
const initial = () => parseSearchState(new URLSearchParams(window.location.search));

export default function App() {
  const { cameras, failed, retry } = useCameras();
  const [from, setFrom] = useState<Place | null>(() => initial().from);
  const [to, setTo] = useState<Place | null>(() => initial().to);
  const [radiusMiles, setRadiusMiles] = useState<RadiusMiles>(() => initial().radiusMiles);
  const [focus, setFocus] = useState<LngLat | null>(null);
  const [result, setResult] = useState<{ key: string; outcome: SearchOutcome }>({
    key: "",
    outcome: { mode: "idle" },
  });

  const searchKey = JSON.stringify([from?.lngLat, to?.lngLat, radiusMiles, cameras?.features.length]);
  const searching = cameras !== null && (from !== null || to !== null) && result.key !== searchKey;

  useEffect(() => {
    const qs = serializeSearchState({ from, to, radiusMiles });
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [from, to, radiusMiles]);

  useEffect(() => {
    if (!cameras) return;
    let cancelled = false;
    runSearch({ from, to, radiusMiles, cameras, getRoute: fetchRoute }).then((outcome) => {
      if (!cancelled) setResult({ key: searchKey, outcome });
    });
    return () => {
      cancelled = true;
    };
  }, [from, to, radiusMiles, cameras, searchKey]);

  return (
    <main className="relative h-dvh w-full">
      <MapView cameras={cameras} outcome={result.outcome} focus={focus} />
      <div className="absolute left-0 right-0 top-0 p-4 sm:right-auto sm:w-96">
        <SearchPanel
          from={from}
          to={to}
          radiusMiles={radiusMiles}
          onFromChange={setFrom}
          onToChange={setTo}
          onRadiusChange={setRadiusMiles}
          outcome={result.outcome}
          searching={searching}
          camerasFailed={failed}
          onRetry={retry}
          onSelectCamera={(lngLat) => setFocus([...lngLat] as LngLat)}
        />
      </div>
    </main>
  );
}
