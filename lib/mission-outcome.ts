import type { GameState, ResourceKey } from "./game";
export type MissionOutcome = {
  success: boolean;
  rank: "ÉXITO CRÍTICO" | "RESCATE AL LÍMITE" | "MISIÓN FALLIDA";
  sol: number;
  reason: string;
  cause: ResourceKey | "temperature" | "extraction";
};
export const VITALS = [
  ["agua", "Se acabó el agua."],
  ["oxigeno", "Se acabó el aire."],
  ["energia", "Se acabó la batería. Ya no podemos seguir."],
  ["integridadTripulacion", "El equipo ya no puede seguir."],
] as const;
export function finalizeMission(s: GameState): GameState {
  if (s.outcome) return s;
  if (
    s.support ||
    s.rover.status !== "arrived" ||
    !s.learning.answered.includes(28) ||
    s.learning.pending !== null
  )
    return s;
  const success = true,
    reason = "",
    cause = "extraction" as const;
  const critical =
    success &&
    s.resources.energia >= 8 &&
    s.rover.bodyTemperature >= 35.5 &&
    s.resources.integridadTripulacion >= 75 &&
    s.resources.saludCosecha >= 50 &&
    s.resources.radiacionTripulacion < 55 &&
    s.resources.agua >= 25 &&
    s.resources.oxigeno >= 25;
  const rank = success
    ? critical
      ? "ÉXITO CRÍTICO"
      : "RESCATE AL LÍMITE"
    : "MISIÓN FALLIDA";
  const outcome: MissionOutcome = {
    success,
    rank,
    sol: s.solActual,
    reason: reason || "¡Llegamos! Nos vamos de Marte juntos.",
    cause,
  };
  return {
    ...s,
    phase: "final",
    outcome,
    logs: [
      ...s.logs,
      {
        id: s.requestId + 1000 + s.logs.length,
        tag: `INFORME FINAL · ${rank}`,
        text: outcome.reason,
      },
    ],
  };
}
