export const PROLOGUE_SECONDS = 20;
export const PROLOGUE_WARNING_AT = 10;
export const PROLOGUE_TRANSFORM_AT = 16;
export const PROLOGUE_DANGER =
  "¡PELIGRO! ¡Los polos de la Tierra se invirtieron y la atmósfera está desapareciendo! ¡El mundo se está convirtiendo en un desierto como Marte!";
export const PROLOGUE_SURVIVED =
  "¡Sobrevivimos! Ahora nuestra ciudad es igual a Marte. Camina al Invernadero para producir agua.";
export type PrologueClock = { startedAt: number | null; elapsed: number };
export const INITIAL_PROLOGUE: PrologueClock = { startedAt: null, elapsed: 0 };
export function prologueFrame(elapsed: number) {
  const seconds = Math.max(
    0,
    Math.min(PROLOGUE_SECONDS, Number.isFinite(elapsed) ? elapsed : 0),
  );
  return {
    seconds,
    stage:
      seconds < 10
        ? ("earth" as const)
        : seconds < 16
          ? ("warning" as const)
          : seconds < 20
            ? ("transform" as const)
            : ("mars" as const),
    alert: seconds >= 10 && seconds < 20,
    transform: Math.max(0, Math.min(1, (seconds - 16) / 4)),
  };
}
