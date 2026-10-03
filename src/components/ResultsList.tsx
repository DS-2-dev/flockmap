import { formatDistance } from "@/lib/format";
import { METERS_PER_MILE } from "@/lib/geo";
import type { SearchOutcome } from "@/lib/search";
import type { Camera } from "@/lib/types";

type Props = { outcome: SearchOutcome; selectedId: number | null; onSelect: (camera: Camera) => void };

const plural = (n: number) => `${n} Flock camera${n === 1 ? "" : "s"}`;

export default function ResultsList({ outcome, selectedId, onSelect }: Props) {
  if (outcome.mode !== "route" && outcome.mode !== "radius") return null;

  const heading =
    outcome.mode === "route"
      ? `${plural(outcome.matches.length)} on this route`
      : `${plural(outcome.matches.length)} within ${outcome.radiusMiles} mi`;
  const sub =
    outcome.mode === "route"
      ? `${(outcome.route.distanceMeters / METERS_PER_MILE).toFixed(1)} mi · ${Math.round(outcome.route.durationSeconds / 60)} min drive`
      : null;

  return (
    <div>
      <h2 className="text-base text-neutral-900 dark:text-neutral-50">{heading}</h2>
      {sub && <p className="text-[13px] text-neutral-500">{sub}</p>}
      {outcome.matches.length > 0 && (
        <ol className="mt-2 overflow-hidden rounded-2xl bg-white/80 dark:bg-white/[0.07]">
          {outcome.matches.map(({ camera, distanceMeters }, i) => (
            <li key={camera.properties.id} className="border-b border-black/5 last:border-0 dark:border-white/10">
              <button
                type="button"
                onClick={() => onSelect(camera)}
                className={`flex w-full items-center gap-2.5 px-2.5 py-2 text-left active:bg-black/5 dark:active:bg-white/10 ${
                  camera.properties.id === selectedId ? "bg-black/[0.04] dark:bg-white/[0.06]" : ""
                }`}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-red-600 text-[12px] font-semibold text-white">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] text-neutral-900 dark:text-neutral-100">
                    {camera.properties.operator ?? "Unknown operator"}
                  </span>
                  <span className="block text-[13px] text-neutral-500">
                    {outcome.mode === "route"
                      ? `${formatDistance(distanceMeters)} from route`
                      : `${formatDistance(distanceMeters)} away`}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
