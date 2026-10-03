import { useCallback, useEffect, useState } from "react";
import type { CameraCollection } from "@/lib/types";

async function loadGeoJSON(url: string): Promise<CameraCollection | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as CameraCollection;
  } catch {
    return null;
  }
}

// Utah first so the default view fills quickly, then the full US set replaces it.
export function useCameras() {
  const [cameras, setCameras] = useState<CameraCollection | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const utah = await loadGeoJSON("/data/utah.geojson");
      if (cancelled) return;
      if (utah) setCameras(utah);
      const us = await loadGeoJSON("/data/us.geojson");
      if (cancelled) return;
      if (us) setCameras(us);
      else if (!utah) setFailed(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((n) => n + 1);
  }, []);

  return { cameras, failed, retry };
}
