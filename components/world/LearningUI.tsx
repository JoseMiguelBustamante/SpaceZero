"use client";
import { useEffect, useRef, useState } from "react";
import { useGame } from "../GameProvider";
import { LESSONS, HELP_COPY, type LessonSol } from "@/lib/learning";
import type { CityId } from "@/lib/game";
import { Chispa } from "./Chispa";
export function PixelMedal({
  sol,
  locked = false,
}: {
  sol: LessonSol;
  locked?: boolean;
}) {
  const colors: Record<LessonSol, string> = {
    0: "#ba9cff",
    1: "#5ce1e6",
    8: "#ffd34e",
    18: "#bd9aff",
    28: "#ffab79",
  };
  return (
    <svg
      viewBox="0 0 32 38"
      role="img"
      aria-label={locked ? "Medalla por descubrir" : LESSONS[sol].medal}
      shapeRendering="crispEdges"
    >
      <path
        fill={locked ? "#5a536a" : "#dc6caa"}
        d="M5 0h8l3 12-8 4zm14 0h8l-3 16-8-4z"
      />
      <path
        fill={locked ? "#6e687e" : "#ffe592"}
        d="M9 9h14v3h5v5h3v12h-3v5h-5v3H9v-3H4v-5H1V17h3v-5h5z"
      />
      <path
        fill={locked ? "#3f3c53" : colors[sol]}
        d="M10 13h12v3h5v12h-5v5H10v-5H5V16h5z"
      />
      <path
        fill={locked ? "#827b91" : "#fff8d0"}
        d={
          sol === 1
            ? "M15 16h3v4h3v4h2v4H10v-4h2v-4h3z"
            : sol === 8
              ? "M14 16h5v4h4v5h-4v4h-5v-4h-4v-5h4z"
              : sol === 18
                ? "M10 18h3v5h8v-5h3v8h-6v5h-4v-5h-4z"
                : "M9 20h14v8H9zm2-3h10v3H11zm0 11h3v3h-3zm9 0h3v3h-3z"
        }
      />
    </svg>
  );
}
const medalSols: LessonSol[] = [1, 8, 18, 28];
export function MedalBar() {
  const { state: s } = useGame();
  const [open, setOpen] = useState(false);
  return (
    <section
      className={`medal-album ${open ? "album-open" : ""}`}
      aria-label="Álbum de medallas"
    >
      <button
        className="album-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>
          MI ÁLBUM <b>{s.learning.answered.filter((n) => n !== 0).length}/4</b>
        </span>
        <span className="medal-icons">
          {medalSols.map((sol) => (
            <PixelMedal
              key={sol}
              sol={sol}
              locked={!s.learning.answered.includes(sol)}
            />
          ))}
        </span>
      </button>
      {open && (
        <div className="album-content">
          <strong>¡Aprende y colecciona!</strong>
          {medalSols.map((sol) => (
            <div key={sol}>
              <PixelMedal
                sol={sol}
                locked={!s.learning.answered.includes(sol)}
              />
              <span>
                {LESSONS[sol].medal}
                <small>
                  {s.learning.answered.includes(sol)
                    ? "¡La ganaste!"
                    : `Te espera en el día ${sol}`}
                </small>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
export function SciencePlayCard({
  mission,
  cityId,
}: {
  mission: 0 | 1 | 8 | 18 | 28;
  cityId?: CityId | null;
}) {
  const origin =
    cityId === "uyuni"
      ? [
          "☀️ → ⚡",
          "¡Sol que carga!",
          "Uyuni recibe mucha luz del Sol. En el juego, tus paneles cargan más.",
        ]
      : cityId === "la-paz"
        ? [
            "🏔️ + 🧥 → ♥",
            "¡Una manta para Marte!",
            "La Paz conoce el frío de altura. En el juego, guardamos mejor el calor.",
          ]
        : [
            "🌴 + 💧 → 🌱",
            "¡Agua para empezar!",
            "Santa Cruz es cálida y verde. En el juego llevamos más agua, pero perdemos calor.",
          ];
  const card =
    mission === 0
      ? origin
      : mission === 1
        ? [
            "💨 + 💨 → 💧 → 🌱",
            "¡De gases a gotitas!",
            "En el espacio, una máquina junta gases y recupera agua. Aquí deja el agua en verde y cuida el aire.",
          ]
        : mission === 8
          ? [
              "🌫️ → ☀️ → ⚡",
              "¡El polvo es una nube de tierra!",
              "Tapa la luz y cargamos menos. Afuera, el traje ayuda contra los rayos invisibles.",
            ]
          : mission === 18
            ? [
                "☀️ → ✨ → 🛡️",
                "¡El Sol también estornuda!",
                "NASA ve sus llamaradas: son estornudos de energía. Nuestro escudo es de fantasía.",
              ]
            : [
                "🚲 ↗️ = ⚡⚡",
                "¡Como subir una cuesta en bici!",
                "Subir pide más energía. Por el camino largo llega la noche: ¡enciende el calor!",
              ];
  return (
    <aside
      className={`science-play-card science-${mission}`}
      aria-label="Una idea para aprender"
    >
      <div className="science-pictures" aria-hidden="true">
        {card[0]}
      </div>
      <div>
        <strong>{card[1]}</strong>
        <p>{card[2]}</p>
      </div>
    </aside>
  );
}
export function LearningLayer() {
  const { state: s, act } = useGame();
  const dialog = useRef<HTMLDialogElement>(null);
  const help = s.support,
    sol = s.learning.pending,
    open = !!help || sol !== null;
  useEffect(() => {
    const d = dialog.current;
    if (open && !d?.open) d?.showModal();
    else if (!open && d?.open) d.close();
    return () => {
      if (d?.open) d.close();
    };
  }, [open]);
  if (!open) return null;
  const q = sol === null ? null : LESSONS[sol];
  const correct = s.learning.feedback === "correct";
  const copy = help ? HELP_COPY[help.cause] : null;
  return (
    <dialog
      ref={dialog}
      className="learning-dialog"
      aria-label={help ? "Chispa te ayuda" : "Pregunta de Chispa"}
      onCancel={(e) => e.preventDefault()}
    >
      <div className="learning-header">
        <Chispa
          mood={
            help
              ? help.corrected
                ? "happy"
                : "alert"
              : correct
                ? "celebrate"
                : "happy"
          }
        />
        <div>
          <span>CHISPA · TU COMPAÑERO</span>
          <h2>
            {help
              ? "¡Lo arreglamos juntos!"
              : correct
                ? "¡Lo descubriste!"
                : q?.title}
          </h2>
        </div>
      </div>
      {help && copy ? (
        <>
          <div className="help-pictures" aria-hidden="true">
            {copy.visual}
          </div>
          <p>
            {help.corrected
              ? "¡Listo! Usamos mi reserva de ayuda. Tú decides cuándo seguir."
              : copy.text}
          </p>
          <p className="gentle-note">
            Todo está en pausa. Mis reservas nos ayudan a aprender sin perder.
          </p>
          <button
            className="launch-button easy-primary"
            onClick={() =>
              act(
                help.corrected
                  ? { type: "SUPPORT_CONTINUE", now: Date.now() }
                  : { type: "SUPPORT_APPLY" },
              )
            }
          >
            {help.corrected ? "¡SEGUIR EXPLORANDO!" : copy.fix}
          </button>
        </>
      ) : q && sol !== null ? (
        <>
          {correct ? (
            <div className="medal-earned">
              <PixelMedal sol={sol} />
              <h3>{q.medal}</h3>
              <p>{q.explain}</p>
              <button
                className="launch-button easy-primary"
                onClick={() => act({ type: "QUIZ_CONTINUE" })}
              >
                {sol === 28 ? "¡VER MI DIPLOMA!" : "¡SEGUIR LA AVENTURA!"}{" "}
                <span>→</span>
              </button>
            </div>
          ) : (
            <>
              <p className="quiz-question">{q.question}</p>
              <div className="quiz-answers">
                {q.answers.map((a, i) => (
                  <button
                    key={a}
                    onClick={() => act({ type: "QUIZ_ANSWER", answer: i })}
                  >
                    <b>{["A", "B", "C"][i]}</b>
                    {a}
                  </button>
                ))}
              </div>
              <p className="quiz-feedback" role="status">
                {s.learning.feedback === "retry"
                  ? `¡Buen intento! ${q.explain} Prueba otra vez.`
                  : "Puedes probar las veces que quieras. ¡Aprender es explorar!"}
              </p>
            </>
          )}
        </>
      ) : null}
    </dialog>
  );
}
