import { METERS_PER_MILE } from "@/lib/geo";
import type { SearchOutcome } from "@/lib/search";
import type { LngLat } from "@/lib/types";

type Props = { outcome: SearchOutcome; onSelect: (lngLat: LngLat) => void };

const plural = (n: number) => `${n} Flock camera${n === 1 ? "" : "s"}`;

export default function ResultsList({ outcome, onSelect }: Props) {
  if (outcome.mode !== "route" && outcome.mode !== "radius") return null;

  const heading =
    outcome.mode === "route"
      ? `${plural(outcome.matches.length)} on this route (${(outcome.route.distanceMeters / METERS_PER_MILE).toFixed(1)} mi)`
      : `${plural(outcome.matches.length)} within ${outcome.radiusMiles} mi`;

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold">{heading}</h2>
      <ol className="max-h-64 space-y-1 overflow-y-auto">
        {outcome.matches.map(({ camera, distanceMeters }, i) => (
          <li key={camera.properties.id}>
            <button
              type="button"
              onClick={() => onSelect(camera.geometry.coordinates as LngLat)}
              className="w-full rounded px-2 py-1 text-left text-sm hover:bg-neutral-100"
            >
              <span className="font-medium">#{i + 1}</span> · {camera.properties.operator ?? "Unknown operator"} ·{" "}
              {outcome.mode === "route"
                ? `${Math.round(distanceMeters)} m from route`
                : `${(distanceMeters / METERS_PER_MILE).toFixed(2)} mi away`}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
