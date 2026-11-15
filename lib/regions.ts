import data from "./bolivia-data.json";
import type { CityId } from "./game";
import type { Point } from "./isometric";
export const DEPARTMENTS = data.departments;
export const GEOGRAPHY_SOURCE = data.url;
export const REGION_NAME: Record<CityId, string> = {
  "santa-cruz": "Santa Cruz",
  uyuni: "Potosí",
  "la-paz": "La Paz",
};
export function regionPlan(city: CityId | null) {
  return data.islands[city ?? "santa-cruz"];
}
export function regionPolygon(city: CityId | null): Point[] {
  return regionPlan(city).polygon.map(([x, y]) => ({ x, y }));
}
export function pointInRegion(p: Point, city: CityId | null): boolean {
  if (!city) return true;
  const ring = regionPlan(city).polygon;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i],
      b = ring[j];
    if (
      a[1] > p.y !== b[1] > p.y &&
      p.x < ((b[0] - a[0]) * (p.y - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}
// Keep an entire tile inside the geographic outline, including its corners.
export function islandTile(p: Point, city: CityId | null): boolean {
  return (
    !city ||
    [
      [0, 0],
      [0.4, 0.4],
      [-0.4, 0.4],
      [0.4, -0.4],
      [-0.4, -0.4],
    ].every(([dx, dy]) => pointInRegion({ x: p.x + dx, y: p.y + dy }, city))
  );
}
export const regionSpawn = (city: CityId | null): Point => ({
  ...regionPlan(city).spawn,
});
