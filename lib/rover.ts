import type { GameState } from "./game";
import type { Point } from "./isometric";
import { clamp } from "./simulation";
export type RoverRoute = "short" | "long";
export type RoverHeat = "high" | "off";
export type RoverHistory = {
  segment: number;
  distance: number;
  battery: number;
  bodyTemperature: number;
  heater: RoverHeat;
  night: boolean;
  driveCost: number;
  heatCost: number;
};
export const ROUTES = {
  short: {
    id: "short" as const,
    name: "Camino Corto",
    distance: 25,
    segments: 5,
    driveCost: 1.8,
    description: "Rápido, pero gasta mucha batería",
    color: "#ffb000",
    points: [
      { x: 1, y: 8 },
      { x: 1, y: 5 },
      { x: 3, y: 3 },
      { x: 4, y: 2 },
      { x: 6, y: 1 },
      { x: 8, y: 1 },
    ],
  },
  long: {
    id: "long" as const,
    name: "Camino Largo",
    distance: 40,
    segments: 8,
    driveCost: 0.9,
    description: "Gasta poca batería, pero hace mucho frío de noche",
    color: "#5ce1e6",
    points: [
      { x: 1, y: 8 },
      { x: 2, y: 8 },
      { x: 3, y: 8 },
      { x: 4, y: 8 },
      { x: 5, y: 7 },
      { x: 6, y: 6 },
      { x: 7, y: 5 },
      { x: 8, y: 3 },
      { x: 8, y: 1 },
    ],
  },
};
export const HEATERS = {
  high: { label: "ENCENDIDA", cost: 0.4, warmth: 2.3 },
  off: { label: "APAGADA", cost: 0, warmth: 0 },
};
export const INITIAL_ROVER = {
  boarded: false,
  route: null as RoverRoute | null,
  heater: "high" as RoverHeat,
  segment: 0,
  bodyTemperature: 37,
  status: "garage" as "garage" | "planning" | "ready" | "arrived" | "failed",
  history: [] as RoverHistory[],
  message: "",
};
export function roverNight(route: RoverRoute | null, segment: number) {
  return route === "long" && segment >= 4;
}
export function forecastRoverStep(s: GameState) {
  const route = ROUTES[s.rover.route ?? "short"],
    heat = HEATERS[s.rover.heater];
  const night = roverNight(s.rover.route, s.rover.segment),
    cooling =
      (night ? 1.8 : s.rover.route === "short" ? 0.95 : 0.55) /
      s.modifiers.aislamientoTermico;
  const bodyTemperature = clamp(
    s.rover.bodyTemperature - cooling + heat.warmth,
    0,
    37.4,
  );
  return {
    driveCost: route.driveCost,
    heatCost: heat.cost,
    totalCost: route.driveCost + heat.cost,
    battery: clamp(s.resources.energia - route.driveCost - heat.cost),
    bodyTemperature,
    night,
    exterior: night ? -80 : -35,
  };
}
export function advanceRover(s: GameState): GameState {
  const f = forecastRoverStep(s),
    segment = s.rover.segment + 1,
    route = ROUTES[s.rover.route!];
  const integrity =
    f.bodyTemperature <= 30
      ? 0
      : clamp(
          s.resources.integridadTripulacion -
            Math.max(0, 35 - f.bodyTemperature) * 2,
        );
  const resources = {
    ...s.resources,
    energia: f.battery,
    agua: clamp(s.resources.agua - 0.2),
    oxigeno: clamp(s.resources.oxigeno - 0.35),
    integridadTripulacion: integrity,
  };
  const failed =
    f.battery <= 0 ||
    integrity <= 0 ||
    resources.agua <= 0 ||
    resources.oxigeno <= 0;
  const arrived = segment === route.segments && !failed;
  const entry: RoverHistory = {
    segment,
    distance: segment * 5,
    battery: f.battery,
    bodyTemperature: f.bodyTemperature,
    heater: s.rover.heater,
    night: f.night,
    driveCost: f.driveCost,
    heatCost: f.heatCost,
  };
  const message = failed
    ? f.bodyTemperature <= 30
      ? "Hace demasiado frío. El equipo no puede seguir."
      : "Se acabaron las reservas. El rover se detuvo."
    : arrived
      ? "¡Llegamos al rescate! El equipo está a salvo."
      : `Llevamos ${segment * 5} de ${route.distance} km. ${roverNight(s.rover.route, segment) ? "Llegó la noche: enciende el calor." : "Sigue la flecha amarilla."}`;
  return {
    ...s,
    resources,
    rover: {
      ...s.rover,
      segment,
      bodyTemperature: f.bodyTemperature,
      status: failed ? "failed" : arrived ? "arrived" : "ready",
      history: [...s.rover.history, entry],
      message,
    },
    logs: [
      ...s.logs,
      {
        id: s.requestId + 800 + segment,
        tag: `SOL 28 · ROVER ${segment}/${route.segments}`,
        text: message,
      },
    ],
  };
}
export const inTerrain = (p: Point) =>
  p.x >= 0 && p.y >= 0 && p.x < 10 && p.y < 10;
export function terrainPath(from: Point, to: Point): Point[] {
  const start = { x: Math.round(from.x), y: Math.round(from.y) },
    goal = { x: Math.round(to.x), y: Math.round(to.y) };
  if (!inTerrain(start) || !inTerrain(goal)) return [];
  const path = [start];
  let p = start;
  while (p.x !== goal.x || p.y !== goal.y) {
    p = { x: p.x + Math.sign(goal.x - p.x), y: p.y + Math.sign(goal.y - p.y) };
    path.push(p);
  }
  return path;
}
export function terrainHeight(x: number, y: number): number {
  const ix = Math.max(0, Math.min(9, Math.round(x))),
    iy = Math.max(0, Math.min(9, Math.round(y)));
  const flat = ROUTES.long.points.some(
    (p) => Math.hypot(p.x - ix, p.y - iy) < 1.1,
  );
  if (flat) return 8;
  const radius = Math.hypot(ix - 4.5, iy - 4.5),
    rim = Math.max(0, 1 - Math.abs(radius - 3.7) / 1.3);
  return Math.round((8 + rim * 46 + (ix < 3 && iy < 4 ? 14 : 0)) / 6) * 6;
}
export function terrainHeightAt(p: Point) {
  const x = Math.max(0, Math.min(9, p.x)),
    y = Math.max(0, Math.min(9, p.y)),
    x0 = Math.floor(x),
    y0 = Math.floor(y),
    tx = x - x0,
    ty = y - y0;
  return (
    terrainHeight(x0, y0) * (1 - tx) * (1 - ty) +
    terrainHeight(x0 + 1, y0) * tx * (1 - ty) +
    terrainHeight(x0, y0 + 1) * (1 - tx) * ty +
    terrainHeight(x0 + 1, y0 + 1) * tx * ty
  );
}

// Screen-aligned movement on Jezero has no base-building collision rules.
export function roverKeyboardStep(
  from: Point,
  keys: Set<string>,
): Point | null {
  const dx =
    Number(keys.has("d") || keys.has("arrowright")) -
    Number(keys.has("a") || keys.has("arrowleft"));
  const dy =
    Number(keys.has("s") || keys.has("arrowdown")) -
    Number(keys.has("w") || keys.has("arrowup"));
  if (!(dx || dy)) return null;
  const goal = {
    x: Math.round(from.x) + Math.sign(dx + dy),
    y: Math.round(from.y) + Math.sign(dy - dx),
  };
  return inTerrain(goal) ? goal : null;
}
