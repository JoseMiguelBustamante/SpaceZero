"use client";
import { useEffect, useState } from "react";
import { Chispa, type ChispaMood } from "./Chispa";
import { useGame } from "../GameProvider";
import type { ResourceKey } from "@/lib/game";
export function PixelPlanet() {
  return (
    <svg
      viewBox="0 0 32 32"
      width="29"
      height="29"
      fill="currentColor"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <path d="M10 2h12v3h5v5h3v12h-3v5h-5v3H10v-3H5v-5H2V10h3V5h5zm0 5v3H7v12h3v3h12v-3h3V10h-3V7z" />
      <path d="M0 15h8v3H0zm24 0h8v3h-8zM9 13h14v2H9zm0 6h14v2H9z" />
    </svg>
  );
}
const RESOURCES: {
  key: ResourceKey;
  label: string;
  glyph: string;
  color: string;
}[] = [
  { key: "agua", label: "AGUA", glyph: "💧", color: "#5ce1e6" },
  { key: "oxigeno", label: "AIRE", glyph: "💨", color: "#a9b8eb" },
  { key: "energia", label: "BATERÍA", glyph: "⚡", color: "#ffb000" },
  { key: "temperaturaCabina", label: "CALOR", glyph: "🌡️", color: "#ec8b66" },
  {
    key: "radiacionTripulacion",
    label: "RADIACIÓN",
    glyph: "☢",
    color: "#c5a4d5",
  },
  { key: "saludCosecha", label: "PLANTAS", glyph: "✳", color: "#a3cc85" },
  {
    key: "integridadTripulacion",
    label: "EQUIPO",
    glyph: "♥",
    color: "#e6a29c",
  },
];
export function WorldHUD({ evaRadiation = 0 }: { evaRadiation?: number }) {
  const { state } = useGame();
  return (
    <section className="world-hud" aria-label="Recursos de supervivencia">
      {RESOURCES.map((r) => {
        const raw = state.resources[r.key],
          temp = r.key === "temperaturaCabina",
          preview = r.key === "radiacionTripulacion" && evaRadiation > 0,
          value = temp
            ? raw.toFixed(1)
            : Math.round(raw + (preview ? evaRadiation : 0));
        const bar = temp ? Math.max(0, ((raw + 20) / 60) * 100) : Number(value);
        return (
          <div
            className={`world-resource ${preview ? "eva-preview" : ""}`}
            key={r.key}
            style={{ "--resource": r.color } as React.CSSProperties}
            title={`${r.label}: ${raw.toFixed(1)}${temp ? " °C" : "%"}${preview ? ` + ${evaRadiation.toFixed(1)}% de riesgo al limpiar` : ""}`}
          >
            <span className="resource-glyph">{r.glyph}</span>
            <div>
              <span className="world-resource-label">
                {r.label}
                {preview ? " · AFUERA" : ""}
              </span>
              <strong>
                {temp && raw > 0 ? "+" : ""}
                {value}
                <small>{temp ? "°C" : "%"}</small>
              </strong>
              <div
                className="world-resource-bar"
                role="meter"
                aria-label={preview ? "Riesgo al limpiar paneles" : r.label}
                aria-valuenow={Number(value)}
                aria-valuemin={temp ? -75 : 0}
                aria-valuemax={temp ? 40 : 100}
              >
                <i style={{ width: `${Math.min(100, bar)}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
export function WorldDialogue({
  text,
  tag,
  action,
  actionLabel,
  actionDisabled = false,
  onHistory,
  mood,
  instant = false,
}: {
  text: string;
  mood?: ChispaMood;
  instant?: boolean;
  tag: string;
  action?: () => void;
  actionLabel?: string;
  actionDisabled?: boolean;
  onHistory: () => void;
}) {
  const [count, setCount] = useState(0);
  const { state } = useGame();
  useEffect(() => {
    setCount(0);
    if (
      instant ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setCount(text.length);
      return;
    }
    const t = setInterval(
      () => setCount((c) => Math.min(text.length, c + 3)),
      20,
    );
    return () => clearInterval(t);
  }, [text, instant]);
  return (
    <section className="world-dialogue" aria-label="Diálogo de misión">
      <div className="dialogue-portrait">
        <Chispa
          mood={
            mood ??
            (state.support || state.rescue.status === "alert"
              ? "alert"
              : state.learning.pending !== null || state.outcome
                ? "celebrate"
                : "happy")
          }
        />
        <span>CHISPA</span>
      </div>
      <div className="dialogue-copy">
        <div className="dialogue-meta">
          <span>
            TU ROBOT GUÍA <b>/</b> {tag}
          </span>
          <button onClick={onHistory}>
            MI VIAJE <span>{String(state.logs.length).padStart(2, "0")}</span> ↗
          </button>
        </div>
        <p aria-label={text} onClick={() => setCount(text.length)}>
          {text.slice(0, count)}
          <span className="cursor">▌</span>
        </p>
      </div>
      {action && (
        <button
          className="dialogue-action"
          onClick={action}
          disabled={actionDisabled}
        >
          {actionLabel}
          <span>→</span>
        </button>
      )}
    </section>
  );
}

export function MissionGoal({
  text,
  onGo,
}: {
  text: string;
  onGo?: () => void;
}) {
  return (
    <div className="mission-goal" role="status">
      <span className="goal-arrow" aria-hidden="true">
        ➜
      </span>
      <p>{text}</p>
      {onGo && <button onClick={onGo}>IR AHÍ →</button>}
    </div>
  );
}
