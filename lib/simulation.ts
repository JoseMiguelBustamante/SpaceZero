import type { GameState } from "./game";
export const clamp = (n: number, min = 0, max = 100) =>
  Math.round(Math.max(min, Math.min(max, n)) * 100) / 100;
export function advanceGreenhouse(s: GameState): GameState {
  const g = s.greenhouse,
    r = s.resources,
    h = g.hydrogen,
    uv = g.uv;
  const oxygen = clamp(r.oxigeno - (0.18 + h * 0.016));
  const water = clamp(r.agua + h * 0.03 - 0.25 - uv * 0.006);
  const energy = clamp(r.energia - 0.16 - uv * 0.012);
  const risk = clamp(
    h * 0.6 + Math.max(0, 40 - oxygen) * 1.2 + (h > 80 ? 20 : 0),
  );
  const stress =
    (h < 20 ? (20 - h) * 0.08 : 0) +
    (uv > 80 ? (uv - 80) * 0.05 : 0) +
    (water < 25 ? 1 : 0) +
    (risk > 80 ? 0.8 : 0);
  const health = clamp(r.saludCosecha + (stress === 0 ? 0.15 : -stress));
  const growth = clamp(
    g.growth +
      (water > 15 && health > 10
        ? (0.5 + uv * 0.05) * (h >= 20 ? 1 : 0.25)
        : 0),
  );
  const integrity = clamp(
    r.integridadTripulacion -
      (oxygen < 25 ? (25 - oxygen) * 0.07 : 0) -
      (risk > 85 ? 0.8 : 0),
  );
  const elapsed = Math.min(25, g.elapsed + 1),
    failed = oxygen <= 10 || energy <= 0 || health <= 10 || integrity <= 0,
    done = elapsed === 25,
    success = done && !failed && growth >= 50 && health >= 35;
  const message = failed
    ? "Nos falta aire o energía. Vamos a intentarlo otra vez."
    : done
      ? success
        ? "¡Las plantas crecen! Ya tenemos agua y comida."
        : "Falta luz. Prueba con la luz al 45%."
      : risk >= 75
        ? "El aire está en riesgo. Baja el control de agua."
        : h < 20
          ? "Falta agua. Mueve el control hacia la zona verde."
          : "Todo va bien. Mantén los controles en verde.";
  const status =
    failed || (done && !success) ? "failed" : success ? "complete" : "running";
  const next: GameState = {
    ...s,
    resources: {
      ...r,
      agua: water,
      oxigeno: oxygen,
      energia: energy,
      saludCosecha: health,
      integridadTripulacion: integrity,
    },
    greenhouse: { ...g, elapsed, growth, risk, status, message },
  };
  if (status === "complete" || status === "failed")
    next.logs = [
      ...s.logs,
      { id: s.requestId + 10 + s.logs.length, tag: "PLANTAS", text: message },
    ];
  return next;
}
export function advanceStorm(s: GameState): GameState {
  const a = s.storm.allocation,
    r = s.resources,
    ins = s.modifiers.aislamientoTermico,
    solar = s.modifiers.eficienciaSolar;
  const active = Object.values(a).filter((v) => v > 0).length,
    recovered = a.eva > 0 ? 18 * solar : 0;
  const energy = clamp(r.energia - 3 - active * 1.5 + 1.5 * solar + recovered);
  const temperature = clamp(
    r.temperaturaCabina + (a.heating > 0 ? 2 * ins : -3 / ins),
    -75,
    40,
  );
  const oxygen = clamp(r.oxigeno + (a.oxygen > 0 ? 8 : -9));
  const darkCycles = a.lights === 0 ? s.storm.darkCycles + 1 : 0;
  const harvest =
    darkCycles > 2 ? 0 : clamp(r.saludCosecha + (a.lights > 0 ? 5 : -6));
  const radiation = clamp(r.radiacionTripulacion + (a.eva > 0 ? 6 : 0));
  const integrity = clamp(
    r.integridadTripulacion -
      Math.max(0, 15 - temperature) * 0.6 -
      Math.max(0, 20 - oxygen) * 0.5 -
      (radiation > 75 ? 2 : 0),
  );
  const cycle = s.storm.cycle + 1,
    failed = energy <= 0 || oxygen <= 10 || integrity <= 0,
    complete = cycle === 3 && !failed;
  const summary = `Ronda ${cycle} de 3. ${a.eva > 0 ? "Paneles limpios. Batería recargada." : "El equipo sigue a salvo."}`;
  const message = failed
    ? "Falta aire o batería. Cambia las ayudas y prueba otra vez."
    : complete
      ? harvest === 0
        ? "Pasó la tormenta. Nos quedamos sin plantas."
        : "¡Pasó la tormenta! El equipo y las plantas siguen bien."
      : summary;
  return {
    ...s,
    resources: {
      ...r,
      energia: energy,
      temperaturaCabina: temperature,
      oxigeno: oxygen,
      saludCosecha: harvest,
      radiacionTripulacion: radiation,
      integridadTripulacion: integrity,
    },
    storm: {
      ...s.storm,
      cycle,
      darkCycles,
      status: failed ? "failed" : complete ? "complete" : "running",
      recovered: s.storm.recovered + recovered,
      evaRadiation:
        s.storm.evaRadiation + Math.max(0, radiation - r.radiacionTripulacion),
      message,
      history: [...s.storm.history, summary],
    },
    logs: [
      ...s.logs,
      {
        id: s.requestId + 200 + cycle,
        tag: `TORMENTA ${cycle}/3`,
        text: message,
      },
    ],
  };
}
