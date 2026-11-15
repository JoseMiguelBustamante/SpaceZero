import test from "node:test";
import assert from "node:assert/strict";
import { INITIAL_STATE, gameReducer, type GameState, type Sol } from "./game";
import {
  ROUTES,
  forecastRoverStep,
  terrainPath,
  terrainHeightAt,
  roverNight,
  roverKeyboardStep,
  type RoverHeat,
  type RoverRoute,
} from "./rover";
import { finalizeMission, VITALS } from "./mission-outcome";
import { LESSONS } from "./learning";
import { HISTORICAL_FLARE } from "./donki";
function base(energy = 40, insulation = 1): GameState {
  return {
    ...structuredClone(INITIAL_STATE),
    learning: { answered: [0, 1, 8, 18], pending: null, feedback: "none" },
    cityId: "uyuni",
    phase: "sol18",
    solActual: 18,
    modifiers: { ...INITIAL_STATE.modifiers, aislamientoTermico: insulation },
    resources: { ...INITIAL_STATE.resources, energia: energy },
    greenhouse: {
      ...INITIAL_STATE.greenhouse,
      growth: 100,
      status: "complete",
    },
    rescue: {
      ...INITIAL_STATE.rescue,
      status: "complete",
      event: { ...HISTORICAL_FLARE },
    },
  };
}
function start(route: RoverRoute = "short", energy = 40, insulation = 1) {
  let s = gameReducer(base(energy, insulation), { type: "ENTER_ROVER" });
  s = gameReducer(s, { type: "BOARD_ROVER" });
  return gameReducer(s, { type: "ROVER_ROUTE", route });
}
function drive(s: GameState, heat: RoverHeat = "high") {
  s = gameReducer(s, { type: "ROVER_HEAT", heater: heat });
  return gameReducer(s, { type: "ROVER_STEP", segment: s.rover.segment + 1 });
}
function finish(s: GameState, heat: RoverHeat = "high") {
  const total = s.rover.route === "short" ? 5 : 8;
  for (let n = 0; n < 15 && !s.outcome; n++) {
    if (s.support) {
      s = gameReducer(s, { type: "SUPPORT_APPLY" });
      s = gameReducer(s, { type: "SUPPORT_CONTINUE", now: Date.now() });
    }
    if (s.learning.pending === 28) {
      s = gameReducer(s, { type: "QUIZ_ANSWER", answer: LESSONS[28].correct });
      s = gameReducer(s, { type: "QUIZ_CONTINUE" });
    } else if (s.rover.segment < total) s = drive(s, heat);
  }
  return s;
}
test("Sol 28 exige rescate completo y abordar el garaje; conserva todos los recursos", () => {
  const initial = base(17);
  assert.equal(
    gameReducer(
      { ...initial, rescue: { ...initial.rescue, status: "idle" } },
      { type: "ENTER_ROVER" },
    ).solActual,
    18,
  );
  let s = gameReducer(initial, { type: "ENTER_ROVER" });
  assert.equal(s.solActual, 28);
  assert.deepEqual(s.resources, initial.resources);
  assert.equal(s.rover.boarded, false);
  assert.equal(gameReducer(s, { type: "ROVER_ROUTE", route: "long" }), s);
  s = gameReducer(s, { type: "BOARD_ROVER" });
  assert.equal(s.rover.status, "planning");
  s = gameReducer(s, { type: "ROVER_ROUTE", route: "long" });
  assert.equal(gameReducer(s, { type: "ROVER_ROUTE", route: "short" }), s);
  assert.equal(s.rover.route, "long");
});
test("tracción corta consume exactamente el doble; calefacción es un coste separado", () => {
  const a = forecastRoverStep(start("short")),
    b = forecastRoverStep(start("long"));
  assert.equal(a.driveCost, b.driveCost * 2);
  assert.equal(a.heatCost, 0.4);
  assert.equal(a.totalCost, 2.2);
  assert.ok(Math.abs(b.totalCost - 1.3) < 1e-9);
});
test("cinco hitos completan 25 km diurnos y ocho completan 40 km", () => {
  const short = finish(start()),
    long = finish(start("long"));
  assert.equal(short.rover.segment, 5);
  assert.equal(short.rover.history.at(-1)?.distance, 25);
  assert.equal(
    short.rover.history.some((l) => l.night),
    false,
  );
  assert.equal(long.rover.segment, 8);
  assert.equal(long.rover.history.at(-1)?.distance, 40);
  assert.deepEqual(
    long.rover.history.map((l) => l.night),
    [false, false, false, false, true, true, true, true],
  );
  assert.equal(roverNight("long", 4), true);
});
test("no se pueden saltar ni cobrar dos veces los hitos", () => {
  let s = start();
  assert.equal(gameReducer(s, { type: "ROVER_STEP", segment: 2 }), s);
  s = drive(s);
  const same = gameReducer(s, { type: "ROVER_STEP", segment: 1 });
  assert.equal(same, s);
  assert.equal(s.rover.history.length, 1);
  assert.equal(s.resources.energia, 37.8);
});
test("aislamiento boliviano modifica el enfriamiento corporal y no recarga la batería", () => {
  const santa = drive(start("short", 20, 0.8), "off"),
    paz = drive(start("short", 20, 1.2), "off");
  assert.ok(paz.rover.bodyTemperature > santa.rover.bodyTemperature);
  assert.equal(paz.resources.energia, santa.resources.energia);
  assert.equal(paz.resources.energia, 18.2);
});
test("calefacción encendida usa batería y protege del frío", () => {
  const on = drive(start(), "high"),
    off = drive(start(), "off");
  assert.ok(on.rover.bodyTemperature > off.rover.bodyTemperature);
  assert.ok(on.resources.energia < off.resources.energia);
});

test("ambas rutas son viables con la reserva heredada de la partida estándar de Uyuni", () => {
  for (const r of ["short", "long"] as RoverRoute[]) {
    const s = finish(start(r, 15.04));
    assert.equal(s.outcome?.success, true);
    assert.ok(s.outcome?.success);
    assert.ok(s.resources.energia > 0);
  }
});
test("la noche sin calor activa ayuda; encenderlo permite seguir sin perder medallas", () => {
  let s = start("long", 30, 0.8);
  for (let n = 0; n < 8 && !s.support; n++) s = drive(s, "off");
  assert.equal(s.support?.cause, "cold");
  assert.equal(s.outcome, null);
  const paused = gameReducer(s, {
    type: "ROVER_STEP",
    segment: s.rover.segment + 1,
  });
  assert.equal(paused, s);
  s = gameReducer(s, { type: "SUPPORT_APPLY" });
  assert.equal(s.rover.heater, "high");
  s = gameReducer(s, { type: "SUPPORT_CONTINUE", now: Date.now() });
  assert.ok(finish(s).outcome?.success);
});
test("llegar con batería baja permite ayuda antes de recibir el diploma", () => {
  let s = start("short", 40);
  for (let i = 0; i < 4; i++) s = drive(s);
  s = { ...s, resources: { ...s.resources, energia: 2.2 } };
  s = drive(s);
  assert.equal(s.outcome, null);
  assert.equal(s.support?.cause, "battery");
  s = finish(s);
  assert.equal(s.outcome?.success, true);
  assert.ok(s.resources.energia > 0);
});
test("un recurso vital a cero pausa para aprender en todos los soles jugables", () => {
  for (const sol of [1, 8, 18, 28] as Sol[])
    for (const [key] of VITALS) {
      const before = {
        ...base(),
        solActual: sol,
        phase: `sol${sol}` as GameState["phase"],
        resources: { ...INITIAL_STATE.resources, [key]: 0 },
      };
      const s = gameReducer(before, { type: "GREENHOUSE_PAUSE" });
      assert.equal(s.outcome, null);
      assert.ok(s.support);
      const fixed = gameReducer(s, { type: "SUPPORT_APPLY" });
      assert.ok(fixed.resources[key] > 0);
    }
});
test("radiación cero es segura; Chispa también puede ayudar a recuperar las plantas", () => {
  const s = start();
  s.resources.saludCosecha = 0;
  assert.equal(finalizeMission(s).outcome, null);
  assert.ok(finish(s).outcome?.success);
});
test("dossier congela acciones y reset borra ruta, telemetría, ciudad, evento NASA y exposición EVA", () => {
  const s = finish(start());
  assert.equal(gameReducer(s, { type: "ENTER_STORM" }), s);
  assert.equal(gameReducer(s, { type: "ROVER_STEP", segment: 6 }), s);
  assert.equal(
    gameReducer(s, { type: "SELECT", cityId: "la-paz", requestId: 42 }),
    s,
  );
  const reset = gameReducer(s, { type: "RESET" });
  assert.equal(reset.phase, "origin");
  assert.equal(reset.solActual, 0);
  assert.equal(reset.cityId, null);
  assert.equal(reset.climate, null);
  assert.equal(reset.outcome, null);
  assert.equal(reset.rover.boarded, false);
  assert.deepEqual(reset.rover.history, []);
  assert.equal(reset.rescue.event, null);
  assert.equal(reset.storm.evaRadiation, 0);
  assert.deepEqual(reset.resources, INITIAL_STATE.resources);
});
test("relieve y rutas procedurales permanecen en la malla; destinos fuera de mapa se rechazan", () => {
  assert.deepEqual(terrainPath({ x: 1, y: 8 }, { x: -1, y: 8 }), []);
  for (const route of Object.values(ROUTES))
    for (const p of route.points) {
      assert.ok(Number.isFinite(terrainHeightAt(p)));
      assert.ok(p.x >= 0 && p.x < 10 && p.y >= 0 && p.y < 10);
    }
  assert.deepEqual(terrainPath({ x: 1, y: 8 }, { x: 3, y: 6 }), [
    { x: 1, y: 8 },
    { x: 2, y: 7 },
    { x: 3, y: 6 },
  ]);
});

test("WASD y flechas del rover apuntan a la pantalla, atraviesan el terreno libre y respetan el borde", () => {
  assert.deepEqual(roverKeyboardStep({ x: 3, y: 3 }, new Set(["d"])), {
    x: 4,
    y: 2,
  });
  assert.deepEqual(roverKeyboardStep({ x: 3, y: 3 }, new Set(["arrowright"])), {
    x: 4,
    y: 2,
  });
  assert.deepEqual(roverKeyboardStep({ x: 3, y: 3 }, new Set(["w"])), {
    x: 2,
    y: 2,
  });
  assert.equal(roverKeyboardStep({ x: 0, y: 0 }, new Set(["w"])), null);
  assert.equal(roverKeyboardStep({ x: 3, y: 3 }, new Set(["w", "s"])), null);
});

test("la telemetría EVA acumula solo exposición confirmada y separa radiación solar", () => {
  let s: GameState = {
    ...base(),
    phase: "sol8",
    solActual: 8,
    storm: {
      ...INITIAL_STATE.storm,
      allocation: { heating: 0, oxygen: 0, lights: 50, eva: 50 },
    },
  };
  s.resources.radiacionTripulacion = 10;
  s = gameReducer(s, { type: "STORM_CYCLE" });
  assert.equal(s.storm.evaRadiation, 6);
  assert.equal(s.resources.radiacionTripulacion, 16);
  s = gameReducer(s, { type: "ALLOCATE", system: "eva", level: 50 });
  s = gameReducer(s, { type: "STORM_CYCLE" });
  assert.equal(s.storm.evaRadiation, 12);
  assert.equal(s.resources.radiacionTripulacion, 22);
});
