import Link from "next/link";
import Collage from "@/components/Collage";

const CITATIONS = [
  <>
    Camera locations ©{" "}
    <a href="https://www.openstreetmap.org/copyright" className="underline">
      OpenStreetMap contributors
    </a>{" "}
    (ODbL), mapped largely via{" "}
    <a href="https://deflock.me" className="underline">
      DeFlock
    </a>
    .
  </>,
  <>
    Map tiles by{" "}
    <a href="https://openfreemap.org" className="underline">
      OpenFreeMap
    </a>{" "}
    ©{" "}
    <a href="https://openmaptiles.org" className="underline">
      OpenMapTiles
    </a>
    ; rendered with{" "}
    <a href="https://maplibre.org" className="underline">
      MapLibre GL JS
    </a>
    .
  </>,
  <>
    Address search by{" "}
    <a href="https://photon.komoot.io" className="underline">
      Photon
    </a>{" "}
    and{" "}
    <a href="https://nominatim.org" className="underline">
      Nominatim
    </a>
    . Routing by{" "}
    <a href="https://project-osrm.org" className="underline">
      OSRM
    </a>
    ,{" "}
    <a href="https://valhalla.github.io/valhalla/" className="underline">
      Valhalla
    </a>{" "}
    (FOSSGIS) and{" "}
    <a href="https://openrouteservice.org" className="underline">
      openrouteservice
    </a>
    .
  </>,
  <>Camera data is crowdsourced and incomplete — not every camera is mapped.</>,
  <>Not affiliated with Flock Safety.</>,
];

export default function Landing() {
  return (
    <main className="flex min-h-dvh flex-col justify-between bg-neutral-50 px-6 py-10 text-neutral-900 sm:px-12">
      <section className="my-auto grid items-center gap-10 xl:grid-cols-[auto_1fr]">
        <div>
          <h1 className="font-display text-6xl leading-none sm:text-8xl">ALPR Atlas</h1>
          <p className="mt-6 text-base sm:text-lg lg:whitespace-nowrap">
            Every known Flock license-plate camera in the US, and which ones are on your route.
          </p>
          <Link href="/map" className="group mt-3 inline-block text-base sm:text-lg">
            <span className="underline underline-offset-4">Open the map</span>{" "}
            <span className="inline-block transition-transform duration-200 ease-out group-hover:translate-x-1.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0">
              →
            </span>
          </Link>
        </div>
        <Collage />
      </section>

      <footer className="mt-12 max-w-3xl space-y-1 text-[11px] leading-relaxed text-neutral-500">
        {CITATIONS.map((citation, i) => (
          <p key={i}>{citation}</p>
        ))}
      </footer>
    </main>
  );
}
