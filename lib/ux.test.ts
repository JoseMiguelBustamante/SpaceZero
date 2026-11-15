import test from "node:test";
import assert from "node:assert/strict";
import {
  gameReducer,
  INITIAL_STATE,
  CITIES,
  type GameState,
  type CityId,
  type SystemId,
} from "./game";
import { HISTORICAL_FLARE } from "./donki";
import { ALERT_SECONDS, SHIELD_COST, SAFE_WATER, missionObjective } from "./ux";
import { PROLOGUE_SURVIVED } from "./prologue";
import { alignment } from "./rescue";
import { LESSONS, type LessonSol } from "./learning";
import { ROUTES, type RoverRoute } from "./rover";
function learn(s: GameState, sol: LessonSol) {
  assert.equal(s.learning.pending, sol);
  s = gameReducer(s, { type: "QUIZ_ANSWER", answer: LESSONS[sol].correct });
  return gameReducer(s, { type: "QUIZ_CONTINUE" });
}
function launch(cityId: CityId): GameState {
  let s = gameReducer(structuredClone(INITIAL_STATE), {
    type: "SELECT",
    cityId,
    requestId: 1,
  });
  s = gameReducer(s, {
    type: "CLIMATE",
    requestId: 1,
    climate: {
      ...CITIES.find((c) => c.id === cityId)!.fallback,
      date: "2024-01-15",
      source: "fallback",
      url: "https://power.larc.nasa.gov/",
    },
  });
  s = gameReducer(s, { type: "TRANSITION_DONE", requestId: 1 });
  return gameReducer(s, {
    type: "PROLOGUE_TICK",
    requestId: s.requestId,
    now: s.prologue.startedAt! + 20000,
  });
}
function plants(cityId: CityId, h = 35) {
  let s = launch(cityId);
  s = gameReducer(s, { type: "CALIBRATE", field: "hydrogen", value: h });
  s = gameReducer(s, { type: "GREENHOUSE_START" });
  for (let i = 0; i < 25; i++) s = gameReducer(s, { type: "GREENHOUSE_TICK" });
  return s;
}
function choose(s: GameState, systems: SystemId[]) {
  for (const id of ["heating", "oxygen", "lights", "eva"] as SystemId[])
    s = gameReducer(s, { type: "ALLOCATE", system: id, level: 0 });
  for (const system of systems)
    s = gameReducer(s, { type: "ALLOCATE", system, level: 50 });
  return s;
}
for (const city of CITIES)
  for (const route of ["short", "long"] as RoverRoute[])
    test(`${city.name}: recorrido completo y fácil por ${ROUTES[route].name}`, () => {
      let s = plants(city.id);
      assert.equal(s.greenhouse.status, "complete");
      assert.ok(s.resources.oxigeno >= 70);
      assert.ok(s.resources.energia >= 60);
      s = learn(s, 1);
      const plans: SystemId[][] = [
        ["heating", "lights"],
        ["lights", "eva"],
        ["heating", "oxygen"],
      ];
      for (const plan of plans) {
        s = choose(s, plan);
        assert.equal(
          Object.values(s.storm.allocation).filter((v) => v > 0).length,
          2,
        );
        s = gameReducer(s, { type: "STORM_CYCLE" });
      }
      assert.equal(s.storm.status, "complete");
      assert.ok(s.resources.saludCosecha > 0);
      assert.equal(s.storm.evaRadiation, 6);
      s = learn(s, 8);
      for (const [field, value] of [
        ["angle", 90],
        ["frequency", 5.2],
        ["phase", 125],
      ] as const)
        s = gameReducer(s, { type: "SIGNAL_SET", field, value });
      assert.ok(alignment(s.rescue) >= 82 && alignment(s.rescue) < 90);
      s = gameReducer(s, { type: "SIGNAL_START", now: 1000 });
      for (let t = 1100; t <= 7000 && s.rescue.status === "tuning"; t += 100)
        s = gameReducer(s, { type: "SIGNAL_TICK", now: t });
      assert.equal(s.rescue.status, "connected");
      const before = s.resources.energia;
      s = gameReducer(s, {
        type: "SOLAR_EVENT",
        attempt: s.rescue.attempt,
        event: HISTORICAL_FLARE,
        now: 10000,
      });
      assert.equal(s.rescue.secondsLeft, 10);
      s = gameReducer(s, { type: "SHIELD", now: 19500 });
      assert.equal(s.rescue.status, "complete");
      assert.equal(s.resources.energia, before - SHIELD_COST);
      s = learn(s, 18);
      s = gameReducer(s, { type: "BOARD_ROVER" });
      s = gameReducer(s, { type: "ROVER_ROUTE", route });
      for (let n = 1; n <= ROUTES[route].segments; n++)
        s = gameReducer(s, { type: "ROVER_STEP", segment: n });
      assert.equal(s.learning.pending, 28);
      s = learn(s, 28);
      assert.equal(s.outcome?.success, true);
      assert.ok(s.resources.energia >= 15);
      assert.ok(s.rover.bodyTemperature >= 35);
      for (const log of s.logs)
        assert.ok(
          log.text === PROLOGUE_SURVIVED || log.text.length <= 85,
          `Mensaje largo: ${log.text}`,
        );
    });
test("toda la franja verde es segura durante los 25 segundos", () => {
  for (const c of CITIES)
    for (const h of [SAFE_WATER.min, 40, SAFE_WATER.max]) {
      const s = plants(c.id, h);
      assert.equal(s.greenhouse.status, "complete");
      assert.ok(s.resources.oxigeno >= 70);
      assert.ok(s.greenhouse.risk < 45);
      assert.ok(s.resources.agua > 70);
    }
});
test("las seis parejas de interruptores dejan sobrevivir a un principiante", () => {
  const ids: SystemId[] = ["heating", "oxygen", "lights", "eva"];
  for (const c of CITIES)
    for (let a = 0; a < 4; a++)
      for (let b = a + 1; b < 4; b++) {
        let s = learn(plants(c.id), 1);
        s = choose(s, [ids[a], ids[b]]);
        for (let n = 0; n < 3; n++) {
          s = gameReducer(s, { type: "STORM_CYCLE" });
          if (s.support) {
            s = gameReducer(s, { type: "SUPPORT_APPLY" });
            s = gameReducer(s, { type: "SUPPORT_CONTINUE", now: Date.now() });
          }
        }
        assert.equal(s.outcome, null);
        assert.equal(s.storm.status, "complete");
        assert.ok(s.resources.energia >= SHIELD_COST + 15);
        assert.ok(s.resources.oxigeno > 30);
      }
});
test("leer y preparar controles no consume reservas; pausar impide cobros", () => {
  let s = launch("santa-cruz");
  const r = structuredClone(s.resources);
  for (let n = 0; n < 60; n++) s = gameReducer(s, { type: "GREENHOUSE_TICK" });
  assert.deepEqual(s.resources, r);
  s = gameReducer(s, { type: "GREENHOUSE_START" });
  s = gameReducer(s, { type: "GREENHOUSE_PAUSE" });
  for (let n = 0; n < 60; n++) s = gameReducer(s, { type: "GREENHOUSE_TICK" });
  assert.deepEqual(s.resources, r);
});
test("objetivos cortos indican lugar y acción sin términos difíciles", () => {
  let s = launch("uyuni");
  assert.match(missionObjective(s), /Invernadero.*agua/);
  s = learn(plants("uyuni"), 1);
  assert.match(missionObjective(s), /Refugio/);
  assert.match(missionObjective(s, true), /paneles/);
  for (const sol of [0, 1, 8, 18, 28] as const) {
    const text = missionObjective({ ...s, solActual: sol });
    assert.ok(text.startsWith("Objetivo: "));
    assert.ok(text.length <= 75);
  }
});
test("la alerta dura diez segundos y Chispa ayuda al agotarse el reloj", () => {
  let s: GameState = {
    ...structuredClone(INITIAL_STATE),
    phase: "sol18",
    solActual: 18,
    rescue: { ...INITIAL_STATE.rescue, status: "connected" },
  };
  s = gameReducer(s, {
    type: "SOLAR_EVENT",
    attempt: 0,
    event: HISTORICAL_FLARE,
    now: 1000,
  });
  assert.equal(ALERT_SECONDS, 10);
  assert.equal(
    gameReducer(s, { type: "ALERT_TICK", now: 10000 }).rescue.status,
    "alert",
  );
  assert.equal(
    gameReducer(s, { type: "ALERT_TICK", now: 11000 }).support?.cause,
    "shield",
  );
});
