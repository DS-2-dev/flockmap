// Wireframe globe math for the animated logo: points on a unit sphere are spun
// around the vertical axis, tilted toward the viewer, and projected flat.

export type Vec3 = [number, number, number];

const TILT = (18 * Math.PI) / 180;
const MERIDIANS = 6; // great circles every 30°, so 12 lines of longitude
const PARALLELS = [-60, -30, 0, 30, 60];
const SAMPLES = 72;

/** Spin around the vertical axis, then tilt the top toward the viewer. z > 0 faces the viewer. */
export function project([x, y, z]: Vec3, spin: number): Vec3 {
  const x1 = x * Math.cos(spin) + z * Math.sin(spin);
  const z1 = -x * Math.sin(spin) + z * Math.cos(spin);
  const y2 = y * Math.cos(TILT) - z1 * Math.sin(TILT);
  const z2 = y * Math.sin(TILT) + z1 * Math.cos(TILT);
  return [x1, y2, z2];
}

const fmt = ([x, y]: Vec3) => `${x.toFixed(3)} ${(-y).toFixed(3)}`; // SVG y points down

/** Split a closed 3D line into SVG path data for the near and far halves. */
function toPaths(points: Vec3[], spin: number): { front: string; back: string } {
  const pts = points.map((p) => project(p, spin));
  let front = "";
  let back = "";
  let frontEnd = -1;
  let backEnd = -1;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const segment = (end: number) => (end === i - 1 ? "" : `M${fmt(a)}`) + `L${fmt(b)}`;
    if (a[2] + b[2] >= 0) {
      front += segment(frontEnd);
      frontEnd = i;
    } else {
      back += segment(backEnd);
      backEnd = i;
    }
  }
  return { front, back };
}

const circle = (point: (t: number) => Vec3) =>
  Array.from({ length: SAMPLES + 1 }, (_, i) => point((i / SAMPLES) * 2 * Math.PI));

/** Meridians first, then parallels, at the given spin angle (radians). */
export function globeLines(spin: number): { front: string; back: string }[] {
  const meridians = Array.from({ length: MERIDIANS }, (_, k) => {
    const lon = (k * Math.PI) / MERIDIANS;
    return circle((t) => [Math.cos(t) * Math.sin(lon), Math.sin(t), Math.cos(t) * Math.cos(lon)]);
  });
  const parallels = PARALLELS.map((deg) => {
    const lat = (deg * Math.PI) / 180;
    return circle((t) => [Math.cos(lat) * Math.sin(t), Math.sin(lat), Math.cos(lat) * Math.cos(t)]);
  });
  return [...meridians, ...parallels].map((points) => toPaths(points, spin));
}
