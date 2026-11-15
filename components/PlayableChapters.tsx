"use client";
import { useEffect, useState } from "react";
import { useGame } from "./GameProvider";
import { NasaFact } from "./NasaFact";
import { advanceStorm } from "@/lib/simulation";
import { SAFE_WATER } from "@/lib/ux";
import type { SystemId } from "@/lib/game";
export function Greenhouse() {
  const { state: s, act } = useGame(),
    g = s.greenhouse,
    r = s.resources,
    done = g.status === "complete",
    failed = g.status === "failed",
    ended = done || failed;
  const safe = g.hydrogen >= SAFE_WATER.min && g.hydrogen <= SAFE_WATER.max,
    danger = g.risk >= 75 || r.oxigeno < 30;
  return (
    <div className="easy-mission easy-water">
      <p className="mission-instruction">
        Objetivo: pon el agua en verde y haz crecer las plantas.
      </p>
      <h3>Máquina de Agua y Aire</h3>
      <p className="short-copy">
        Más agua usa más aire. La luz ayuda a las plantas.
      </p>
      <label className="easy-slider">
        <span>
          Agua para las plantas <strong>{g.hydrogen}%</strong>
        </span>
        <div className="safe-track">
          <span
            className="safe-band"
            style={{
              left: `${SAFE_WATER.min}%`,
              width: `${SAFE_WATER.max - SAFE_WATER.min}%`,
            }}
          />
          <input
            type="range"
            min={0}
            max={100}
            value={g.hydrogen}
            disabled={ended}
            aria-label="Agua para las plantas"
            onChange={(e) =>
              act({
                type: "CALIBRATE",
                field: "hydrogen",
                value: Number(e.target.value),
              })
            }
          />
        </div>
        <span className={`safe-zone-label ${safe ? "in-zone" : ""}`}>
          ■ ZONA SEGURA: 30–50% {safe ? "✓" : "← mueve aquí el control"}
        </span>
      </label>
      <label className="easy-slider">
        <span>
          Luz para las plantas <strong>{g.uv}%</strong>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={g.uv}
          disabled={ended}
          aria-label="Luz para las plantas"
          onChange={(e) =>
            act({
              type: "CALIBRATE",
              field: "uv",
              value: Number(e.target.value),
            })
          }
        />
        <small>Prueba con 45%. Más luz gasta más batería.</small>
      </label>
      <div className="easy-readouts">
        <Readout label="AGUA" value={r.agua} />
        <Readout label="AIRE" value={r.oxigeno} />
        <Readout label="BATERÍA" value={r.energia} />
      </div>
      <div className="easy-progress">
        <span>
          Plantas creciendo <b>{Math.round(g.growth)}%</b>
        </span>
        <progress max={100} value={g.growth} aria-label="Plantas creciendo" />
        <small>Necesitamos llegar a la marca del 50%.</small>
      </div>
      <div
        className={`easy-status ${danger ? "is-danger" : safe ? "is-safe" : ""}`}
        role="status"
      >
        {g.message || "Deja el agua en verde. Luego pulsa «Empezar»."}
      </div>
      <div className="easy-time">
        <span>{g.elapsed} / 25 segundos</span>
        <progress max={25} value={g.elapsed} aria-label="Tiempo de cultivo" />
      </div>
      <p className="short-copy easy-tip">
        Puedes pausar. Al cerrar esta ventana, el cultivo espera.
      </p>
      <NasaFact
        mission="water"
        onOpen={() => act({ type: "GREENHOUSE_PAUSE" })}
      />
    </div>
  );
}
const SYSTEMS: { id: SystemId; icon: string; name: string; tip: string }[] = [
  {
    id: "heating",
    icon: "🔥",
    name: "Calor",
    tip: "Evita que el equipo pase frío.",
  },
  {
    id: "oxygen",
    icon: "💨",
    name: "Aire",
    tip: "Recupera aire para respirar.",
  },
  {
    id: "lights",
    icon: "🌱",
    name: "Plantas",
    tip: "Mantiene viva nuestra comida.",
  },
  {
    id: "eva",
    icon: "☀️",
    name: "Limpiar Paneles",
    tip: "Camina afuera y recupera batería.",
  },
];
export function Storm({ onCycle }: { onCycle?: () => void } = {}) {
  const { state: s, act } = useGame(),
    [notice, setNotice] = useState(""),
    storm = s.storm,
    ended = ["complete", "failed"].includes(storm.status),
    count = Object.values(storm.allocation).filter((v) => v > 0).length,
    f = ended ? s : advanceStorm(s);
  useEffect(() => setNotice(""), [storm.cycle]);
  function toggle(id: SystemId) {
    const on = storm.allocation[id] > 0;
    if (!on && count >= 2) {
      setNotice("Apaga una ayuda antes de encender otra.");
      return;
    }
    setNotice("");
    act({ type: "ALLOCATE", system: id, level: on ? 0 : 50 });
  }
  return (
    <div className="easy-mission easy-storm">
      <p className="mission-instruction">
        Solo puedes tener 2 encendidos al mismo tiempo.
      </p>
      <div className="easy-round">
        <h3>¿Qué cuidamos ahora?</h3>
        <span>RONDA {Math.min(3, storm.cycle + 1)} / 3</span>
      </div>
      <p className="short-copy">Toca una tarjeta para encenderla o apagarla.</p>
      <div className="easy-system-grid">
        {SYSTEMS.map((sys) => {
          const on = storm.allocation[sys.id] > 0;
          return (
            <button
              type="button"
              key={sys.id}
              role="switch"
              aria-checked={on}
              aria-label={`${sys.name}: ${on ? "ENCENDIDO" : "APAGADO"}`}
              className={`easy-system ${on ? "switched-on" : ""}`}
              disabled={ended}
              onClick={() => toggle(sys.id)}
            >
              <span className="easy-system-icon" aria-hidden="true">
                {sys.icon}
              </span>
              <strong>{sys.name}</strong>
              <small>{sys.tip}</small>
              <span className="binary-state">
                <i />
                {on ? "ENCENDIDO" : "APAGADO"}
              </span>
            </button>
          );
        })}
      </div>
      <p className="switch-count" aria-live="polite">
        {count} de 2 encendidos
      </p>
      {notice && (
        <p className="easy-notice short-copy" role="alert">
          {notice}
        </p>
      )}
      <div className="easy-readouts">
        <Readout label="BATERÍA DESPUÉS" value={f.resources.energia} />
        <Readout label="AIRE DESPUÉS" value={f.resources.oxigeno} />
        <Readout
          label="CALOR DENTRO"
          value={f.resources.temperaturaCabina}
          unit="°C"
        />
      </div>
      <div className="easy-status" role="status">
        {storm.message || "Todo espera hasta que pulses «Pasar ronda»."}
      </div>
      <p className="short-copy easy-tip">
        Enciende Plantas alguna ronda para no perder la comida.
      </p>
      <NasaFact mission="storm" />
    </div>
  );
}
function Readout({
  label,
  value,
  unit = "%",
}: {
  label: string;
  value: number;
  unit?: string;
}) {
  return (
    <div>
      <span>{label}</span>
      <strong>
        {value.toFixed(1)}
        <small>{unit}</small>
      </strong>
    </div>
  );
}
