"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Detent } from "@/lib/sheet";
import { MESSAGES, type SearchOutcome } from "@/lib/search";
import { type Camera, type Place, type RadiusMiles } from "@/lib/types";
import AddressInput from "./AddressInput";
import CameraCard from "./CameraCard";
import RadiusControl from "./RadiusControl";
import ResultsList from "./ResultsList";
import Sheet from "./Sheet";

type Props = {
  from: Place | null;
  to: Place | null;
  radiusMiles: RadiusMiles;
  onFromChange: (p: Place | null) => void;
  onToChange: (p: Place | null) => void;
  onRadiusChange: (r: RadiusMiles) => void;
  outcome: SearchOutcome;
  camerasFailed: boolean;
  onRetry: () => void;
  selected: Camera | null;
  onSelectCamera: (camera: Camera | null) => void;
  detent: Detent;
  onDetentChange: (detent: Detent) => void;
  onSheetHeightChange: (px: number) => void;
};

export default function SearchPanel(props: Props) {
  const { from, to, radiusMiles, outcome, selected } = props;
  const singlePlace = Boolean(from) !== Boolean(to);
  // The field being searched: the sheet shows its suggestions
  // in place of the results until a place is picked or the search is cancelled.
  const [searching, setSearching] = useState<"from" | "to" | null>(null);
  const [listEl, setListEl] = useState<HTMLDivElement | null>(null);
  const selectedMatch =
    selected && (outcome.mode === "route" || outcome.mode === "radius")
      ? outcome.matches.find((m) => m.camera.properties.id === selected.properties.id)
      : undefined;

  // Searching opens the sheet full (Apple Maps style): the field sits at the top of
  // the screen and the keyboard covers the bottom of the list.
  const startSearch = (field: "from" | "to") => () => {
    setSearching(field);
    props.onDetentChange("full");
  };
  const cancel = () => {
    (document.activeElement as HTMLElement | null)?.blur();
    setSearching(null);
    props.onDetentChange(from || to ? "half" : "peek");
  };
  // Dragging the sheet down out of full ends the search.
  const changeDetent = (detent: Detent) => {
    if (detent !== "full") setSearching(null);
    props.onDetentChange(detent);
  };
  const pick = (onChange: (p: Place | null) => void) => (place: Place | null) => {
    if (place) setSearching(null);
    onChange(place);
  };

  const closeButton = (
    <button
      type="button"
      aria-label="Close search"
      onClick={cancel}
      className="grid size-10 shrink-0 place-items-center rounded-full bg-black/[0.06] text-neutral-700 dark:bg-white/10 dark:text-neutral-200"
    >
      <svg viewBox="0 0 12 12" className="size-3.5" aria-hidden="true">
        <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
      </svg>
    </button>
  );

  const header = (pill: boolean) => (
    <div className="flex flex-col gap-2">
      <Link href="/" className="mb-1 hidden items-center gap-2 font-display text-xl text-neutral-900 sm:flex dark:text-neutral-50">
        <Image src="/logo.png" alt="" width={512} height={512} className="size-6 dark:invert" />
        ALPR Atlas
      </Link>
      {searching !== "to" && (
        <div className="flex items-center gap-2">
          <AddressInput
            key={`from:${from?.label ?? "empty"}`}
            label="Start or address"
            placeholder="Search an address"
            value={from}
            onChange={pick(props.onFromChange)}
            onFocus={startSearch("from")}
            bare={pill}
            listTarget={listEl}
            active={searching === "from"}
          />
          {searching === "from" && !pill && closeButton}
        </div>
      )}
      {!pill && (from || to) && searching !== "from" && (
        <div className="flex items-center gap-2">
          <AddressInput
            key={`to:${to?.label ?? "empty"}`}
            label="Destination"
            placeholder="Add a destination"
            icon="pin"
            value={to}
            onChange={pick(props.onToChange)}
            onFocus={startSearch("to")}
            listTarget={listEl}
            active={searching === "to"}
          />
          {searching === "to" && closeButton}
        </div>
      )}
    </div>
  );

  return (
    <Sheet
      detent={props.detent}
      onDetentChange={changeDetent}
      onHeightChange={props.onSheetHeightChange}
      header={header}
      scrollKey={searching ?? selected?.properties.id ?? null}
    >
      <div ref={setListEl} className={searching ? "pt-1" : "hidden"} />
      <div className={searching ? "hidden" : "flex flex-col gap-3 pt-1"}>
        {props.camerasFailed && (
          <div className="flex items-center justify-between rounded-2xl bg-red-500/10 px-4 py-3 text-[15px] text-red-700 dark:text-red-300">
            <span>{MESSAGES.dataFailed}</span>
            <button type="button" onClick={props.onRetry} className="font-semibold">
              Retry
            </button>
          </div>
        )}

        {selected && (
          <CameraCard
            camera={selected}
            distanceMeters={selectedMatch?.distanceMeters ?? null}
            onClose={() => props.onSelectCamera(null)}
          />
        )}

        {singlePlace && (
          <RadiusControl value={radiusMiles} onChange={props.onRadiusChange} />
        )}

        {outcome.mode === "pending" && <p className="animate-pulse text-[15px] text-neutral-500">{outcome.message}</p>}
        {outcome.mode === "error" && <p className="text-[15px] text-red-600 dark:text-red-400">{outcome.message}</p>}
        {outcome.mode === "idle" && !selected && (
          <p className="text-[15px] text-neutral-500">
            Search an address to see nearby cameras, or add a destination to check a route.
          </p>
        )}
        <ResultsList
          outcome={outcome}
          selectedId={selected?.properties.id ?? null}
          onSelect={(camera) => props.onSelectCamera(camera)}
        />

        {/* Map attribution (phones; the map's own ⓘ is hidden there, see globals.css). */}
        <p className="text-[11px] leading-relaxed text-neutral-500 sm:hidden">
          Map ©{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">
            OpenStreetMap
          </a>{" "}
          contributors ·{" "}
          <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer" className="underline">
            OpenFreeMap
          </a>{" "}
          ·{" "}
          <a href="https://openmaptiles.org" target="_blank" rel="noopener noreferrer" className="underline">
            OpenMapTiles
          </a>
        </p>
      </div>
    </Sheet>
  );
}
