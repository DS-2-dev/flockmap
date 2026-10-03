"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { COLLAGE_SHOTS, collageSrc, initialCollage, swapTile } from "@/lib/collage";

const TILES = 9;
const SWAP_MS = 1500;

// Grid of CCTV stills (one per shot of assets/collage-source.gif); every SWAP_MS one tile rotates to the next queued shot.
export default function Collage() {
  const [collage, setCollage] = useState(() => initialCollage(TILES, COLLAGE_SHOTS));

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Warm the cache so swapped-in shots appear without a blank frame.
    for (let shot = TILES; shot < COLLAGE_SHOTS; shot++) new window.Image().src = collageSrc(shot);
    const timer = setInterval(() => setCollage((current) => swapTile(current)), SWAP_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div aria-hidden="true" className="grid max-w-2xl grid-cols-3 gap-1 xl:max-w-none">
      {collage.showing.map((shot, tile) => (
        <Image
          key={tile}
          src={collageSrc(shot)}
          alt=""
          width={480}
          height={271}
          unoptimized
          priority
          className="aspect-video w-full object-cover"
        />
      ))}
    </div>
  );
}
