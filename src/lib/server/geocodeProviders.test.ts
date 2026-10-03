import { describe, expect, it } from "vitest";
import { tryInOrder } from "./fallback";
import { geocodeAttempts, photonLabel } from "./geocodeProviders";

function fakeFetch(handlers: Record<string, () => Response>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    const key = Object.keys(handlers).find((k) => url.includes(k));
    if (!key) throw new Error(`unexpected fetch ${url}`);
    return handlers[key]();
  }) as typeof fetch;
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("photonLabel", () => {
  it("builds a street address label", () => {
    expect(
      photonLabel({ housenumber: "123", street: "Main St", city: "Ogden", state: "Utah", postcode: "84401" }),
    ).toBe("123 Main St, Ogden, Utah, 84401");
  });

  it("puts a place name first and skips duplicates", () => {
    expect(photonLabel({ name: "Weber State University", street: "University Cir", city: "Ogden", state: "Utah" })).toBe(
      "Weber State University, University Cir, Ogden, Utah",
    );
    expect(photonLabel({ name: "Ogden", city: "Ogden", state: "Utah" })).toBe("Ogden, Utah");
  });
});

describe("geocodeAttempts", () => {
  it("returns US Photon results only", async () => {
    const fetchFn = fakeFetch({
      photon: () =>
        json({
          features: [
            {
              geometry: { coordinates: [-111.97, 41.22] },
              properties: { housenumber: "123", street: "Main St", city: "Ogden", state: "Utah", countrycode: "US" },
            },
            { geometry: { coordinates: [-0.12, 51.5] }, properties: { name: "London", countrycode: "GB" } },
          ],
        }),
    });
    const { value, provider } = await tryInOrder(geocodeAttempts("123 main st ogden", fetchFn), 1000);
    expect(provider).toBe("photon");
    expect(value).toEqual([{ label: "123 Main St, Ogden, Utah", lng: -111.97, lat: 41.22 }]);
  });

  it("falls back to Nominatim when Photon fails", async () => {
    const fetchFn = fakeFetch({
      photon: () => json({}, 502),
      nominatim: () => json([{ display_name: "Ogden, Weber County, Utah, United States", lat: "41.223", lon: "-111.97" }]),
    });
    const { value, provider } = await tryInOrder(geocodeAttempts("ogden", fetchFn), 1000);
    expect(provider).toBe("nominatim");
    expect(value).toEqual([{ label: "Ogden, Weber County, Utah, United States", lng: -111.97, lat: 41.223 }]);
  });
});
