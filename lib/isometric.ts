import { islandTile, regionPlan } from "./regions";
import type { CityId, GameState } from "./game";
export type Point = { x: number; y: number };
export type BuildingId = "refuge" | "greenhouse" | "solar" | "probe" | "garage";
export type Structure = {
  id: BuildingId;
  name: string;
  short: string;
  subtitle: string;
  x: number;
  y: number;
  w: number;
  d: number;
  height: number;
  door: Point;
  number: string;
};
export const WORLD = {
  width: 800,
  height: 520,
  size: 10,
  halfW: 32,
  halfH: 16,
  originX: 400,
  originY: 94,
};
export const STRUCTURES: Structure[] = [
  {
    id: "refuge",
    name: "Refugio",
    short: "REFUGIO",
    subtitle: "CALOR Y BATERÍA",
    x: 3,
    y: 3,
    w: 2,
    d: 2,
    height: 82,
    door: { x: 4, y: 5 },
    number: "01",
  },
  {
    id: "greenhouse",
    name: "Invernadero",
    short: "INVERNADERO",
    subtitle: "AGUA PARA LAS PLANTAS",
    x: 7,
    y: 3,
    w: 2,
    d: 2,
    height: 58,
    door: { x: 7, y: 5 },
    number: "02",
  },
  {
    id: "solar",
    name: "Paneles solares",
    short: "PANELES SOLARES",
    subtitle: "LIMPIAR Y CARGAR BATERÍA",
    x: 0,
    y: 7,
    w: 2,
    d: 2,
    height: 22,
    door: { x: 2, y: 8 },
    number: "03",
  },
  {
    id: "probe",
    name: "Antena",
    short: "ANTENA",
    subtitle: "LLAMAR A LA TIERRA",
    x: 8,
    y: 8,
    w: 1,
    d: 1,
    height: 86,
    door: { x: 8, y: 7 },
    number: "04",
  },
  {
    id: "garage",
    name: "Garaje",
    short: "GARAJE ROVER",
    subtitle: "SUBIR AL ROVER",
    x: 6,
    y: 0,
    w: 2,
    d: 2,
    height: 52,
    door: { x: 6, y: 2 },
    number: "05",
  },
];
export function structuresForCity(city: CityId | null): Structure[] {
  if (!city) return STRUCTURES;
  return STRUCTURES.map((b, i) => ({
    ...b,
    ...regionPlan(city).sites[i],
    w: 1,
    d: 1,
    height: Math.round(b.height * 0.85),
  }));
}
export const project = (p: Point): Point => ({
  x: WORLD.originX + (p.x - p.y) * WORLD.halfW,
  y: WORLD.originY + (p.x + p.y) * WORLD.halfH,
});
export const unproject = (p: Point): Point => {
  const dx = (p.x - WORLD.originX) / WORLD.halfW,
    dy = (p.y - WORLD.originY) / WORLD.halfH;
  return { x: (dx + dy) / 2, y: (dy - dx) / 2 };
};
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);
export const key = (p: Point) => `${p.x},${p.y}`;
export const inBounds = (p: Point) =>
  p.x >= 0 && p.y >= 0 && p.x < WORLD.size && p.y < WORLD.size;
export function buildingAt(
  p: Point,
  city: CityId | null = null,
): Structure | undefined {
  return structuresForCity(city).find(
    (b) => p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.d,
  );
}
export function walkable(p: Point, city: CityId | null = null) {
  return (
    inBounds(p) &&
    islandTile(p, city) &&
    !buildingAt(p, city) &&
    (!city ||
      regionPlan(city).walkable.some(([x, y]) => x === p.x && y === p.y))
  );
}
export function canStep(from: Point, to: Point, city: CityId | null = null) {
  if (!walkable(to, city)) return false;
  if (from.x !== to.x && from.y !== to.y)
    return (
      walkable({ x: from.x, y: to.y }, city) &&
      walkable({ x: to.x, y: from.y }, city)
    );
  return true;
}
export function nearestWalkable(p: Point, city: CityId | null = null): Point {
  const candidates: Point[] = [];
  for (let x = 0; x < 10; x++)
    for (let y = 0; y < 10; y++)
      if (walkable({ x, y }, city)) candidates.push({ x, y });
  return candidates.sort((a, b) => distance(a, p) - distance(b, p))[0];
}
export function findPath(
  from: Point,
  to: Point,
  city: CityId | null = null,
): Point[] {
  const start = nearestWalkable(
      {
        x: Math.round(from.x),
        y: Math.round(from.y),
      },
      city,
    ),
    goal = nearestWalkable({ x: Math.round(to.x), y: Math.round(to.y) }, city);
  const queue = [start],
    previous = new Map<string, Point | null>([[key(start), null]]);
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (key(current) === key(goal)) {
      const path: Point[] = [];
      let p: Point | null = current;
      while (p) {
        path.unshift(p);
        p = previous.get(key(p)) ?? null;
      }
      return path;
    }
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      const p = { x: current.x + dx, y: current.y + dy };
      if (!previous.has(key(p)) && canStep(current, p, city)) {
        previous.set(key(p), current);
        queue.push(p);
      }
    }
  }
  return [];
}
export function activeBuilding(state: GameState): BuildingId | null {
  return state.solActual === 1
    ? "greenhouse"
    : state.solActual === 8
      ? "refuge"
      : state.solActual === 18
        ? "probe"
        : state.solActual === 28
          ? "garage"
          : null;
}
export function evaProjection(state: GameState, elapsed: number) {
  const cost = state.storm.allocation.eva > 0 ? 6 : 0;
  return Math.min(
    100 - state.resources.radiacionTripulacion,
    cost * Math.max(0, Math.min(1, elapsed / 5)),
  );
}
export function terraceHeight(x: number, y: number, city: string | null) {
  return city === "la-paz"
    ? Math.max(0, 4 - x) * 3 + Math.max(0, 2 - y) * 2
    : 0;
}
export function tileIsMars(x: number, y: number, progress: number) {
  return progress >= 1 || (progress > 0 && (x + y) / 20 < progress);
}

export function pickTile(
  screen: Point,
  city: CityId | null,
  progress: number,
): Point | null {
  const tiles: Point[] = [];
  for (let x = 0; x < 10; x++)
    for (let y = 0; y < 10; y++) tiles.push({ x, y });
  tiles.sort((a, b) => b.x + b.y - (a.x + a.y));
  for (const tile of tiles) {
    if (!islandTile(tile, city)) continue;
    const center = project(tile);
    center.y -= tileIsMars(tile.x, tile.y, progress)
      ? 0
      : terraceHeight(tile.x, tile.y, city);
    if (
      Math.abs(screen.x - center.x) / WORLD.halfW +
        Math.abs(screen.y - center.y) / WORLD.halfH <=
      1
    )
      return tile;
  }
  return null;
}

export function keyboardStep(
  from: Point,
  keys: Set<string>,
  city: CityId | null = null,
): Point | null {
  const dx =
    Number(keys.has("d") || keys.has("arrowright")) -
    Number(keys.has("a") || keys.has("arrowleft"));
  const dy =
    Number(keys.has("s") || keys.has("arrowdown")) -
    Number(keys.has("w") || keys.has("arrowup"));
  const gx = Math.sign(dx + dy),
    gy = Math.sign(dy - dx),
    start = { x: Math.round(from.x), y: Math.round(from.y) },
    end = { x: start.x + gx, y: start.y + gy };
  if (!(gx || gy)) return null;
  if (canStep(start, end, city)) return end;
  if (gx && canStep(start, { x: end.x, y: start.y }, city))
    return { x: end.x, y: start.y };
  if (gy && canStep(start, { x: start.x, y: end.y }, city))
    return { x: start.x, y: end.y };
  return null;
}
