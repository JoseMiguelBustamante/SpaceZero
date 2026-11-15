"use client";
import { useRef, useState } from "react";
import { useGame } from "../GameProvider";
import { NasaFact } from "../NasaFact";
import { CITIES } from "@/lib/game";
import {
  ROUTES,
  forecastRoverStep,
  roverNight,
  type RoverRoute,
} from "@/lib/rover";
import { missionObjective } from "@/lib/ux";
import { JezeroCanvas, type JezeroHandle } from "./JezeroCanvas";
import { MedalBar, LearningLayer, SciencePlayCard } from "./LearningUI";
import { MissionDossier } from "./MissionDossier";
import { PixelPlanet, WorldDialogue, MissionGoal } from "./WorldUI";
import { TacticalModal } from "./TacticalModal";
export function JezeroExpedition({ onRestart }: { onRestart: () => void }) {
  const { state: s, act, sound, toggleSound } = useGame(),
    rover = useRef<JezeroHandle>(null),
    [moving, setMoving] = useState(false),
    [panel, setPanel] = useState<"history" | "nasa" | null>(null);
  const route = s.rover.route ? ROUTES[s.rover.route] : null,
    night = roverNight(s.rover.route, s.rover.segment),
    f = forecastRoverStep(s),
    city = CITIES.find((c) => c.id === s.cityId),
    heaterOn = s.rover.heater === "high";
  return (
    <div
      className={`iso-game easy-game kids-game jezero-game ${night ? "jezero-night" : ""}`}
    >
      <header className="iso-topbar">
        <a className="iso-brand" href="#jezero">
          <span>
            <PixelPlanet />
          </span>
          <div>
            MISIÓN RESCATE
            <small>
              ESPEJO <b>MARCIANO</b>
            </small>
          </div>
        </a>
        <div className="iso-header-status">
          <span className="live-dot" />
          RUMBO AL RESCATE
        </div>
        <div className="iso-header-actions">
          <span className="iso-sol">
            DÍA <strong>28</strong>
            <small>/28</small>
          </span>
          <button
            className="iso-icon-button"
            onClick={toggleSound}
            aria-label={sound ? "Apagar sonido" : "Encender sonido"}
            aria-pressed={sound}
          >
            {sound ? "♪" : "♫"}
            <span>{sound ? "SÍ" : "NO"}</span>
          </button>
        </div>
      </header>
      <MedalBar />
      <MissionGoal text={missionObjective(s)} />
      <section className="rover-hud" aria-label="Batería y calor del equipo">
        <TwinMeter
          label="BATERÍA"
          value={s.resources.energia}
          unit="%"
          percent={s.resources.energia}
          color="#ffb000"
        />
        <TwinMeter
          label="CALOR DEL EQUIPO"
          value={s.rover.bodyTemperature}
          unit="°C"
          percent={((s.rover.bodyTemperature - 30) / 7.4) * 100}
          color={s.rover.bodyTemperature < 35 ? "#ff7057" : "#5ce1e6"}
          min={30}
          max={37.4}
        />
        <div className="rover-environment">
          <span>
            {night ? "☾ ES DE NOCHE" : "☀ TODAVÍA ES DE DÍA"}{" "}
            <b>{night ? "−80" : "−35"} °C</b>
          </span>
          <span>El abrigo de {city?.name} viaja contigo.</span>
        </div>
      </section>
      <main
        id="jezero"
        className="iso-world jezero-world"
        aria-label="Camino al rescate en Jezero"
      >
        <div className="world-heading">
          <div className="eyebrow">EL ÚLTIMO VIAJE</div>
          <h1>
            ¡VAMOS
            <br />
            <em>A CASA!</em>
          </h1>
          <p>Sigue la flecha amarilla.</p>
        </div>
        <div className="jezero-map-id">
          <span>CRÁTER JEZERO</span>
          <strong>EL RESCATE NOS ESPERA</strong>
        </div>
        <JezeroCanvas
          ref={rover}
          onMoving={setMoving}
          blocked={!!panel || !!s.support || s.learning.pending !== null}
        />
        <div className="jezero-extraction-label">
          AQUÍ NOS RECOGEN <b>↗</b>
        </div>
        <div className="jezero-legend">
          <span>
            <i style={{ background: "#ffb000" }} />
            CAMINO CORTO
          </span>
          <span>
            <i style={{ background: "#5ce1e6" }} />
            CAMINO LARGO
          </span>
        </div>
        {!route && !s.outcome && (
          <section
            className="route-planner easy-route-planner"
            aria-label="Elige un camino"
          >
            <span className="eyebrow">ANTES DE SALIR</span>
            <h2>¿POR DÓNDE VAMOS?</h2>
            <p className="short-copy">
              Tenemos {s.resources.energia.toFixed(0)}% de batería para llegar.
            </p>
            <SciencePlayCard mission={28} />
            <div className="route-options">
              {(Object.keys(ROUTES) as RoverRoute[]).map((id) => {
                const r = ROUTES[id];
                return (
                  <button
                    key={id}
                    className={`route-option route-${id}`}
                    onClick={() => act({ type: "ROVER_ROUTE", route: id })}
                  >
                    <span className="easy-route-symbol" aria-hidden="true">
                      {id === "short" ? "↗" : "☾"}
                    </span>
                    <strong>
                      {r.distance}
                      <small> KM</small>
                    </strong>
                    <h3>{r.name}</h3>
                    <p>{r.description}</p>
                    <em>ELEGIR ESTE CAMINO →</em>
                  </button>
                );
              })}
            </div>
          </section>
        )}
        {route && (
          <div className="rover-route-progress">
            <span>
              {route.name.toUpperCase()}
              <b>
                {s.rover.segment * 5} / {route.distance} KM
              </b>
            </span>
            <div>
              {Array.from({ length: route.segments }, (_, i) => (
                <i
                  key={i}
                  className={
                    i < s.rover.segment
                      ? "done"
                      : i === s.rover.segment
                        ? "current"
                        : ""
                  }
                />
              ))}
            </div>
            <small>
              {moving ? "ROVER EN MARCHA" : "TOCA AVANZAR O CONDUCE TÚ"}
            </small>
          </div>
        )}
        {route && !s.outcome && (
          <section
            className="rover-console easy-rover-console"
            aria-label="Conducir y encender calor"
          >
            <div className="rover-console-heading">
              <span>CUIDA AL EQUIPO</span>
              <b>{night ? "HACE MUCHO FRÍO AFUERA" : "LLEGAREMOS PRONTO"}</b>
            </div>
            <button
              className={`rover-heat-toggle ${heaterOn ? "switched-on" : ""}`}
              role="switch"
              aria-checked={heaterOn}
              onClick={() =>
                act({ type: "ROVER_HEAT", heater: heaterOn ? "off" : "high" })
              }
            >
              <span aria-hidden="true">🔥</span> Calefacción:{" "}
              {heaterOn ? "ENCENDIDA" : "APAGADA"}
              <i />
            </button>
            <p className="short-copy easy-tip">
              {!heaterOn && night
                ? "¡Es de noche! Enciende el calor para cuidar al equipo."
                : "El calor usa batería y evita que pasemos frío."}
            </p>
            <div className="rover-forecast">
              <span>DESPUÉS DE AVANZAR</span>
              <b className={f.battery <= 0 ? "warn" : ""}>
                {f.battery.toFixed(1)}% <i>BATERÍA</i>
              </b>
              <b className={f.bodyTemperature < 35 ? "warn" : ""}>
                {f.bodyTemperature.toFixed(1)} °C <i>EQUIPO</i>
              </b>
            </div>
            <button
              className="launch-button easy-primary"
              disabled={moving}
              onClick={() => rover.current?.next()}
            >
              {moving ? "ROVER EN MARCHA…" : "AVANZAR 5 KM"} <span>→</span>
            </button>
            <p className="short-copy easy-tip">
              También puedes conducir con las flechas o tocar el mapa.
            </p>
          </section>
        )}
        <button className="world-nasa-button" onClick={() => setPanel("nasa")}>
          [?] Dato Real NASA
        </button>
      </main>
      <WorldDialogue
        tag="DÍA 28"
        text={
          s.rover.route
            ? "¡Sigue los puntos! Toca «Avanzar 5 km». De noche, enciende el calor."
            : "¡Como en bici! Elige un camino: corto con cuestas o largo y más frío."
        }
        onHistory={() => setPanel("history")}
      />
      <footer className="iso-controls">
        <span>
          <kbd>WASD</kbd> / <kbd>FLECHAS</kbd> CONDUCIR · TOCA EL MAPA PARA IR
          AHÍ
        </span>
        <span>
          AGUA {s.resources.agua.toFixed(0)}% · AIRE{" "}
          {s.resources.oxigeno.toFixed(0)}% · EQUIPO{" "}
          {s.resources.integridadTripulacion.toFixed(0)}%
        </span>
      </footer>
      {panel && !s.outcome && (
        <TacticalModal
          title={panel === "nasa" ? "Dato Real NASA" : "Mi viaje"}
          tag="DÍA 28"
          onClose={() => setPanel(null)}
        >
          {panel === "nasa" ? (
            <NasaFact mission="rover" initialOpen />
          ) : (
            <div className="world-history">
              {s.logs.map((l, i) => (
                <article key={`${l.id}-${i}`}>
                  <span>{l.tag}</span>
                  <p className="short-copy">{l.text}</p>
                </article>
              ))}
            </div>
          )}
        </TacticalModal>
      )}
      <LearningLayer />
      {s.outcome && <MissionDossier onRestart={onRestart} />}
    </div>
  );
}
function TwinMeter({
  label,
  value,
  unit,
  percent,
  color,
  min = 0,
  max = 100,
}: {
  label: string;
  value: number;
  unit: string;
  percent: number;
  color: string;
  min?: number;
  max?: number;
}) {
  return (
    <div
      className="rover-twin"
      style={{ "--resource": color } as React.CSSProperties}
    >
      <div>
        <span>{label}</span>
        <strong>
          {value.toFixed(1)}
          <small>{unit}</small>
        </strong>
      </div>
      <div
        className="rover-twin-bar"
        role="meter"
        aria-label={label}
        aria-valuenow={Number(value.toFixed(1))}
        aria-valuemin={min}
        aria-valuemax={max}
      >
        <i style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
      </div>
    </div>
  );
}
