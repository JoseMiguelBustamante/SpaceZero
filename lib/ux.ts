import type { GameState } from "./game";
export const ALERT_SECONDS = 10;
export const SHIELD_COST = 15;
export const SAFE_WATER = { min: 30, max: 50 };
export const SYSTEM_NAMES = {
  heating: "Calor",
  oxygen: "Aire",
  lights: "Plantas",
  eva: "Limpiar paneles",
} as const;
export function missionObjective(s: GameState, outside = false): string {
  if (s.outcome) return "Objetivo: Mira tu resultado o juega otra vez.";
  if (s.solActual === 0) return "Objetivo: Elige una ciudad para empezar.";
  if (s.solActual === 1)
    return s.greenhouse.status === "complete"
      ? "Objetivo: Sigue al día 8."
      : s.greenhouse.status === "running"
        ? "Objetivo: Mantén el agua en la zona verde."
        : s.greenhouse.status === "failed"
          ? "Objetivo: Prueba otra vez en la zona verde."
          : "Objetivo: Camina al Invernadero para producir agua.";
  if (s.solActual === 8)
    return outside
      ? "Objetivo: Llega a los paneles y límpialos."
      : s.storm.status === "complete"
        ? "Objetivo: Sigue al día 18."
        : "Objetivo: Ve al Refugio y enciende dos ayudas.";
  if (s.solActual === 18)
    return s.rescue.status === "alert"
      ? "Objetivo: ¡Activa el escudo antes de que llegue a cero!"
      : s.rescue.status === "complete"
        ? "Objetivo: Sigue al día 28 para buscar el rover."
        : s.rescue.status === "connected"
          ? "Objetivo: Espera el aviso del Sol."
          : "Objetivo: Ve a la Antena para llamar a la Tierra.";
  if (!s.rover.boarded) return "Objetivo: Camina al Garaje y sube al rover.";
  if (!s.rover.route)
    return "Objetivo: Elige un camino para llegar al rescate.";
  return "Objetivo: Sigue la flecha amarilla hasta el rescate.";
}
