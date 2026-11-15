import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CITIES,
  INITIAL_STATE,
  gameReducer,
  parseClimate,
  climateUrl,
  type GameState,
  type Action,
} from "./game";
test("city bonuses are applied from baseline, never stacked by repeated selection", () => {
  let state = gameReducer(INITIAL_STATE, {
    type: "SELECT",
    cityId: "santa-cruz",
    requestId: 1,
  });
  assert.equal(state.resources.agua, 85);
  assert.equal(state.modifiers.aislamientoTermico, 0.8);
  state = gameReducer(state, {
    type: "SELECT",
    cityId: "santa-cruz",
    requestId: 2,
  });
  assert.equal(state.resources.agua, 85);
  state = gameReducer(state, { type: "SELECT", cityId: "uyuni", requestId: 3 });
  assert.equal(state.resources.agua, 70);
  assert.equal(state.modifiers.aislamientoTermico, 1);
  assert.equal(state.modifiers.eficienciaSolar, 1.2);
  state = gameReducer(state, {
    type: "SELECT",
    cityId: "la-paz",
    requestId: 4,
  });
  assert.equal(state.modifiers.aislamientoTermico, 1.2);
  assert.equal(state.modifiers.eficienciaSolar, 1);
});
test("stale network responses and animation completions cannot override a new origin", () => {
  let state = gameReducer(INITIAL_STATE, {
    type: "SELECT",
    cityId: "santa-cruz",
    requestId: 1,
  });
  state = gameReducer(state, { type: "SELECT", cityId: "uyuni", requestId: 2 });
  assert.equal(
    gameReducer(state, { type: "TRANSITION_DONE", requestId: 1 }),
    state,
  );
  assert.equal(
    gameReducer(state, {
      type: "CLIMATE",
      requestId: 1,
      climate: {
        solar: 1,
        temperature: 1,
        date: "2024-01-15",
        source: "live",
        url: "",
      },
    }),
    state,
  );
});
test("Sol 1 starts after the twenty-second prologue; origin locks after launch", () => {
  let state = gameReducer(INITIAL_STATE, {
    type: "SELECT",
    cityId: "la-paz",
    requestId: 1,
  });
  assert.equal(gameReducer(state, { type: "START" }).solActual, 0);
  state = gameReducer(state, { type: "TRANSITION_DONE", requestId: 1 });
  assert.equal(gameReducer(state, { type: "START" }).solActual, 0);
  state = gameReducer(state, {
    type: "CLIMATE",
    requestId: 1,
    climate: {
      solar: 5.921,
      temperature: 9.08,
      date: "2024-01-15",
      source: "fallback",
      url: "",
    },
  });
  state = gameReducer(state, {
    type: "PROLOGUE_TICK",
    requestId: state.requestId,
    now: state.prologue.startedAt! + 20000,
  });
  assert.equal(state.solActual, 1);
  assert.equal(state.phase, "sol1");
  assert.equal(state.resources.agua, 70);
  assert.equal(
    gameReducer(state, { type: "SELECT", cityId: "santa-cruz", requestId: 2 }),
    state,
  );
  const reset = gameReducer(state, { type: "RESET" });
  assert.equal(reset.solActual, 0);
  assert.equal(reset.cityId, null);
  assert.equal(reset.climate, null);
});
test("bundled fallback values match archived NASA POWER responses for every coordinate", () => {
  for (const city of CITIES) {
    const raw = JSON.parse(readFileSync(`public/data/${city.id}.json`, "utf8"));
    const climate = parseClimate(raw, climateUrl(city));
    assert.equal(climate.solar, city.fallback.solar);
    assert.equal(climate.temperature, city.fallback.temperature);
    assert.equal(raw.geometry.coordinates[0], Number(city.lon.toFixed(3)));
    assert.equal(raw.geometry.coordinates[1], Number(city.lat.toFixed(3)));
  }
});
test("POWER missing-data and malformed responses are rejected; MJ units are converted", () => {
  for (const d of [
    {},
    {
      properties: {
        parameter: {
          T2M: { 20240115: -999 },
          ALLSKY_SFC_SW_DWN: { 20240115: 2 },
        },
      },
    },
    {
      properties: {
        parameter: {
          T2M: { 20240115: 20 },
          ALLSKY_SFC_SW_DWN: { 20240115: -999 },
        },
      },
    },
  ])
    assert.throws(() => parseClimate(d, ""));
  assert.equal(
    parseClimate(
      {
        properties: {
          parameter: {
            T2M: { 20240115: 20 },
            ALLSKY_SFC_SW_DWN: { 20240115: 18 },
          },
        },
        parameters: { ALLSKY_SFC_SW_DWN: { units: "MJ/m^2/day" } },
      },
      "",
    ).solar,
    5,
  );
});

test("balanced greenhouse completes in exactly 25 ticks and keeps resources bounded", () => {
  let state = gameReducer(INITIAL_STATE, {
    type: "SELECT",
    cityId: "uyuni",
    requestId: 1,
  });
  state = gameReducer(state, { type: "TRANSITION_DONE", requestId: 1 });
  state = gameReducer(state, {
    type: "CLIMATE",
    requestId: 1,
    climate: {
      solar: 7.6766,
      temperature: 14.6,
      date: "2024-01-15",
      source: "fallback",
      url: "",
    },
  });
  state = gameReducer(state, {
    type: "PROLOGUE_TICK",
    requestId: state.requestId,
    now: state.prologue.startedAt! + 20000,
  });
  state = gameReducer(state, { type: "GREENHOUSE_START" });
  for (let i = 0; i < 25; i++)
    state = gameReducer(state, { type: "GREENHOUSE_TICK" });
  assert.equal(state.greenhouse.status, "complete");
  assert.equal(state.greenhouse.elapsed, 25);
  assert.ok(state.greenhouse.growth >= 50);
  assert.ok(state.resources.oxigeno > 30);
  for (const [key, value] of Object.entries(state.resources)) {
    if (key !== "temperaturaCabina") assert.ok(value >= 0 && value <= 100, key);
  }
  assert.equal(gameReducer(state, { type: "GREENHOUSE_TICK" }), state);
  state = gameReducer(state, { type: "QUIZ_ANSWER", answer: 1 });
  const storm = gameReducer(state, { type: "QUIZ_CONTINUE" });
  assert.equal(storm.solActual, 8);
  assert.equal(storm.resources.energia, state.resources.energia);
  assert.equal(storm.resources.agua, state.resources.agua);
});
function readySol1(): GameState {
  return {
    ...INITIAL_STATE,
    solActual: 1 as const,
    phase: "sol1" as const,
    checkpoint: { ...INITIAL_STATE.resources },
    greenhouse: { ...INITIAL_STATE.greenhouse, status: "running" as const },
  };
}
test("pause stops greenhouse; high hydrogen raises danger; low hydrogen damages harvest", () => {
  let s = readySol1();
  s = gameReducer(s, { type: "GREENHOUSE_PAUSE" });
  assert.equal(gameReducer(s, { type: "GREENHOUSE_TICK" }), s);
  let high = gameReducer(readySol1(), {
    type: "CALIBRATE",
    field: "hydrogen",
    value: 100,
  });
  for (let i = 0; i < 20; i++)
    high = gameReducer(high, { type: "GREENHOUSE_TICK" });
  assert.ok(high.greenhouse.risk >= 75);
  assert.ok(high.resources.oxigeno < 80);
  let low = gameReducer(readySol1(), {
    type: "CALIBRATE",
    field: "hydrogen",
    value: 0,
  });
  for (let i = 0; i < 25; i++)
    low = gameReducer(low, { type: "GREENHOUSE_TICK" });
  assert.equal(low.greenhouse.status, "failed");
  assert.ok(low.resources.saludCosecha < 100);
  const retry = gameReducer(low, { type: "RETRY" });
  assert.deepEqual(retry.resources, retry.checkpoint);
  assert.equal(retry.greenhouse.elapsed, 0);
});
function readyStorm(): GameState {
  return {
    ...INITIAL_STATE,
    learning: { answered: [0, 1, 8], pending: null, feedback: "none" },
    phase: "sol8" as const,
    solActual: 8 as const,
    resources: { ...INITIAL_STATE.resources, energia: 35 },
    checkpoint: { ...INITIAL_STATE.resources, energia: 35 },
    storm: {
      ...INITIAL_STATE.storm,
      allocation: { ...INITIAL_STATE.storm.allocation },
      history: [],
    },
  };
}
test("storm budget strictly rejects excess allocation and three simultaneous maximum systems", () => {
  let s = readyStorm();
  for (const system of ["heating", "oxygen", "lights", "eva"] as const)
    s = gameReducer(s, { type: "ALLOCATE", system, level: 0 });
  s = gameReducer(s, { type: "ALLOCATE", system: "heating", level: 50 });
  s = gameReducer(s, { type: "ALLOCATE", system: "oxygen", level: 50 });
  assert.equal(
    gameReducer(s, { type: "ALLOCATE", system: "lights", level: 50 }),
    s,
  );
  assert.equal(
    gameReducer(s, {
      type: "ALLOCATE",
      system: "lights",
      level: 20,
    } as unknown as Action),
    s,
  );
  assert.equal(
    Object.values(s.storm.allocation).reduce<number>((a, b) => a + b, 0),
    100,
  );
});
test("three unlit cycles kill harvest; lights prevent it; insulation affects hypothermia", () => {
  let s = readyStorm();
  s.storm.allocation = { heating: 50, oxygen: 50, lights: 0, eva: 0 };
  for (let i = 0; i < 3; i++) s = gameReducer(s, { type: "STORM_CYCLE" });
  assert.equal(s.storm.darkCycles, 3);
  assert.equal(s.resources.saludCosecha, 0);
  assert.equal(s.storm.status, "complete");
  assert.equal(gameReducer(s, { type: "STORM_CYCLE" }), s);
  let warm = readyStorm();
  warm.modifiers = { ...warm.modifiers, aislamientoTermico: 1.2 };
  let cold = readyStorm();
  cold.modifiers = { ...cold.modifiers, aislamientoTermico: 0.8 };
  for (let i = 0; i < 3; i++) {
    warm = gameReducer(warm, { type: "STORM_CYCLE" });
    cold = gameReducer(cold, { type: "STORM_CYCLE" });
  }
  assert.ok(
    warm.resources.temperaturaCabina > cold.resources.temperaturaCabina,
  );
  assert.ok(
    warm.resources.integridadTripulacion >=
      cold.resources.integridadTripulacion,
  );
  assert.equal(warm.resources.saludCosecha, 100);
});
test("EVA recovers energy with Uyuni bonus and radiation cost; three-cycle survival is achievable", () => {
  let normal = readyStorm();
  normal.storm.allocation = { heating: 0, oxygen: 0, lights: 50, eva: 50 };
  let uyuni = {
    ...normal,
    modifiers: { ...normal.modifiers, eficienciaSolar: 1.2 },
  };
  normal = gameReducer(normal, { type: "STORM_CYCLE" });
  uyuni = gameReducer(uyuni, { type: "STORM_CYCLE" });
  assert.ok(uyuni.resources.energia > normal.resources.energia);
  assert.equal(uyuni.resources.radiacionTripulacion, 6);
  for (let i = 1; i < 3; i++)
    uyuni = gameReducer(uyuni, { type: "STORM_CYCLE" });
  assert.equal(uyuni.storm.status, "complete");
  assert.equal(uyuni.storm.cycle, 3);
  assert.ok(uyuni.resources.energia > 0);
  assert.ok(uyuni.resources.saludCosecha > 0);
  assert.equal(uyuni.storm.history.length, 3);
});

test("Sol 18 is gated behind three completed storm cycles and preserves resources", () => {
  const s = readyStorm();
  assert.equal(gameReducer(s, { type: "ENTER_RESCUE" }), s);
  const complete = {
    ...s,
    storm: { ...s.storm, status: "complete" as const, cycle: 3 },
  };
  const rescue = gameReducer(complete, { type: "ENTER_RESCUE" });
  assert.equal(rescue.solActual, 18);
  assert.deepEqual(rescue.resources, complete.resources);
  assert.deepEqual(rescue.checkpoint, complete.resources);
  assert.equal(rescue.rescue.status, "idle");
});
test("perfect signal reaches 100%; wrong signal expires at twenty real seconds", () => {
  let s: GameState = {
    ...INITIAL_STATE,
    solActual: 18,
    phase: "sol18",
    rescue: { ...INITIAL_STATE.rescue, angle: 120, frequency: 4.2, phase: 90 },
  };
  s = gameReducer(s, { type: "SIGNAL_START", now: 1000 });
  for (let now = 1100; now <= 4700 && s.rescue.status === "tuning"; now += 100)
    s = gameReducer(s, { type: "SIGNAL_TICK", now });
  assert.equal(s.rescue.status, "connected");
  assert.equal(s.rescue.progress, 100);
  assert.ok(s.rescue.elapsed < 4);
  let bad: GameState = {
    ...INITIAL_STATE,
    solActual: 18,
    phase: "sol18",
    rescue: { ...INITIAL_STATE.rescue },
  };
  bad = gameReducer(bad, { type: "SIGNAL_START", now: 1000 });
  bad = gameReducer(bad, { type: "SIGNAL_TICK", now: 21001 });
  assert.equal(bad.rescue.status, "failed");
  assert.equal(bad.rescue.elapsed, 20);
});
import { HISTORICAL_FLARE, latestFlare, donkiUrl } from "./donki";
function linkedRescue(): GameState {
  return {
    ...INITIAL_STATE,
    solActual: 18,
    phase: "sol18",
    rescue: { ...INITIAL_STATE.rescue, status: "connected", attempt: 2 },
  };
}
test("DONKI ignores invalid and old flares, sorts recent events and handles missing regions", () => {
  const now = Date.parse("2026-11-14T12:00:00Z");
  const event = latestFlare(
    [
      { classType: "X8.7", peakTime: "2024-05-14T16:51Z" },
      {
        classType: "M2.1",
        peakTime: "2026-11-12T02:00Z",
        activeRegionNum: 14300,
      },
      { classType: "C4.2", peakTime: "2026-11-13T18:00Z" },
      { classType: "invalid", peakTime: "2026-11-14T10:00Z" },
    ],
    now,
  );
  assert.equal(event.classType, "C4.2");
  assert.equal(event.activeRegion, "No informada");
  assert.equal(event.source, "live");
  assert.throws(() => latestFlare([], now));
  assert.throws(() => latestFlare({ error: "rate limit" }, now));
  assert.ok(donkiUrl(new Date(now)).includes("startDate=2026-10-15"));
  assert.equal(HISTORICAL_FLARE.classType, "X8.7");
  assert.equal(HISTORICAL_FLARE.activeRegion, "13664");
});
test("stale DONKI response cannot open an alert in a newer attempt; alert starts after data arrives", () => {
  const s = linkedRescue();
  assert.equal(
    gameReducer(s, {
      type: "SOLAR_EVENT",
      attempt: 1,
      event: HISTORICAL_FLARE,
      now: 1000,
    }),
    s,
  );
  const alert = gameReducer(s, {
    type: "SOLAR_EVENT",
    attempt: 2,
    event: HISTORICAL_FLARE,
    now: 1000,
  });
  assert.equal(alert.rescue.alertDeadline, 11000);
  assert.equal(alert.rescue.secondsLeft, 10);
  assert.equal(alert.rescue.status, "alert");
});
test("shield costs 15 energy and cannot be activated twice or after the ten-second deadline", () => {
  const alert = gameReducer(linkedRescue(), {
    type: "SOLAR_EVENT",
    attempt: 2,
    event: HISTORICAL_FLARE,
    now: 1000,
  });
  const protectedState = gameReducer(alert, { type: "SHIELD", now: 10999 });
  assert.equal(protectedState.rescue.status, "complete");
  assert.equal(protectedState.resources.energia, 70);
  assert.equal(protectedState.resources.radiacionTripulacion, 0);
  assert.equal(
    gameReducer(protectedState, { type: "SHIELD", now: 10999 }),
    protectedState,
  );
  const expired = gameReducer(alert, { type: "SHIELD", now: 11000 });
  assert.equal(expired.support?.cause, "shield");
  assert.equal(expired.resources.radiacionTripulacion, 0);
  assert.equal(expired.resources.integridadTripulacion, 100);
  const lateTick = gameReducer(alert, { type: "ALERT_TICK", now: 50000 });
  assert.equal(lateTick.support?.cause, "shield");
  assert.equal(lateTick.rescue.secondsLeft, 0);
  const low = { ...alert, resources: { ...alert.resources, energia: 14 } };
  const insufficient = gameReducer(low, { type: "SHIELD", now: 2000 });
  assert.equal(insufficient.rescue.status, "alert");
  assert.equal(insufficient.support?.cause, "battery");
  assert.equal(insufficient.resources.energia, 14);
});
test("retry rescue restores chapter checkpoint and can return to storm to rebuild energy reserve", () => {
  const s = linkedRescue();
  s.checkpoint = { ...s.resources, energia: 18 };
  s.rescue.stormCheckpoint = { ...s.resources, energia: 35 };
  const retry = gameReducer(s, { type: "RETRY" });
  assert.equal(retry.resources.energia, 18);
  assert.equal(retry.rescue.attempt, 3);
  assert.equal(retry.rescue.status, "idle");
  const storm = gameReducer(retry, { type: "RETRY_STORM" });
  assert.equal(storm.solActual, 8);
  assert.equal(storm.resources.energia, 35);
  assert.equal(storm.storm.cycle, 0);
});
