import test from "node:test";
import assert from "node:assert/strict";
import { gameReducer, INITIAL_STATE, CITIES, type GameState } from "./game";
import { prologueFrame, PROLOGUE_SURVIVED } from "./prologue";
const selected = (
  id: (typeof CITIES)[number]["id"] = "uyuni",
  requestId = 1,
  now = 1000,
) =>
  gameReducer(structuredClone(INITIAL_STATE), {
    type: "SELECT",
    cityId: id,
    requestId,
    now,
  });
const tick = (s: GameState, seconds: number, requestId = s.requestId) =>
  gameReducer(s, {
    type: "PROLOGUE_TICK",
    requestId,
    now: s.prologue.startedAt! + seconds * 1000,
  });
test("el reloj respeta los límites exactos 0, 10, 16 y 20 sin adelantar la transformación", () => {
  for (const [at, stage, alert, transform] of [
    [0, "earth", false, 0],
    [9.999, "earth", false, 0],
    [10, "warning", true, 0],
    [15.999, "warning", true, 0],
    [16, "transform", true, 0],
    [18, "transform", true, 0.5],
    [19.999, "transform", true, 0.99975],
    [20, "mars", false, 1],
  ] as const) {
    const f = prologueFrame(at);
    assert.equal(f.stage, stage);
    assert.equal(f.alert, alert);
    assert.ok(Math.abs(f.transform - transform) < 1e-9);
  }
});
for (const city of CITIES)
  test(`${city.name}: arranque automático sin botones ni pregunta, conserva datos y bonos`, () => {
    let s = selected(city.id);
    const before = structuredClone(s.resources);
    s = gameReducer(s, {
      type: "CLIMATE",
      requestId: 1,
      climate: {
        ...city.fallback,
        date: "2024-01-15",
        source: "live",
        url: "NASA",
      },
    });
    s = tick(s, 10);
    assert.equal(s.solActual, 0);
    assert.equal(prologueFrame(s.prologue.elapsed).alert, true);
    assert.equal(prologueFrame(s.prologue.elapsed).transform, 0);
    s = tick(s, 16);
    assert.equal(s.solActual, 0);
    s = tick(s, 19.999);
    assert.equal(s.solActual, 0);
    s = tick(s, 20);
    assert.equal(s.solActual, 1);
    assert.equal(s.phase, "sol1");
    assert.equal(s.climate?.source, "live");
    assert.deepEqual(s.resources, before);
    assert.equal(s.learning.pending, null);
    assert.deepEqual(s.learning.answered, []);
    assert.equal(s.logs.at(-1)?.text, PROLOGUE_SURVIVED);
    assert.equal(tick(s, 30), s);
  });
test("sin respuesta POWER al segundo 20 se usa respaldo real y se empieza igualmente", () => {
  const s = tick(selected("la-paz"), 20);
  const c = CITIES.find((c) => c.id === "la-paz")!;
  assert.equal(s.solActual, 1);
  assert.equal(s.climate?.source, "fallback");
  assert.equal(s.climate?.temperature, c.fallback.temperature);
  assert.equal(s.climate?.solar, c.fallback.solar);
});
test("cambiar de ciudad reinicia el reloj e invalida la secuencia anterior", () => {
  let s = tick(selected(), 17);
  s = gameReducer(s, {
    type: "SELECT",
    cityId: "santa-cruz",
    requestId: 2,
    now: 19000,
  });
  assert.equal(s.prologue.elapsed, 0);
  assert.equal(prologueFrame(s.prologue.elapsed).alert, false);
  assert.equal(
    gameReducer(s, { type: "PROLOGUE_TICK", requestId: 1, now: 80000 }),
    s,
  );
  assert.equal(tick(s, 19.999).solActual, 0);
  assert.equal(tick(s, 20).solActual, 1);
});
test("reiniciar cancela la secuencia y un tick viejo nunca arranca otra partida", () => {
  let s = tick(selected(), 17);
  s = gameReducer(s, { type: "RESET" });
  assert.equal(s.prologue.startedAt, null);
  assert.equal(s.prologue.elapsed, 0);
  assert.equal(
    gameReducer(s, { type: "PROLOGUE_TICK", requestId: 1, now: 90000 }),
    s,
  );
  assert.equal(s.solActual, 0);
});
test("un salto del reloj recupera el tiempo transcurrido y nunca repite el inicio ni retrocede", () => {
  let s = selected();
  s = tick(s, 18);
  assert.equal(tick(s, 12), s);
  assert.equal(
    gameReducer(s, { type: "PROLOGUE_TICK", requestId: 1, now: NaN }),
    s,
  );
  s = tick(s, 200);
  assert.equal(s.solActual, 1);
  assert.equal(s.prologue.elapsed, 20);
  assert.equal(s.logs.filter((l) => l.text === PROLOGUE_SURVIVED).length, 1);
});
test("START no permite saltarse los 20 segundos aunque POWER ya haya respondido", () => {
  let s = selected();
  s = gameReducer(s, { type: "TRANSITION_DONE", requestId: 1 });
  s = gameReducer(s, {
    type: "CLIMATE",
    requestId: 1,
    climate: {
      ...CITIES[1].fallback,
      date: "2024-01-15",
      source: "live",
      url: "",
    },
  });
  assert.equal(gameReducer(s, { type: "START" }), s);
  assert.equal(tick(s, 20).solActual, 1);
});
