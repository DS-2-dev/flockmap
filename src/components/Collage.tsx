"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { COLLAGE_SHOTS, collageSrc, initialCollage, swapTile } from "@/lib/collage";

const TILES = 12;
const SWAP_MS = 2500;

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
    <div aria-hidden="true" className="grid grid-cols-3 gap-1 lg:grid-cols-6">
      {collage.showing.map((shot, tile) => (
        <Tile key={tile} shot={shot} />
      ))}
    </div>
  );
}

// A new shot fades in over the old one, which is dropped once the fade ends.
function Tile({ shot }: { shot: number }) {
  const [layers, setLayers] = useState([shot]);
  const top = layers[layers.length - 1];
  if (top !== shot) setLayers([top, shot]);

  return (
    <div className="relative aspect-video overflow-hidden">
      {layers.map((s, i) => (
        <Image
          key={s}
          src={collageSrc(s)}
          alt=""
          width={480}
          height={271}
          unoptimized
          priority
          onAnimationEnd={() => setLayers([s])}
          className={`absolute inset-0 size-full object-cover ${
            i > 0 ? "animate-[collage-fade_1s_ease-in-out_both] motion-reduce:animate-none" : ""
          }`}
        />
      ))}
    </div>
  );
}
