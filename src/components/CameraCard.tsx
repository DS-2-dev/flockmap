import { compassLabel, formatDistance } from "@/lib/format";
import type { Camera } from "@/lib/types";

type Props = { camera: Camera; distanceMeters: number | null; onClose: () => void };

// Details for the camera picked on the map or in the list (replaces the map popup).
export default function CameraCard({ camera, distanceMeters, onClose }: Props) {
  const { id, direction, operator } = camera.properties;
  const rows: [string, string][] = [
    ["Operator", operator ?? "Unknown"],
    ["Facing", direction === null ? "Unknown" : `${compassLabel(direction)} · ${Math.round(direction)}°`],
  ];
  if (distanceMeters !== null) rows.push(["Distance", formatDistance(distanceMeters)]);

  return (
    <div className="rounded-2xl bg-white/80 p-4 dark:bg-white/[0.07]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium uppercase tracking-wide text-red-600 dark:text-red-400">ALPR camera</p>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Flock license-plate reader</h2>
        </div>
        <button
          type="button"
          aria-label="Close camera details"
          onClick={onClose}
          className="grid size-8 shrink-0 place-items-center rounded-full bg-black/[0.06] text-neutral-600 dark:bg-white/10 dark:text-neutral-300"
        >
          <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <dl className="mt-3 divide-y divide-black/5 text-[15px] dark:divide-white/10">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-2">
            <dt className="text-neutral-500">{label}</dt>
            <dd className="text-right text-neutral-900 dark:text-neutral-100">{value}</dd>
          </div>
        ))}
      </dl>
      <a
        href={`https://www.openstreetmap.org/node/${id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-[15px] text-blue-600 dark:text-blue-400"
      >
        View on OpenStreetMap
      </a>
    </div>
  );
}
