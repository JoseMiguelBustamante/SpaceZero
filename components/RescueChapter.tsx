"use client";
import { useGame } from "./GameProvider";
import { Oscilloscope } from "./Oscilloscope";
import { NasaFact } from "./NasaFact";
import { SIGNAL_TARGET, alignment } from "@/lib/rescue";
export function RescueChapter() {
  const { state: s, act } = useGame(),
    r = s.rescue,
    locked = !["idle", "tuning"].includes(r.status);
  const controls = [
    {
      field: "angle",
      label: "Girar la antena",
      min: 0,
      max: 180,
      step: 1,
      target: SIGNAL_TARGET.angle,
      margin: 24,
      unit: "°",
    },
    {
      field: "frequency",
      label: "Velocidad de la señal",
      min: 1,
      max: 8,
      step: 0.1,
      target: SIGNAL_TARGET.frequency,
      margin: 0.7,
      unit: "",
    },
    {
      field: "phase",
      label: "Juntar las líneas",
      min: 0,
      max: 360,
      step: 5,
      target: SIGNAL_TARGET.phase,
      margin: 35,
      unit: "°",
    },
  ] as const;
  return (
    <div className="easy-mission easy-signal">
      <p className="mission-instruction">
        Objetivo: junta la línea azul con la verde.
      </p>
      {controls.map((c) => (
        <label className="easy-slider" key={c.field}>
          <span>
            {c.label}
            <strong>
              {r[c.field].toFixed(c.field === "frequency" ? 1 : 0)}
              {c.unit}
            </strong>
          </span>
          <div className="safe-track">
            <span
              className="safe-band"
              style={{
                left: `${((c.target - c.margin - c.min) / (c.max - c.min)) * 100}%`,
                width: `${((c.margin * 2) / (c.max - c.min)) * 100}%`,
              }}
            />
            <input
              type="range"
              min={c.min}
              max={c.max}
              step={c.step}
              value={r[c.field]}
              disabled={locked}
              aria-label={c.label}
              onChange={(e) =>
                act({
                  type: "SIGNAL_SET",
                  field: c.field,
                  value: Number(e.target.value),
                })
              }
            />
          </div>
          <small>
            Acércalo a {c.target}
            {c.unit}.
          </small>
        </label>
      ))}
      <div className="easy-progress">
        <span>
          Llamada conectada <b>{Math.round(r.progress)}%</b>
        </span>
        <progress max={100} value={r.progress} aria-label="Llamada conectada" />
      </div>
      {r.status === "tuning" && (
        <p className="short-copy easy-tip">
          Tienes 20 segundos. Mantén las líneas cerca.
        </p>
      )}
      {r.status === "connected" && (
        <p className="short-copy" role="status">
          ¡Hay señal! NASA está revisando la actividad del Sol.
        </p>
      )}
      {r.status === "failed" && (
        <>
          <button
            className="world-secondary"
            onClick={() => act({ type: "RETRY_STORM" })}
          >
            VOLVER A LIMPIAR PANELES
          </button>
        </>
      )}
      <NasaFact
        mission="signal"
        disabled={r.status === "tuning" || r.status === "alert"}
      >
        {r.event && (
          <>
            <p className="short-copy">
              Llamarada {r.event.classType} ·{" "}
              {r.event.source === "live"
                ? "Consulta NASA"
                : "Dato real guardado"}
            </p>
            <p className="short-copy">
              {r.event.peakTime.replace("T", " · ").replace("Z", " UTC")}
            </p>
            <p className="short-copy">Zona del Sol: {r.event.activeRegion}</p>
            <a href={r.event.link} target="_blank" rel="noreferrer">
              Ver este dato en NASA ↗
            </a>
          </>
        )}
      </NasaFact>
    </div>
  );
}

export function SignalPreview() {
  const { state } = useGame(),
    r = state.rescue,
    accuracy = alignment(r);
  const locked = !["idle", "tuning"].includes(r.status);
  return (
    <div className="signal-preview">
      <Oscilloscope />
      <div
        className="signal-color-bar"
        aria-label={`Señal: ${Math.round(accuracy)} de 100`}
        role="meter"
        aria-valuenow={Math.round(accuracy)}
        aria-valuemin={0}
        aria-valuemax={100}
        style={
          {
            "--signal-color":
              accuracy >= 75
                ? "#83ed85"
                : accuracy >= 65
                  ? "#ffe179"
                  : "#ff897e",
          } as React.CSSProperties
        }
      >
        {Array.from({ length: 12 }, (_, i) => (
          <i
            key={i}
            className={i < Math.round((accuracy / 100) * 12) ? "lit" : ""}
          />
        ))}
      </div>
      <div
        className={`signal-friendly ${accuracy >= 75 ? "is-safe" : accuracy >= 65 ? "almost-ready" : ""}`}
        role="status"
      >
        {locked
          ? r.message
          : accuracy >= 75
            ? "¡Lo tienes! Deja los controles así."
            : accuracy >= 65
              ? "¡Casi listo! Acerca un poco más las líneas."
              : "Lleva los controles hacia la zona verde."}
      </div>
    </div>
  );
}
