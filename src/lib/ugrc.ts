import type { GeocodeResult } from "./types";

// Utah's state geocoder (UGRC): address points for nearly every Utah address, which
// Photon and the Census geocoder miss. Free, but it needs a *browser* key locked to
// the site's URL (server keys are tied to one IP, which Vercel doesn't have), so the
// browser calls it directly. Without a key this lookup is skipped.
// Keys: https://developer.mapserv.utah.gov/self-service
const API_KEY = process.env.NEXT_PUBLIC_UGRC_API_KEY;
const BASE = "https://api.mapserv.utah.gov/api/v1/geocode";
const ACCEPT_SCORE = 80;

export const ugrcEnabled = Boolean(API_KEY);

const STATE = /^(ut|utah)$/i;
const ZIP = /^\d{5}$/;

/**
 * UGRC needs the street and the zone (city or ZIP) apart, but people type one line:
 * "1566 S 350 E Kaysville", "845 E 3900 S, Millcreek, UT 84107". Returns the likely
 * splits, best first: a ZIP if there is one, then the text after a comma, then the
 * last one to three words as the city.
 */
export function streetZoneCandidates(query: string): { street: string; zone: string }[] {
  const words = query
    .replace(/,/g, " , ")
    .split(/\s+/)
    .filter(Boolean);
  // Drop a trailing state ("UT", "Utah") and stray commas.
  while (words.length && (STATE.test(words[words.length - 1]) || words[words.length - 1] === ",")) words.pop();

  const out: { street: string; zone: string }[] = [];
  const add = (streetWords: string[], zoneWords: string[]) => {
    const street = streetWords.filter((w) => w !== ",").join(" ");
    const zone = zoneWords.filter((w) => w !== "," && !STATE.test(w)).join(" ");
    // A street needs a house number and at least one more word.
    if (!/^\d+[a-z]?\s+\S/i.test(street) || !zone) return;
    if (!out.some((c) => c.street === street && c.zone === zone)) out.push({ street, zone });
  };

  const last = words[words.length - 1];
  if (last && ZIP.test(last)) {
    // "..., Millcreek, UT 84107" -> street before the first comma (or everything but the ZIP).
    const comma = words.indexOf(",");
    add(words.slice(0, comma > 0 ? comma : words.length - 1), [last]);
    return out;
  }
  const comma = words.indexOf(",");
  if (comma > 0) add(words.slice(0, comma), words.slice(comma + 1));
  for (let n = 1; n <= 3 && n < words.length; n++) add(words.slice(0, -n), words.slice(-n));
  return out;
}

// "1566 S 350 E, KAYSVILLE" -> "1566 S 350 E, Kaysville"
export function ugrcLabel(matchAddress: string): string {
  const [street, ...rest] = matchAddress.split(", ");
  const place = rest.join(", ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return place ? `${street}, ${place}, UT` : street;
}

type UgrcResponse = {
  status?: number;
  result?: { location?: { x?: number; y?: number }; score?: number; matchAddress?: string };
};

/** The best UGRC match for a typed address, or none. Never throws. */
export async function ugrcAddress(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  if (!API_KEY) return [];
  const tries = streetZoneCandidates(query).map(async ({ street, zone }) => {
    try {
      const url =
        `${BASE}/${encodeURIComponent(street)}/${encodeURIComponent(zone)}` +
        `?apiKey=${API_KEY}&spatialReference=4326&acceptScore=${ACCEPT_SCORE}`;
      const res = await fetch(url, { signal });
      if (!res.ok) return null;
      const { result } = (await res.json()) as UgrcResponse;
      const { x, y } = result?.location ?? {};
      if (!result?.matchAddress || typeof x !== "number" || typeof y !== "number") return null;
      return { score: result.score ?? 0, place: { label: ugrcLabel(result.matchAddress), lng: x, lat: y } };
    } catch {
      return null;
    }
  });
  const best = (await Promise.all(tries))
    .filter((r) => r !== null)
    .sort((a, b) => b.score - a.score)[0];
  return best ? [best.place] : [];
}
