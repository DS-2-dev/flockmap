"use client";

import { useCameras } from "@/hooks/useCameras";
import MapView from "./MapView";

export default function App() {
  const { cameras } = useCameras();
  return (
    <main className="relative h-dvh w-full">
      <MapView cameras={cameras} outcome={{ mode: "idle" }} focus={null} />
    </main>
  );
}
