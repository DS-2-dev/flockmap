import { useCallback, useEffect, useState } from "react";
import type { CameraScope } from "@/lib/search";
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
  const [data, setData] = useState<{ cameras: CameraCollection; scope: CameraScope } | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const utah = await loadGeoJSON("/data/utah.geojson");
      if (cancelled) return;
      if (utah) setData((d) => (d?.scope === "us" ? d : { cameras: utah, scope: "utah" }));
      const us = await loadGeoJSON("/data/us.geojson");
      if (cancelled) return;
      // Without the US file, searches outside Utah can't be answered, so say so.
      if (us) setData({ cameras: us, scope: "us" });
      else setFailed(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((n) => n + 1);
  }, []);

  return { cameras: data?.cameras ?? null, scope: data?.scope ?? "utah", failed, retry };
}
