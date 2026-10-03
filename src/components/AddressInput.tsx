"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDebounced } from "@/hooks/useDebounced";
import { fetchSuggestions } from "@/lib/api";
import { ugrcAddress } from "@/lib/ugrc";
import { MESSAGES } from "@/lib/search";
import type { GeocodeResult, Place } from "@/lib/types";

type Props = {
  label: string;
  placeholder: string;
  value: Place | null;
  onChange: (place: Place | null) => void;
  onFocus?: () => void;
  icon?: "search" | "pin";
  /** The input is the collapsed search pill: no filled background. */
  bare?: boolean;
  /** Where suggestions render (a slot in the sheet's scrolling content). */
  listTarget: HTMLElement | null;
  /** Whether this field is the one being searched, so its suggestions show. */
  active: boolean;
};

const MIN_QUERY_LENGTH = 3;
// Matches the server cap in src/lib/server/limits.ts.
const MAX_QUERY_LENGTH = 200;

// Utah's exact address match goes first; other results at the same spot are dropped.
const SAME_SPOT_DEG = 0.0007; // ~75 m
function mergeExact(exact: GeocodeResult[], rest: GeocodeResult[]): GeocodeResult[] {
  const near = (a: GeocodeResult, b: GeocodeResult) =>
    Math.abs(a.lat - b.lat) < SAME_SPOT_DEG && Math.abs(a.lng - b.lng) < SAME_SPOT_DEG;
  return [...exact, ...rest.filter((r) => !exact.some((e) => near(e, r)))];
}

// "123 Main Street, Sandy, Utah, 84070" -> ["123 Main Street", "Sandy, Utah, 84070"]
function splitLabel(label: string): [string, string] {
  const i = label.indexOf(",");
  return i < 0 ? [label, ""] : [label.slice(0, i), label.slice(i + 1).trim()];
}

export default function AddressInput({
  label,
  placeholder,
  value,
  onChange,
  onFocus,
  icon = "search",
  bare = false,
  listTarget,
  active,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(value?.label ?? "");
  // Results remember the query they answer, so a stale "not found" isn't shown.
  const [results, setResults] = useState<{ query: string; items: GeocodeResult[]; message: string | null }>({
    query: "",
    items: [],
    message: null,
  });
  const query = useDebounced(text.trim(), 300);

  useEffect(() => {
    if (query.length < MIN_QUERY_LENGTH || query === value?.label) return;
    // Aborting the previous request stops stale results from overwriting newer ones.
    const controller = new AbortController();
    Promise.all([fetchSuggestions(query, controller.signal), ugrcAddress(query, controller.signal)]).then(
      ([res, exact]) => {
        if (controller.signal.aborted) return;
        if (!res.ok && exact.length === 0) {
          setResults({ query, items: [], message: MESSAGES.geocodingBusy });
          return;
        }
        const items = mergeExact(exact, res.ok ? res.data : []);
        setResults({ query, items, message: items.length ? null : MESSAGES.notFound });
      },
    );
    return () => controller.abort();
  }, [query, value?.label]);

  const select = (s: GeocodeResult) => {
    inputRef.current?.blur();
    onChange({ label: s.label, lngLat: [s.lng, s.lat] });
  };

  const trimmed = text.trim();
  const current = results.query === trimmed;
  // While the next query loads, keep showing the last suggestions (every one is still a
  // real place) so the list doesn't flicker on each keystroke.
  const suggestions = trimmed.length >= MIN_QUERY_LENGTH ? results.items : [];
  const message = current ? results.message : null;

  const list = (
    <div>
      {/* Like Apple Maps: no hint text while typing, only results (or "not found"). */}
      {message && suggestions.length === 0 ? (
        <p className="px-1 py-1 text-[15px] text-neutral-500">{message}</p>
      ) : (
        suggestions.length > 0 && (
          <ul className="overflow-hidden rounded-2xl bg-white/80 dark:bg-white/[0.07]">
            {suggestions.map((s) => {
              const [title, sub] = splitLabel(s.label);
              return (
                <li key={`${s.lng},${s.lat},${s.label}`} className="group">
                  <button
                    type="button"
                    // keep focus in the input so the keyboard doesn't drop before the tap lands
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => select(s)}
                    className="flex w-full items-center gap-3 pl-3 text-left active:bg-black/5 dark:active:bg-white/10"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-red-500 text-white">
                      <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
                        <path
                          d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"
                          fill="currentColor"
                        />
                      </svg>
                    </span>
                    {/* separator starts at the text, not the icon */}
                    <span className="min-w-0 flex-1 border-b border-black/10 py-2.5 pr-3 group-last:border-0 dark:border-white/10">
                      <span className="block truncate text-[15px] font-medium text-neutral-900 dark:text-neutral-100">{title}</span>
                      {sub && <span className="block truncate text-[13px] text-neutral-500">{sub}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )
      )}
    </div>
  );

  return (
    <div className="relative min-w-0 flex-1">
      <div
        className={`flex h-10 items-center gap-2 px-3 ${bare ? "" : "rounded-full bg-black/[0.06] dark:bg-white/10"}`}
      >
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
          ref={inputRef}
          aria-label={label}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          // No iOS inline predictions/autocorrect: their gray text overlaps what's typed.
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          // Safari 18+ attribute (not in React's types yet) that turns off inline predictions.
          {...{ writingsuggestions: "false" }}
          maxLength={MAX_QUERY_LENGTH}
          placeholder={placeholder}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value.trim() === "" && value) onChange(null);
          }}
          onFocus={onFocus}
          onKeyDown={(e) => {
            if (e.key === "Enter" && suggestions.length > 0) select(suggestions[0]);
            if (e.key === "Escape") inputRef.current?.blur();
          }}
          className="min-w-0 flex-1 bg-transparent text-base text-neutral-900 outline-none placeholder:text-neutral-500 dark:text-neutral-100"
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
      {active && listTarget && createPortal(list, listTarget)}
    </div>
  );
}
