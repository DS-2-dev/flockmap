"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { COLLAGE_SHOTS, collageSrc, nextSwap } from "@/lib/collage";

const TILES = 9;
const SWAP_MS = 1500;

// Grid of CCTV stills (from ggg.gif) where one tile changes every SWAP_MS.
export default function Collage() {
  const [showing, setShowing] = useState(() => Array.from({ length: TILES }, (_, i) => i));

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Warm the cache so swapped-in shots appear without a blank frame.
    for (let shot = TILES; shot < COLLAGE_SHOTS; shot++) new window.Image().src = collageSrc(shot);
    const timer = setInterval(() => {
      setShowing((current) => {
        const swap = nextSwap(current, COLLAGE_SHOTS);
        if (!swap) return current;
        const next = [...current];
        next[swap.tile] = swap.shot;
        return next;
      });
    }, SWAP_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div aria-hidden="true" className="grid grid-cols-3 gap-1">
      {showing.map((shot, tile) => (
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
