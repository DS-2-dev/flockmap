"use client";

import Image from "next/image";
import Link from "next/link";
import type { Detent } from "@/lib/sheet";
import { MESSAGES, type SearchOutcome } from "@/lib/search";
import { RADIUS_OPTIONS, type Camera, type Place, type RadiusMiles } from "@/lib/types";
import AddressInput from "./AddressInput";
import CameraCard from "./CameraCard";
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
  const expand = () => props.onDetentChange("full");
  const selectedMatch =
    selected && (outcome.mode === "route" || outcome.mode === "radius")
      ? outcome.matches.find((m) => m.camera.properties.id === selected.properties.id)
      : undefined;

  const header = (
    <div className="flex flex-col gap-2">
      <Link href="/" className="mb-1 hidden items-center gap-2 font-display text-xl text-neutral-900 sm:flex dark:text-neutral-50">
        <Image src="/logo.png" alt="" width={512} height={512} className="size-6 dark:invert" />
        ALPR Atlas
      </Link>
      <AddressInput
        key={`from:${from?.label ?? "empty"}`}
        label="Start or address"
        placeholder="Search an address"
        value={from}
        onChange={props.onFromChange}
        onFocus={expand}
      />
      {(from || to) && (
        <AddressInput
          key={`to:${to?.label ?? "empty"}`}
          label="Destination"
          placeholder="Add a destination"
          icon="pin"
          value={to}
          onChange={props.onToChange}
          onFocus={expand}
        />
      )}
    </div>
  );

  return (
    <Sheet
      detent={props.detent}
      onDetentChange={props.onDetentChange}
      onHeightChange={props.onSheetHeightChange}
      header={header}
      scrollKey={selected?.properties.id ?? null}
    >
      <div className="flex flex-col gap-4 pt-2">
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
          <div role="radiogroup" aria-label="Search radius" className="grid grid-cols-3 rounded-[10px] bg-black/[0.06] p-0.5 dark:bg-white/10">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={r === radiusMiles}
                onClick={() => props.onRadiusChange(r)}
                className={`rounded-[8px] py-1.5 text-[13px] font-medium ${
                  r === radiusMiles
                    ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-600 dark:text-white"
                    : "text-neutral-600 dark:text-neutral-300"
                }`}
              >
                {r === 0.5 ? "½" : r} mi
              </button>
            ))}
          </div>
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
      </div>
    </Sheet>
  );
}
