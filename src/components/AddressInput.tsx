"use client";

import { useEffect, useState } from "react";
import { useDebounced } from "@/hooks/useDebounced";
import { fetchSuggestions } from "@/lib/api";
import { MESSAGES } from "@/lib/search";
import type { GeocodeResult, Place } from "@/lib/types";

type Props = {
  label: string;
  placeholder: string;
  value: Place | null;
  onChange: (place: Place | null) => void;
  onFocus?: () => void;
  icon?: "search" | "pin";
};

const MIN_QUERY_LENGTH = 3;
// Matches the server cap in src/lib/server/limits.ts.
const MAX_QUERY_LENGTH = 200;

export default function AddressInput({ label, placeholder, value, onChange, onFocus, icon = "search" }: Props) {
  const [text, setText] = useState(value?.label ?? "");
  // Results remember the query they answer, so stale ones are never shown or picked.
  const [results, setResults] = useState<{ query: string; items: GeocodeResult[]; message: string | null }>({
    query: "",
    items: [],
    message: null,
  });
  const [open, setOpen] = useState(false);
  const query = useDebounced(text.trim(), 300);

  useEffect(() => {
    if (query.length < MIN_QUERY_LENGTH || query === value?.label) return;
    // Aborting the previous request stops stale results from overwriting newer ones.
    const controller = new AbortController();
    fetchSuggestions(query, controller.signal).then((res) => {
      if (controller.signal.aborted) return;
      if (!res.ok) {
        setResults({ query, items: [], message: MESSAGES.geocodingBusy });
        return;
      }
      setResults({ query, items: res.data, message: res.data.length ? null : MESSAGES.notFound });
      setOpen(true);
    });
    return () => controller.abort();
  }, [query, value?.label]);

  const select = (s: GeocodeResult) => {
    setOpen(false);
    onChange({ label: s.label, lngLat: [s.lng, s.lat] });
  };

  const current = results.query === text.trim();
  const suggestions = current ? results.items : [];
  const message = current ? results.message : null;
  const showList = open && suggestions.length > 0;

  return (
    <div>
      <div className="flex h-11 items-center gap-2 rounded-xl bg-black/[0.06] px-3 dark:bg-white/10">
        <svg viewBox="0 0 24 24" className="size-[18px] shrink-0 text-neutral-500" aria-hidden="true">
          {icon === "search" ? (
            <path
              d="M10.5 4a6.5 6.5 0 1 0 4.03 11.6l4.43 4.43 1.41-1.41-4.43-4.43A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z"
              fill="currentColor"
            />
          ) : (
            <path
              d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"
              fill="currentColor"
            />
          )}
        </svg>
        <input
          aria-label={label}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          maxLength={MAX_QUERY_LENGTH}
          placeholder={placeholder}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            if (e.target.value.trim() === "" && value) onChange(null);
          }}
          onFocus={() => {
            setOpen(true);
            onFocus?.();
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && showList) select(suggestions[0]);
            if (e.key === "Escape") setOpen(false);
          }}
          className="min-w-0 flex-1 bg-transparent text-[17px] text-neutral-900 outline-none placeholder:text-neutral-500 dark:text-neutral-100"
        />
        {text && (
          <button
            type="button"
            aria-label={`Clear ${label.toLowerCase()}`}
            // mousedown keeps focus in the input
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setText("");
              onChange(null);
            }}
            className="grid size-5 shrink-0 place-items-center rounded-full bg-neutral-400 text-white dark:bg-neutral-500"
          >
            <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden="true">
              <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
      {showList && (
        <ul className="mt-2 overflow-hidden rounded-xl bg-white/70 dark:bg-white/5">
          {suggestions.map((s) => (
            <li key={`${s.lng},${s.lat},${s.label}`} className="border-b border-black/5 last:border-0 dark:border-white/10">
              <button
                type="button"
                // mousedown fires before the input's blur closes the list
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(s);
                }}
                className="block w-full px-3 py-2.5 text-left text-[15px] text-neutral-900 active:bg-black/5 dark:text-neutral-100 dark:active:bg-white/10"
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {message && <p className="mt-1.5 px-1 text-[13px] text-red-600 dark:text-red-400">{message}</p>}
    </div>
  );
}
