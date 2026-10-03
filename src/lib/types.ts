import type { Feature, FeatureCollection, LineString, Point } from "geojson";

export type LngLat = [number, number];

export type CameraProps = { id: number; direction: number | null; operator: string | null };
export type Camera = Feature<Point, CameraProps>;
export type CameraCollection = FeatureCollection<Point, CameraProps>;

export type MatchedCamera = { camera: Camera; distanceMeters: number };

export type GeocodeResult = { label: string; lng: number; lat: number };

export type RouteResult = {
  geometry: LineString;
  distanceMeters: number;
  durationSeconds: number;
  provider: string;
};

export type Place = { label: string; lngLat: LngLat };

export const RADIUS_OPTIONS = [0.5, 1, 5] as const;
export type RadiusMiles = (typeof RADIUS_OPTIONS)[number];
