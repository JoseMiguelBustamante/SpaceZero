import {
  INITIAL_PROLOGUE,
  PROLOGUE_SECONDS,
  PROLOGUE_SURVIVED,
  type PrologueClock,
} from "./prologue";
import {
  INITIAL_LEARNING,
  LESSONS,
  queueLesson,
  danger,
  applyHelp,
  type Learning,
  type ExplorerHelp,
} from "./learning";
export type Sol = 0 | 1 | 8 | 18 | 28;
export type CityId = "santa-cruz" | "uyuni" | "la-paz";
import { advanceGreenhouse, advanceStorm } from "./simulation";
import { INITIAL_RESCUE, advanceSignal, solarImpact } from "./rescue";
import type { SolarEvent } from "./donki";
import {
  INITIAL_ROVER,
  advanceRover,
  type RoverHeat,
  type RoverRoute,
} from "./rover";
import { ALERT_SECONDS, SHIELD_COST } from "./ux";
import { finalizeMission, type MissionOutcome } from "./mission-outcome";
export type Phase =
  | "origin"
  | "transition"
  | "ready"
  | "sol1"
  | "sol8"
  | "sol18"
  | "sol28"
  | "final";
export type ResourceKey =
  | "agua"
  | "oxigeno"
  | "energia"
  | "temperaturaCabina"
  | "radiacionTripulacion"
  | "saludCosecha"
  | "integridadTripulacion";
export type Climate = {
  solar: number;
  temperature: number;
  date: string;
  source: "live" | "fallback";
  url: string;
};
export type City = {
  id: CityId;
  name: string;
  region: string;
  lat: number;
  lon: number;
  altitude: string;
  bonus: string;
  penalty?: string;
  description: string;
  solar: number;
  insulation: number;
  water: number;
  fallback: { solar: number; temperature: number };
};
export const CITIES: City[] = [
  {
    id: "santa-cruz",
    name: "Santa Cruz",
    region: "TIERRAS BAJAS",
    lat: -17.7833,
    lon: -63.1812,
    altitude: "416 m",
    bonus: "+15% agua; el frío pega más.",
    penalty: "Pierde calor más rápido.",
    description: "Más agua para empezar. Cuidado con el frío.",
    solar: 1,
    insulation: 0.8,
    water: 15,
    fallback: { solar: 5.6268, temperature: 26.48 },
  },
  {
    id: "uyuni",
    name: "Salar de Uyuni",
    region: "ALTIPLANO SUR",
    lat: -20.1338,
    lon: -67.4891,
    altitude: "3.656 m",
    bonus: "+20% energía solar: sol fuerte.",
    description: "Más energía cuando limpiamos los paneles.",
    solar: 1.2,
    insulation: 1,
    water: 0,
    fallback: { solar: 7.6766, temperature: 14.6 },
  },
  {
    id: "la-paz",
    name: "La Paz / El Alto",
    region: "CORDILLERA ANDINA",
    lat: -16.4897,
    lon: -68.1639,
    altitude: "3.640 m",
    bonus: "+20% abrigo para guardar calor.",
    description: "El equipo pierde menos calor por la noche.",
    solar: 1,
    insulation: 1.2,
    water: 0,
    fallback: { solar: 5.921, temperature: 9.08 },
  },
];
export const BASE_RESOURCES = {
  agua: 70,
  oxigeno: 98,
  energia: 85,
  temperaturaCabina: 21,
  radiacionTripulacion: 0,
  saludCosecha: 100,
  integridadTripulacion: 100,
};
export type SystemId = "heating" | "oxygen" | "lights" | "eva";
export type PowerLevel = 0 | 50;
export type ChallengeStatus =
  "idle" | "running" | "paused" | "complete" | "failed";
export const SOL1_LOG =
  "Día 1. Nos queda poca comida. Hagamos agua para las plantas.";
export const SOL8_LOG =
  "Día 8. El polvo tapa el sol. Elige dos ayudas para el equipo.";
export const SOL18_LOG =
  "Día 18. La antena se rompió. Usemos la sonda para pedir ayuda.";
export const INITIAL_GREENHOUSE = {
  hydrogen: 35,
  uv: 45,
  elapsed: 0,
  growth: 0,
  risk: 0,
  status: "idle" as ChallengeStatus,
  message: "",
};
export const INITIAL_STORM = {
  cycle: 0,
  evaRadiation: 0,
  darkCycles: 0,
  allocation: { heating: 50, oxygen: 0, lights: 50, eva: 0 } as Record<
    SystemId,
    PowerLevel
  >,
  status: "idle" as ChallengeStatus,
  recovered: 0,
  message: "",
  history: [] as string[],
};
export type GameState = {
  solActual: Sol;
  resources: typeof BASE_RESOURCES;
  modifiers: {
    eficienciaSolar: number;
    aislamientoTermico: number;
    reservaAguaInicial: number;
  };
  cityId: CityId | null;
  phase: Phase;
  climate: Climate | null;
  requestId: number;
  logs: { id: number; tag: string; text: string }[];
  greenhouse: typeof INITIAL_GREENHOUSE;
  storm: typeof INITIAL_STORM;
  checkpoint: typeof BASE_RESOURCES;
  rescue: typeof INITIAL_RESCUE;
  rover: typeof INITIAL_ROVER;
  outcome: MissionOutcome | null;
  prologue: PrologueClock;
  learning: Learning;
  support: ExplorerHelp | null;
};
export const INITIAL_STATE: GameState = {
  solActual: 0,
  resources: { ...BASE_RESOURCES },
  modifiers: {
    eficienciaSolar: 1,
    aislamientoTermico: 1,
    reservaAguaInicial: 0,
  },
  rover: { ...INITIAL_ROVER },
  outcome: null,
  prologue: { ...INITIAL_PROLOGUE },
  learning: { ...INITIAL_LEARNING, answered: [] },
  support: null,
  cityId: null,
  phase: "origin",
  climate: null,
  requestId: 0,
  rescue: { ...INITIAL_RESCUE },
  greenhouse: { ...INITIAL_GREENHOUSE },
  storm: { ...INITIAL_STORM },
  checkpoint: { ...BASE_RESOURCES },
  logs: [
    {
      id: 0,
      tag: "COMANDANTE",
      text: "Elige una ciudad de Bolivia. Su ayuda viajará contigo.",
    },
  ],
};
export type Action =
  | { type: "QUIZ_ANSWER"; answer: number }
  | { type: "QUIZ_CONTINUE" }
  | { type: "SUPPORT_APPLY" }
  | { type: "SUPPORT_CONTINUE"; now: number }
  | { type: "SELECT"; cityId: CityId; requestId: number; now?: number }
  | { type: "PROLOGUE_TICK"; requestId: number; now: number }
  | { type: "CLIMATE"; requestId: number; climate: Climate }
  | { type: "TRANSITION_DONE"; requestId: number }
  | { type: "START" }
  | { type: "RESET" }
  | { type: "CALIBRATE"; field: "hydrogen" | "uv"; value: number }
  | { type: "GREENHOUSE_START" }
  | { type: "GREENHOUSE_PAUSE" }
  | { type: "GREENHOUSE_TICK" }
  | { type: "RETRY" }
  | { type: "ENTER_STORM" }
  | { type: "ALLOCATE"; system: SystemId; level: PowerLevel }
  | { type: "STORM_CYCLE" }
  | { type: "ENTER_RESCUE" }
  | {
      type: "SIGNAL_SET";
      field: "angle" | "frequency" | "phase";
      value: number;
    }
  | { type: "SIGNAL_START"; now: number }
  | { type: "SIGNAL_TICK"; now: number }
  | { type: "SOLAR_EVENT"; attempt: number; event: SolarEvent; now: number }
  | { type: "ALERT_TICK"; now: number }
  | { type: "SHIELD"; now: number }
  | { type: "RETRY_STORM" }
  | { type: "ENTER_ROVER" }
  | { type: "BOARD_ROVER" }
  | { type: "ROVER_ROUTE"; route: RoverRoute }
  | { type: "ROVER_HEAT"; heater: RoverHeat }
  | { type: "ROVER_STEP"; segment: number };
function reduceMission(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "QUIZ_ANSWER":
    case "QUIZ_CONTINUE":
    case "SUPPORT_APPLY":
    case "SUPPORT_CONTINUE":
      return state;
    case "PROLOGUE_TICK": {
      if (
        state.solActual !== 0 ||
        !state.cityId ||
        state.prologue.startedAt === null ||
        action.requestId !== state.requestId ||
        !Number.isFinite(action.now)
      )
        return state;
      const elapsed = Math.max(
        state.prologue.elapsed,
        Math.min(
          PROLOGUE_SECONDS,
          (action.now - state.prologue.startedAt) / 1000,
        ),
      );
      if (elapsed === state.prologue.elapsed) return state;
      const next = { ...state, prologue: { ...state.prologue, elapsed } };
      if (elapsed < PROLOGUE_SECONDS) return next;
      const city = CITIES.find((c) => c.id === state.cityId)!;
      // A late/unavailable POWER response must never hold the child at the end of the cinematic.
      const climate = state.climate ?? {
        ...city.fallback,
        date: "2024-01-15",
        source: "fallback" as const,
        url: climateUrl(city),
      };
      return reduceMission(
        {
          ...next,
          phase: "ready",
          climate,
          learning: { ...state.learning, pending: null, feedback: "none" },
        },
        { type: "START" },
      );
    }
    case "SELECT": {
      if (state.solActual !== 0) return state;
      const city = CITIES.find((c) => c.id === action.cityId)!;
      return {
        ...state,
        phase: "transition",
        cityId: city.id,
        prologue: {
          startedAt: Number.isFinite(action.now) ? action.now! : Date.now(),
          elapsed: 0,
        },
        requestId: action.requestId,
        climate: null,
        resources: {
          ...BASE_RESOURCES,
          agua: Math.min(100, BASE_RESOURCES.agua + city.water),
        },
        modifiers: {
          eficienciaSolar: city.solar,
          aislamientoTermico: city.insulation,
          reservaAguaInicial: city.water,
        },
        logs: [
          ...state.logs.slice(-19),
          {
            id: action.requestId,
            tag: "TU CIUDAD",
            text: `Salimos de ${city.name}. ¡Tu viaje empieza aquí!`,
          },
        ],
      };
    }
    case "CLIMATE":
      return action.requestId === state.requestId
        ? { ...state, climate: action.climate }
        : state;
    case "TRANSITION_DONE":
      return action.requestId === state.requestId &&
        state.phase === "transition"
        ? { ...state, phase: "ready" }
        : state;
    case "START":
      return state.phase === "ready" &&
        state.climate &&
        state.prologue.elapsed >= PROLOGUE_SECONDS
        ? {
            ...state,
            solActual: 1,
            phase: "sol1",
            checkpoint: { ...state.resources },
            logs: [
              ...state.logs,
              {
                id: state.requestId + 1,
                tag: "DÍA 1 · AGUA Y PLANTAS",
                text: PROLOGUE_SURVIVED,
              },
            ],
          }
        : state;
    case "CALIBRATE":
      return state.phase === "sol1" &&
        !["complete", "failed"].includes(state.greenhouse.status) &&
        Number.isFinite(action.value)
        ? {
            ...state,
            greenhouse: {
              ...state.greenhouse,
              [action.field]: Math.max(
                0,
                Math.min(100, Math.round(action.value)),
              ),
            },
          }
        : state;
    case "GREENHOUSE_START":
      return state.phase === "sol1" &&
        ["idle", "paused"].includes(state.greenhouse.status)
        ? { ...state, greenhouse: { ...state.greenhouse, status: "running" } }
        : state;
    case "GREENHOUSE_PAUSE":
      return state.phase === "sol1" && state.greenhouse.status === "running"
        ? { ...state, greenhouse: { ...state.greenhouse, status: "paused" } }
        : state;
    case "GREENHOUSE_TICK":
      return state.phase === "sol1" && state.greenhouse.status === "running"
        ? advanceGreenhouse(state)
        : state;
    case "RETRY":
      if (state.phase === "sol18")
        return {
          ...state,
          resources: { ...state.checkpoint },
          rescue: {
            ...INITIAL_RESCUE,
            attempt: state.rescue.attempt + 1,
            stormCheckpoint: state.rescue.stormCheckpoint,
          },
        };
      return state.phase === "sol1"
        ? {
            ...state,
            resources: { ...state.checkpoint },
            greenhouse: { ...INITIAL_GREENHOUSE },
          }
        : state.phase === "sol8"
          ? {
              ...state,
              resources: { ...state.checkpoint },
              storm: {
                ...INITIAL_STORM,
                allocation: { ...INITIAL_STORM.allocation },
                history: [],
              },
            }
          : state;
    case "ENTER_STORM": {
      if (state.phase !== "sol1" || state.greenhouse.status !== "complete")
        return state;
      const resources = {
        ...state.resources,
        energia: Math.max(55, state.resources.energia),
      };
      return {
        ...state,
        phase: "sol8",
        solActual: 8,
        resources,
        checkpoint: { ...resources },
        logs: [
          ...state.logs,
          {
            id: state.requestId + 100,
            tag: "DÍA 8 · TORMENTA",
            text: SOL8_LOG,
          },
        ],
      };
    }
    case "ALLOCATE": {
      if (
        state.phase !== "sol8" ||
        ["complete", "failed"].includes(state.storm.status) ||
        ![0, 50].includes(action.level)
      )
        return state;
      const allocation = {
        ...state.storm.allocation,
        [action.system]: action.level,
      };
      if (
        Object.values(allocation).reduce<number>((a, b) => a + b, 0) > 100 ||
        Object.values(allocation).filter((v) => v > 0).length > 2
      )
        return state;
      return { ...state, storm: { ...state.storm, allocation } };
    }
    case "STORM_CYCLE":
      return state.phase === "sol8" &&
        !["complete", "failed"].includes(state.storm.status) &&
        state.storm.cycle < 3
        ? advanceStorm(state)
        : state;
    case "ENTER_RESCUE":
      return state.phase === "sol8" && state.storm.status === "complete"
        ? {
            ...state,
            phase: "sol18",
            solActual: 18,
            checkpoint: { ...state.resources },
            rescue: {
              ...INITIAL_RESCUE,
              attempt: state.rescue.attempt + 1,
              stormCheckpoint: { ...state.checkpoint },
            },
            logs: [
              ...state.logs,
              {
                id: state.requestId + 300,
                tag: "DÍA 18 · LLAMAR A CASA",
                text: SOL18_LOG,
              },
            ],
          }
        : state;
    case "SIGNAL_SET": {
      if (
        state.phase !== "sol18" ||
        !["idle", "tuning"].includes(state.rescue.status) ||
        !Number.isFinite(action.value)
      )
        return state;
      const max =
          action.field === "angle"
            ? 180
            : action.field === "frequency"
              ? 8
              : 360,
        min = action.field === "frequency" ? 1 : 0;
      return {
        ...state,
        rescue: {
          ...state.rescue,
          [action.field]: Math.max(min, Math.min(max, action.value)),
        },
      };
    }
    case "SIGNAL_START":
      return state.phase === "sol18" && state.rescue.status === "idle"
        ? {
            ...state,
            rescue: {
              ...state.rescue,
              status: "tuning",
              startedAt: action.now,
              lastTick: action.now,
            },
          }
        : state;
    case "SIGNAL_TICK":
      return state.phase === "sol18" && state.rescue.status === "tuning"
        ? advanceSignal(state, action.now)
        : state;
    case "SOLAR_EVENT":
      return state.phase === "sol18" &&
        state.rescue.status === "connected" &&
        action.attempt === state.rescue.attempt
        ? {
            ...state,
            rescue: {
              ...state.rescue,
              status: "alert",
              event: action.event,
              alertDeadline: action.now + ALERT_SECONDS * 1000,
              secondsLeft: ALERT_SECONDS,
              message: "¡Alerta solar! Activa el escudo para cuidar al equipo.",
            },
            logs: [
              ...state.logs,
              {
                id: state.requestId + 450 + state.logs.length,
                tag: "NASA DONKI · ALERTA ROJA",
                text: `NASA avisa: llamarada ${action.event.classType}. ¡Activa el escudo!`,
              },
            ],
          }
        : state;
    case "ALERT_TICK":
      return state.phase === "sol18" && state.rescue.status === "alert"
        ? action.now >= state.rescue.alertDeadline
          ? solarImpact(state)
          : {
              ...state,
              rescue: {
                ...state.rescue,
                secondsLeft: Math.ceil(
                  (state.rescue.alertDeadline - action.now) / 1000,
                ),
              },
            }
        : state;
    case "SHIELD": {
      if (state.phase !== "sol18" || state.rescue.status !== "alert")
        return state;
      if (action.now >= state.rescue.alertDeadline) return solarImpact(state);
      if (state.resources.energia < SHIELD_COST)
        return {
          ...state,
          rescue: {
            ...state.rescue,
            message: "Necesitas 15% de batería. Vuelve a limpiar paneles.",
          },
        };
      const message = "¡Escudo Anti-Radiación activo! El equipo está a salvo.";
      return {
        ...state,
        resources: {
          ...state.resources,
          energia: state.resources.energia - SHIELD_COST,
        },
        rescue: { ...state.rescue, status: "complete", message },
        logs: [
          ...state.logs,
          {
            id: state.requestId + 600 + state.logs.length,
            tag: "DÍA 18 · EQUIPO A SALVO",
            text: message,
          },
        ],
      };
    }
    case "RETRY_STORM":
      return state.phase === "sol18" && state.rescue.stormCheckpoint
        ? {
            ...state,
            phase: "sol8",
            solActual: 8,
            resources: { ...state.rescue.stormCheckpoint },
            checkpoint: { ...state.rescue.stormCheckpoint },
            storm: {
              ...INITIAL_STORM,
              allocation: { ...INITIAL_STORM.allocation },
              history: [],
            },
            rescue: { ...INITIAL_RESCUE, attempt: state.rescue.attempt + 1 },
            logs: [
              ...state.logs,
              {
                id: state.requestId + 700 + state.logs.length,
                tag: "VOLVER AL DÍA 8",
                text: "Volvamos a la tormenta. Limpiar paneles recupera batería.",
              },
            ],
          }
        : state;
    case "ENTER_ROVER":
      return state.phase === "sol18" && state.rescue.status === "complete"
        ? {
            ...state,
            phase: "sol28",
            solActual: 28,
            checkpoint: { ...state.resources },
            rover: { ...INITIAL_ROVER },
            logs: [
              ...state.logs,
              {
                id: state.requestId + 750,
                tag: "DÍA 28 · VAMOS A CASA",
                text: "Día 28. ¡Vienen a buscarnos! Sube al rover y elige un camino.",
              },
            ],
          }
        : state;
    case "BOARD_ROVER":
      return state.phase === "sol28" && state.rover.status === "garage"
        ? {
            ...state,
            rover: { ...state.rover, boarded: true, status: "planning" },
          }
        : state;
    case "ROVER_ROUTE":
      return state.phase === "sol28" &&
        state.rover.status === "planning" &&
        ["short", "long"].includes(action.route)
        ? {
            ...state,
            rover: {
              ...state.rover,
              route: action.route,
              status: "ready",
              message:
                action.route === "short"
                  ? "Camino corto: llegaremos de día. Cuida la batería."
                  : "Camino largo: enciende el calor cuando llegue la noche.",
            },
          }
        : state;
    case "ROVER_HEAT":
      return state.phase === "sol28" &&
        ["planning", "ready"].includes(state.rover.status) &&
        ["high", "off"].includes(action.heater)
        ? { ...state, rover: { ...state.rover, heater: action.heater } }
        : state;
    case "ROVER_STEP":
      return state.phase === "sol28" &&
        state.rover.boarded &&
        state.rover.route &&
        state.rover.status === "ready" &&
        action.segment === state.rover.segment + 1 &&
        action.segment <= (state.rover.route === "short" ? 5 : 8)
        ? advanceRover(state)
        : state;
    case "RESET":
      return {
        ...INITIAL_STATE,
        resources: { ...BASE_RESOURCES },
        requestId: state.requestId + 1,
      };
  }
}
export function climateUrl(city: City) {
  return `https://power.larc.nasa.gov/api/temporal/daily/point?${new URLSearchParams({ parameters: "T2M,ALLSKY_SFC_SW_DWN", community: "RE", longitude: String(city.lon), latitude: String(city.lat), start: "20240115", end: "20240115", format: "JSON" })}`;
}
export function parseClimate(data: unknown, url: string): Climate {
  const d = data as {
    properties?: { parameter?: Record<string, Record<string, number>> };
    parameters?: Record<string, { units: string }>;
  };
  const temperature = d.properties?.parameter?.T2M?.["20240115"];
  const rawSolar = d.properties?.parameter?.ALLSKY_SFC_SW_DWN?.["20240115"];
  if (
    typeof temperature !== "number" ||
    typeof rawSolar !== "number" ||
    !Number.isFinite(temperature) ||
    !Number.isFinite(rawSolar) ||
    temperature <= -100 ||
    temperature > 70 ||
    rawSolar < 0 ||
    rawSolar > 50
  )
    throw new Error("Registro POWER inválido");
  const units = d.parameters?.ALLSKY_SFC_SW_DWN?.units;
  const solar = units?.includes("MJ") ? rawSolar / 3.6 : rawSolar;
  return { solar, temperature, date: "2024-01-15", source: "live", url };
}

export function gameReducer(state: GameState, action: Action): GameState {
  if (state.outcome && action.type !== "RESET") return state;
  if (action.type === "SUPPORT_APPLY") return applyHelp(state);
  if (action.type === "SUPPORT_CONTINUE") {
    if (!state.support?.corrected) return state;
    const pause = Math.max(0, action.now - state.support.pausedAt);
    return finalizeMission(
      queueLesson({
        ...state,
        support: null,
        rescue: {
          ...state.rescue,
          startedAt: state.rescue.startedAt + pause,
          lastTick: action.now,
          alertDeadline:
            state.support.cause === "shield"
              ? action.now + ALERT_SECONDS * 1000
              : state.rescue.alertDeadline + pause,
          secondsLeft:
            state.support.cause === "shield"
              ? ALERT_SECONDS
              : state.rescue.secondsLeft,
        },
      }),
    );
  }
  if (action.type === "QUIZ_ANSWER") {
    const q = state.learning.pending;
    if (q === null || state.learning.feedback === "correct") return state;
    const correct = action.answer === LESSONS[q].correct;
    return {
      ...state,
      learning: {
        ...state.learning,
        feedback: correct ? "correct" : "retry",
        answered: correct
          ? [...new Set([...state.learning.answered, q])]
          : state.learning.answered,
      },
    };
  }
  if (action.type === "QUIZ_CONTINUE") {
    const q = state.learning.pending;
    if (q === null || state.learning.feedback !== "correct") return state;
    const clean = {
      ...state,
      learning: { ...state.learning, pending: null, feedback: "none" as const },
    };
    const next =
      q === 0
        ? reduceMission(clean, { type: "START" })
        : q === 1
          ? reduceMission(clean, { type: "ENTER_STORM" })
          : q === 8
            ? reduceMission(clean, { type: "ENTER_RESCUE" })
            : q === 18
              ? reduceMission(clean, { type: "ENTER_ROVER" })
              : clean;
    return finalizeMission(next);
  }
  const gate =
    action.type === "ENTER_STORM"
      ? 1
      : action.type === "ENTER_RESCUE"
        ? 8
        : action.type === "ENTER_ROVER"
          ? 18
          : null;
  if (gate !== null && !state.learning.answered.includes(gate)) return state;
  const ticking = [
    "GREENHOUSE_TICK",
    "STORM_CYCLE",
    "SIGNAL_TICK",
    "ALERT_TICK",
    "ROVER_STEP",
    "SIGNAL_START",
    "GREENHOUSE_START",
    "ENTER_STORM",
    "ENTER_RESCUE",
    "ENTER_ROVER",
    "BOARD_ROVER",
  ];
  if (
    (state.support || state.learning.pending !== null) &&
    ticking.includes(action.type)
  )
    return state;
  if (
    (action.type === "ALERT_TICK" || action.type === "SHIELD") &&
    state.rescue.status === "alert" &&
    !state.support
  ) {
    if (action.now >= state.rescue.alertDeadline)
      return {
        ...state,
        rescue: { ...state.rescue, secondsLeft: 0 },
        support: { cause: "shield", pausedAt: action.now, corrected: false },
      };
    if (action.type === "SHIELD" && state.resources.energia < SHIELD_COST)
      return {
        ...state,
        support: { cause: "battery", pausedAt: action.now, corrected: false },
      };
  }
  const next = reduceMission(state, action);
  if (action.type === "RESET") return next;
  const cause = danger(next);
  if (cause && !next.support)
    return {
      ...next,
      support: { cause, pausedAt: Date.now(), corrected: false },
      greenhouse: {
        ...next.greenhouse,
        status:
          next.greenhouse.status === "running"
            ? "paused"
            : next.greenhouse.status,
      },
    };
  return finalizeMission(queueLesson(next));
}
