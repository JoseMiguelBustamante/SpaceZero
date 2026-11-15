import test from "node:test";
import assert from "node:assert/strict";
import { gameReducer, INITIAL_STATE, type GameState } from "./game";
import { LESSONS, type LessonSol } from "./learning";
import { HISTORICAL_FLARE } from "./donki";
function quiz(sol: LessonSol): GameState {
  return {
    ...structuredClone(INITIAL_STATE),
    learning: { answered: [], pending: sol, feedback: "none" },
  };
}
test("todas las preguntas permiten reintentar sin perder reservas ni medallas", () => {
  for (const sol of [0, 1, 8, 18, 28] as LessonSol[]) {
    let s = quiz(sol);
    s.learning.answered = [0];
    const before = structuredClone(s.resources);
    for (let i = 0; i < 7; i++)
      s = gameReducer(s, {
        type: "QUIZ_ANSWER",
        answer: (LESSONS[sol].correct + 1) % 3,
      });
    assert.deepEqual(s.resources, before);
    assert.deepEqual(s.learning.answered, [0]);
    assert.equal(s.learning.feedback, "retry");
    s = gameReducer(s, { type: "QUIZ_ANSWER", answer: LESSONS[sol].correct });
    assert.equal(s.learning.feedback, "correct");
    assert.equal(s.learning.answered.filter((n) => n === sol).length, 1);
    assert.equal(
      gameReducer(s, { type: "QUIZ_ANSWER", answer: LESSONS[sol].correct }),
      s,
    );
  }
});
test("no se salta la pregunta entre misiones y el diploma espera la última respuesta", () => {
  let s: GameState = {
    ...quiz(1),
    solActual: 1,
    phase: "sol1",
    greenhouse: { ...INITIAL_STATE.greenhouse, status: "complete" },
  };
  assert.equal(gameReducer(s, { type: "ENTER_STORM" }), s);
  s = gameReducer(s, { type: "QUIZ_ANSWER", answer: 1 });
  s = gameReducer(s, { type: "QUIZ_CONTINUE" });
  assert.equal(s.solActual, 8);
  assert.deepEqual(s.learning.answered, [1]);
  let last: GameState = {
    ...quiz(28),
    solActual: 28,
    phase: "sol28",
    rover: {
      ...INITIAL_STATE.rover,
      boarded: true,
      status: "arrived",
      segment: 5,
    },
  };
  assert.equal(
    gameReducer(last, { type: "ROVER_STEP", segment: 5 }).outcome,
    null,
  );
  last = gameReducer(last, { type: "QUIZ_ANSWER", answer: 1 });
  assert.equal(last.outcome, null);
  last = gameReducer(last, { type: "QUIZ_CONTINUE" });
  assert.equal(last.outcome?.success, true);
  assert.equal(last.phase, "final");
});
test("ayuda pausa recursos, exige corregir y permite reanudar sin perder medallas", () => {
  let s: GameState = {
    ...structuredClone(INITIAL_STATE),
    solActual: 1,
    phase: "sol1",
    resources: { ...INITIAL_STATE.resources, oxigeno: 17 },
    learning: { answered: [0], pending: null, feedback: "none" },
    greenhouse: {
      ...INITIAL_STATE.greenhouse,
      status: "running",
      hydrogen: 100,
    },
  };
  s = gameReducer(s, { type: "GREENHOUSE_TICK" });
  assert.equal(s.support?.cause, "air");
  assert.equal(s.outcome, null);
  assert.equal(
    gameReducer(s, { type: "SUPPORT_CONTINUE", now: Date.now() }),
    s,
  );
  for (let i = 0; i < 100; i++)
    assert.equal(gameReducer(s, { type: "GREENHOUSE_TICK" }), s);
  s = gameReducer(s, { type: "SUPPORT_APPLY" });
  assert.equal(s.greenhouse.hydrogen, 35);
  assert.ok(s.resources.oxigeno >= 50);
  s = gameReducer(s, { type: "SUPPORT_CONTINUE", now: Date.now() });
  assert.equal(s.support, null);
  assert.deepEqual(s.learning.answered, [0]);
  s = gameReducer(s, { type: "GREENHOUSE_START" });
  const before = s.resources.oxigeno;
  s = gameReducer(s, { type: "GREENHOUSE_TICK" });
  assert.ok(s.resources.oxigeno < before);
});
test("un escudo tardío da otra oportunidad sin radiación; el reloj se repone al corregir", () => {
  let s: GameState = {
    ...structuredClone(INITIAL_STATE),
    solActual: 18,
    phase: "sol18",
    rescue: {
      ...INITIAL_STATE.rescue,
      status: "alert",
      alertDeadline: 11000,
      secondsLeft: 10,
      event: HISTORICAL_FLARE,
    },
  };
  s = gameReducer(s, { type: "SHIELD", now: 12000 });
  assert.equal(s.support?.cause, "shield");
  assert.equal(s.resources.radiacionTripulacion, 0);
  s = gameReducer(s, { type: "SUPPORT_APPLY" });
  s = gameReducer(s, { type: "SUPPORT_CONTINUE", now: 50000 });
  assert.equal(s.rescue.alertDeadline, 60000);
  s = gameReducer(s, { type: "SHIELD", now: 55000 });
  assert.equal(s.rescue.status, "complete");
  assert.equal(s.learning.pending, 18);
});
test("reiniciar borra preguntas, medallas y reservas de ayuda junto a datos y ciudad", () => {
  const s = gameReducer(
    {
      ...quiz(8),
      learning: { answered: [0, 1], pending: 8, feedback: "retry" },
      support: { cause: "water", pausedAt: 5, corrected: false },
    },
    { type: "RESET" },
  );
  assert.deepEqual(s.learning, {
    answered: [],
    pending: null,
    feedback: "none",
  });
  assert.equal(s.support, null);
  assert.equal(s.cityId, null);
});
test("la ayuda al acabar una misión abre su pregunta al seguir, sin atascar el avance", () => {
  let s: GameState = {
    ...structuredClone(INITIAL_STATE),
    solActual: 8,
    phase: "sol8",
    learning: { answered: [0, 1], pending: null, feedback: "none" },
    resources: { ...INITIAL_STATE.resources, temperaturaCabina: 12 },
    storm: { ...INITIAL_STATE.storm, status: "complete", cycle: 3 },
  };
  s = gameReducer(s, { type: "GREENHOUSE_PAUSE" });
  assert.equal(s.support?.cause, "cold");
  s = gameReducer(s, { type: "SUPPORT_APPLY" });
  s = gameReducer(s, { type: "SUPPORT_CONTINUE", now: Date.now() });
  assert.equal(s.learning.pending, 8);
  s = gameReducer(s, { type: "QUIZ_ANSWER", answer: 2 });
  s = gameReducer(s, { type: "QUIZ_CONTINUE" });
  assert.equal(s.solActual, 18);
});
