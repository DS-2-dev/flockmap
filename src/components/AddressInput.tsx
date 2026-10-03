"use client";

import { useEffect, useId, useState } from "react";
import { useDebounced } from "@/hooks/useDebounced";
import { fetchSuggestions } from "@/lib/api";
import { MESSAGES } from "@/lib/search";
import type { GeocodeResult, Place } from "@/lib/types";

type Props = {
  label: string;
  placeholder: string;
  value: Place | null;
  onChange: (place: Place | null) => void;
};

const MIN_QUERY_LENGTH = 3;

export default function AddressInput({ label, placeholder, value, onChange }: Props) {
  const id = useId();
  const [text, setText] = useState(value?.label ?? "");
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const query = useDebounced(text.trim(), 300);

  useEffect(() => {
    if (query.length < MIN_QUERY_LENGTH || query === value?.label) return;
    // Aborting the previous request stops stale results from overwriting newer ones.
    const controller = new AbortController();
    fetchSuggestions(query, controller.signal).then((res) => {
      if (controller.signal.aborted) return;
      if (!res.ok) {
        setSuggestions([]);
        setMessage(MESSAGES.geocodingBusy);
        return;
      }
      setSuggestions(res.data);
      setMessage(res.data.length ? null : MESSAGES.notFound);
      setOpen(true);
    });
    return () => controller.abort();
  }, [query, value?.label]);

  const select = (s: GeocodeResult) => {
    setOpen(false);
    onChange({ label: s.label, lngLat: [s.lng, s.lat] });
  };

  const showList = open && text.trim().length >= MIN_QUERY_LENGTH && suggestions.length > 0;

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1 block text-xs font-semibold uppercase text-neutral-500">
        {label}
      </label>
      <input
        id={id}
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          if (e.target.value.trim() === "" && value) onChange(null);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && suggestions[0]) select(suggestions[0]);
          if (e.key === "Escape") setOpen(false);
        }}
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
      {showList && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-neutral-200 bg-white shadow-lg">
          {suggestions.map((s) => (
            <li key={`${s.lng},${s.lat},${s.label}`}>
              <button
                type="button"
                // mousedown fires before the input's blur closes the list
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(s);
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-100"
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {message && <p className="mt-1 text-xs text-red-600">{message}</p>}
    </div>
  );
}
