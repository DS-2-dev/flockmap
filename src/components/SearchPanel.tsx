"use client";

import Link from "next/link";
import { MESSAGES, type SearchOutcome } from "@/lib/search";
import { RADIUS_OPTIONS, type LngLat, type Place, type RadiusMiles } from "@/lib/types";
import AddressInput from "./AddressInput";
import ResultsList from "./ResultsList";

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
  onSelectCamera: (lngLat: LngLat) => void;
};

export default function SearchPanel(props: Props) {
  const { from, to, radiusMiles, outcome } = props;
  const singlePlace = Boolean(from) !== Boolean(to);

  return (
    <section className="flex max-h-[60dvh] flex-col gap-3 overflow-y-auto rounded-lg bg-white p-4 shadow-xl sm:max-h-[calc(100dvh-2rem)]">
      <h1 className="font-display text-2xl leading-none">
        <Link href="/">ALPR Atlas</Link>
      </h1>

      {props.camerasFailed && (
        <div className="flex items-center justify-between rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{MESSAGES.dataFailed}</span>
          <button type="button" onClick={props.onRetry} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}

      <AddressInput
        key={`from:${from?.label ?? "empty"}`}
        label="Start (or a single address)"
        placeholder="e.g. 3848 Harrison Blvd, Ogden"
        value={from}
        onChange={props.onFromChange}
      />
      <AddressInput
        key={`to:${to?.label ?? "empty"}`}
        label="Destination (optional)"
        placeholder="e.g. Salt Lake City"
        value={to}
        onChange={props.onToChange}
      />

      {singlePlace && (
        <label className="flex items-center gap-2 text-sm">
          Radius
          <select
            value={radiusMiles}
            onChange={(e) => props.onRadiusChange(Number(e.target.value) as RadiusMiles)}
            className="rounded border border-neutral-300 px-2 py-1"
          >
            {RADIUS_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r} mi
              </option>
            ))}
          </select>
        </label>
      )}

      {(from || to) && (
        <button
          type="button"
          onClick={() => {
            props.onFromChange(null);
            props.onToChange(null);
          }}
          className="self-start text-sm text-neutral-500 underline"
        >
          Clear
        </button>
      )}

      {outcome.mode === "pending" && <p className="animate-pulse text-sm text-neutral-500">{outcome.message}</p>}
      {outcome.mode === "error" && <p className="text-sm text-red-600">{outcome.message}</p>}
      <ResultsList outcome={outcome} onSelect={props.onSelectCamera} />

      <p className="text-[11px] text-neutral-500">
        Camera data is crowdsourced via{" "}
        <a href="https://deflock.me" target="_blank" rel="noopener noreferrer" className="underline">
          DeFlock
        </a>{" "}
        / OpenStreetMap. Not every camera is mapped.
      </p>
    </section>
  );
}
