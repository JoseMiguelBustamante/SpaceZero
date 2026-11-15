"use client";
import { useEffect, useRef } from "react";
import { useGame } from "../GameProvider";
import { PixelMedal } from "./LearningUI";
import { LESSONS, type LessonSol } from "@/lib/learning";
import { CITIES } from "@/lib/game";
import { ROUTES } from "@/lib/rover";
export function MissionDossier({ onRestart }: { onRestart: () => void }) {
  const { state: s } = useGame(),
    ref = useRef<HTMLDialogElement>(null),
    o = s.outcome;
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) {
      d.showModal();
      d.focus({ preventScroll: true });
    }
    return () => d?.close();
  }, []);
  if (!o) return null;
  const city = CITIES.find((c) => c.id === s.cityId),
    flare = s.rescue.event,
    crop = s.greenhouse.growth >= 50 && s.resources.saludCosecha > 0,
    route = s.rover.route ? ROUTES[s.rover.route] : null;
  return (
    <dialog
      ref={ref}
      tabIndex={-1}
      className={`mission-dossier ${o.success ? "dossier-success" : "dossier-failed"}`}
      aria-label="Diploma de Junior Astronauta"
      onCancel={(e) => e.preventDefault()}
    >
      <div className="dossier-masthead">
        <span className="nasa-pixel">
          J<span>R</span>
          <i>✦</i>
        </span>
        <div>
          DIPLOMA DE JUNIOR ASTRONAUTA
          <small>APRENDÍ JUGANDO CON DATOS DE LA NASA</small>
        </div>
        <b>
          {String(o.sol).padStart(2, "0")}
          <br />
          <small>DÍAS</small>
        </b>
      </div>
      <div className="dossier-heading">
        <span className="eyebrow">¡LA CURIOSIDAD TE LLEVÓ LEJOS!</span>
        <h2>¡JUNIOR ASTRONAUTA!</h2>
        <p>{o.reason}</p>
        <span className="dossier-stamp">
          {o.success ? "EQUIPO A SALVO" : "VOLVAMOS A INTENTARLO"} · SOL{" "}
          {String(o.sol).padStart(2, "0")}
        </span>
      </div>
      <div className="diploma-medals">
        {([1, 8, 18, 28] as LessonSol[]).map((sol) => (
          <div key={sol}>
            <PixelMedal sol={sol} locked={!s.learning.answered.includes(sol)} />
            <span>{LESSONS[sol].medal}</span>
          </div>
        ))}
      </div>
      <p className="diploma-city">
        Desde <strong>{city?.name}</strong> hasta las estrellas. ¡Exploraste,
        cuidaste y aprendiste!
      </p>
      <dl className="dossier-grid">
        <div>
          <dt>01 / TU CIUDAD</dt>
          <dd>{city?.name ?? "Sin seleccionar"}</dd>
          <small>
            ABRIGO DE TU CIUDAD ×{s.modifiers.aislamientoTermico.toFixed(1)}
          </small>
        </div>
        <div>
          <dt>02 / NUESTRAS PLANTAS</dt>
          <dd className={crop ? "good" : "warn"}>
            {crop
              ? "COSECHA SALVADA"
              : s.greenhouse.elapsed === 0
                ? "SIN PLANTAR"
                : "COSECHA PERDIDA"}
          </dd>
          <small>
            SALUD {s.resources.saludCosecha.toFixed(1)}% · CRECIMIENTO{" "}
            {s.greenhouse.growth.toFixed(1)}%
          </small>
        </div>
        <div>
          <dt>03 / RIESGO AL LIMPIAR PANELES</dt>
          <dd>
            {s.storm.evaRadiation.toFixed(1)}
            <em>%</em>
          </dd>
          <small>
            RADIACIÓN TOTAL {s.resources.radiacionTripulacion.toFixed(1)}%
          </small>
        </div>
        <div>
          <dt>04 / BATERÍA EN JEZERO</dt>
          <dd>
            {s.rover.boarded ? (
              <>
                {s.resources.energia.toFixed(2)}
                <em>%</em>
              </>
            ) : (
              "AÚN NO SALIMOS"
            )}
          </dd>
          <small>
            {route
              ? `${route.name.toUpperCase()} · ${s.rover.segment * 5} / ${route.distance} KM`
              : `BATERÍA DE LA BASE ${s.resources.energia.toFixed(2)}%`}
          </small>
        </div>
        <div className="dossier-flare">
          <dt>05 / AVISO REAL DE NASA DONKI</dt>
          {flare ? (
            <>
              <dd>
                LLAMARADA <b>{flare.classType}</b>
                <span className="data-source">
                  {flare.source === "live"
                    ? "CONSULTA A NASA"
                    : "DATO REAL GUARDADO"}
                </span>
              </dd>
              <p>
                {new Date(flare.peakTime)
                  .toISOString()
                  .replace("T", " · ")
                  .replace(".000Z", " UTC")}
                <br />
                ZONA DEL SOL {flare.activeRegion ?? "NO INFORMADA"} ·{" "}
                {s.rescue.status === "complete"
                  ? "ESCUDO ACTIVADO"
                  : "SIN PROTECCIÓN"}
              </p>
              <a href={flare.link} target="_blank" rel="noreferrer">
                VER DATO EN NASA ↗
              </a>
            </>
          ) : (
            <dd>AÚN SIN AVISO</dd>
          )}
        </div>
      </dl>
      {s.climate && (
        <div className="diploma-power">
          <strong>☀️ EL CLIMA REAL DE TU CIUDAD</strong>
          <p>
            NASA POWER · {s.climate.date} · {s.climate.temperature.toFixed(1)}{" "}
            °C · luz: {s.climate.solar.toFixed(2)} kWh/m²/día.
          </p>
          <small>
            {s.climate.source === "live"
              ? "Consulta a NASA"
              : "Dato real guardado"}{" "}
            · Los bonos de la isla son parte del juego.
          </small>
        </div>
      )}
      <div className="dossier-telemetry">
        <span>
          AGUA <b>{s.resources.agua.toFixed(1)}%</b>
        </span>
        <span>
          O₂ <b>{s.resources.oxigeno.toFixed(1)}%</b>
        </span>
        <span>
          EQUIPO <b>{s.resources.integridadTripulacion.toFixed(1)}%</b>
        </span>
        <span>
          CALOR DEL EQUIPO{" "}
          <b>
            {s.rover.boarded ? `${s.rover.bodyTemperature.toFixed(1)} °C` : "—"}
          </b>
        </span>
      </div>
      <p className="dossier-note">
        Diploma educativo de MISIÓN RESCATE. No es un título oficial ni está
        emitido por NASA.
      </p>
      <button
        className="launch-button dossier-restart"
        autoFocus
        onClick={onRestart}
      >
        JUGAR OTRA VEZ <span>↻</span>
        <small>ELEGIR OTRA CIUDAD</small>
      </button>
    </dialog>
  );
}
