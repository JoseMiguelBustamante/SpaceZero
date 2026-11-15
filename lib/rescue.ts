import type { GameState } from "./game";
import type { SolarEvent } from "./donki";
import { ALERT_SECONDS } from "./ux";
import { clamp } from "./simulation";
export const SIGNAL_TARGET = { angle: 120, frequency: 4.2, phase: 90 };
export type RescueStatus =
  "idle" | "tuning" | "connected" | "alert" | "complete" | "failed";
export const INITIAL_RESCUE = {
  angle: 95,
  frequency: 3.5,
  phase: 120,
  progress: 0,
  elapsed: 0,
  startedAt: 0,
  lastTick: 0,
  status: "idle" as RescueStatus,
  attempt: 0,
  event: null as SolarEvent | null,
  alertDeadline: 0,
  secondsLeft: ALERT_SECONDS,
  message: "",
  stormCheckpoint: null as GameState["resources"] | null,
};
export function alignment(
  r: Pick<typeof INITIAL_RESCUE, "angle" | "frequency" | "phase">,
) {
  const phaseDiff = Math.min(
    Math.abs(r.phase - SIGNAL_TARGET.phase),
    360 - Math.abs(r.phase - SIGNAL_TARGET.phase),
  );
  return clamp(
    100 -
      ((Math.abs(r.angle - SIGNAL_TARGET.angle) / 180) * 0.3 +
        (Math.abs(r.frequency - SIGNAL_TARGET.frequency) / 7) * 0.4 +
        (phaseDiff / 180) * 0.3) *
        100,
  );
}
export function advanceSignal(s: GameState, now: number): GameState {
  const r = s.rescue,
    elapsed = Math.min(20, (now - r.startedAt) / 1000),
    dt = Math.max(0, Math.min(0.5, (now - r.lastTick) / 1000));
  const accuracy = alignment(r);
  const progress = clamp(
    r.progress +
      (accuracy >= 85 ? 35 : accuracy >= 75 ? 24 : accuracy >= 65 ? 10 : 0) *
        dt,
  );
  const connected = progress >= 100 && elapsed <= 20;
  const failed = elapsed >= 20 && !connected;
  const message = connected
    ? "¡Ya podemos hablar con la Tierra!"
    : failed
      ? "Se fue la señal. Puedes probar otra vez."
      : accuracy >= 82
        ? "¡Lo tienes! Deja los controles así."
        : accuracy >= 72
          ? "¡Casi listo! Acerca la línea azul a la verde."
          : "Mueve los controles hasta juntar las dos líneas.";
  const state: GameState = {
    ...s,
    rescue: {
      ...r,
      elapsed,
      lastTick: now,
      progress,
      status: connected ? "connected" : failed ? "failed" : "tuning",
      message,
    },
  };
  if (connected || failed)
    state.logs = [
      ...s.logs,
      {
        id: s.requestId + 400 + s.logs.length,
        tag: connected ? "ANTENA · CONECTADA" : "ANTENA · SIN SEÑAL",
        text: message,
      },
    ];
  return state;
}
export function solarImpact(s: GameState): GameState {
  const resources = {
    ...s.resources,
    radiacionTripulacion: clamp(s.resources.radiacionTripulacion + 20),
    integridadTripulacion: clamp(s.resources.integridadTripulacion - 15),
    energia: clamp(s.resources.energia - 3),
  };
  const message = "Llegó la radiación. El equipo sigue aquí: prueba otra vez.";
  return {
    ...s,
    resources,
    rescue: { ...s.rescue, status: "failed", secondsLeft: 0, message },
    logs: [
      ...s.logs,
      {
        id: s.requestId + 500 + s.logs.length,
        tag: "ALERTA SOLAR · IMPACTO",
        text: message,
      },
    ],
  };
}
