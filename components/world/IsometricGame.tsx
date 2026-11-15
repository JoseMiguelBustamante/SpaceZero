"use client";
import { useEffect, useRef, useState } from "react";
import { useGame } from "../GameProvider";
import { Greenhouse, Storm } from "../PlayableChapters";
import { RescueChapter, SignalPreview } from "../RescueChapter";
import { NasaFact } from "../NasaFact";
import { CITIES, type CityId } from "@/lib/game";
import {
  structuresForCity,
  activeBuilding,
  evaProjection,
  type BuildingId,
} from "@/lib/isometric";
import { missionObjective, SHIELD_COST } from "@/lib/ux";
import {
  WorldCanvas,
  type WorldHandle,
  type PositionUpdate,
} from "./WorldCanvas";
import { TacticalModal } from "./TacticalModal";
import { PixelPlanet, WorldHUD, WorldDialogue, MissionGoal } from "./WorldUI";
import { JezeroExpedition } from "./JezeroExpedition";
import { Chispa } from "./Chispa";
import { BoliviaMap } from "./BoliviaMap";
import { MedalBar, SciencePlayCard, LearningLayer } from "./LearningUI";
import {
  prologueFrame,
  PROLOGUE_DANGER,
  PROLOGUE_SURVIVED,
} from "@/lib/prologue";
import { MissionDossier } from "./MissionDossier";
type Cinematic = "select" | "earth" | "warning" | "collapse" | "mars";
type Panel = BuildingId | "help" | "history" | "nasa" | null;
type EvaTrip = { cycle: number; startedAt: number; arrivedAt: number };
export function IsometricGame() {
  const { state: s, selectCity, reset, sound, toggleSound, act } = useGame(),
    world = useRef<WorldHandle>(null),
    emergency = useRef<HTMLDialogElement>(null),
    latest = useRef(s);
  latest.current = s;
  const prologue = prologueFrame(s.prologue.elapsed);
  const cinematic: Cinematic =
    s.solActual !== 0
      ? "mars"
      : !s.cityId
        ? "select"
        : prologue.stage === "earth"
          ? "earth"
          : prologue.stage === "warning"
            ? "warning"
            : "collapse";
  const transformation = s.solActual === 0 ? prologue.transform : 1;
  const prologueAlert = s.solActual === 0 && prologue.alert;
  const [modal, setModal] = useState<Panel>(null),
    [position, setPosition] = useState<PositionUpdate>({
      position: { x: 5, y: 6 },
      moving: false,
      nearby: null,
    }),
    [toast, setToast] = useState(""),
    [pendingEva, setPendingEva] = useState<EvaTrip | null>(null),
    [evaElapsed, setEvaElapsed] = useState(0),
    [resetConfirm, setResetConfirm] = useState(false);
  const city = CITIES.find((c) => c.id === s.cityId),
    solarAlert = s.rescue.status === "alert",
    cleaning = !!pendingEva?.arrivedAt,
    active =
      s.outcome || (s.solActual === 18 && s.rescue.status === "complete")
        ? null
        : activeBuilding(s),
    lastCommit = useRef(""),
    previousPhase = useRef(s.phase);
  useEffect(() => {
    if (previousPhase.current !== s.phase) {
      previousPhase.current = s.phase;
      setModal(null);
      setPendingEva(null);
      setToast("");
    }
  }, [s.phase]);
  useEffect(() => {
    if (s.learning.pending !== null || s.support) setModal(null);
  }, [s.learning.pending, !!s.support]);
  useEffect(() => {
    if (solarAlert) {
      setModal(null);
      if (emergency.current && !emergency.current.open)
        emergency.current.showModal();
    }
    return () => emergency.current?.close();
  }, [solarAlert]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (cinematic === "earth") world.current?.walkTo({ x: 6, y: 5 });
  }, [cinematic, s.cityId]);
  useEffect(() => {
    if (prologueAlert) {
      setModal(null);
      setToast("");
    }
  }, [prologueAlert]);
  useEffect(() => {
    if (pendingEva && !pendingEva.arrivedAt && !modal)
      world.current?.goTo("solar");
  }, [pendingEva, modal]);
  useEffect(() => {
    if (!pendingEva) {
      setEvaElapsed(0);
      return;
    }
    const trip = pendingEva,
      id = `${trip.cycle}:${trip.startedAt}`,
      t = setInterval(() => {
        setEvaElapsed((Date.now() - trip.startedAt) / 1000);
        if (
          trip.arrivedAt &&
          Date.now() - trip.arrivedAt >= 3000 &&
          lastCommit.current !== id
        ) {
          const current = latest.current;
          if (
            current.solActual === 8 &&
            current.storm.cycle === trip.cycle &&
            !["complete", "failed"].includes(current.storm.status)
          ) {
            lastCommit.current = id;
            act({ type: "STORM_CYCLE" });
            setToast("¡Paneles limpios! Vuelve al Refugio.");
          }
          setPendingEva(null);
          clearInterval(t);
        }
      }, 100);
    return () => clearInterval(t);
  }, [pendingEva]);
  function chooseCity(id: CityId) {
    setModal(null);
    world.current?.reset();
    void selectCity(id);
  }
  function restart() {
    reset();
    setModal(null);
    setPendingEva(null);
    setResetConfirm(false);
    setToast("");
    world.current?.reset();
  }
  function pauseCultivation() {
    if (s.greenhouse.status === "running") act({ type: "GREENHOUSE_PAUSE" });
  }
  function closeModal() {
    pauseCultivation();
    setModal(null);
  }
  function openPanel(panel: Panel) {
    if (prologueAlert) return;
    if (panel !== "greenhouse") pauseCultivation();
    setModal(panel);
  }
  function requestCycle() {
    if (pendingEva) {
      setToast("Primero termina de limpiar los paneles.");
      return;
    }
    if (s.storm.allocation.eva > 0) {
      setPendingEva({
        cycle: s.storm.cycle,
        startedAt: Date.now(),
        arrivedAt: 0,
      });
      setModal(null);
      setToast("Vamos a los paneles. El equipo caminará hasta allí.");
    } else act({ type: "STORM_CYCLE" });
  }
  function arrived(id: BuildingId) {
    if (solarAlert || s.outcome) return;
    if (cinematic !== "mars") {
      setToast("¡Explora! La historia avanzará sola en 20 segundos.");
      return;
    }
    if (pendingEva) {
      if (id === "solar") {
        setPendingEva((t) => (t ? { ...t, arrivedAt: Date.now() } : null));
        setToast("Limpiando… espera tres segundos.");
      } else setToast("Sigue la flecha hasta los paneles.");
      return;
    }
    if (id === "garage" && s.phase === "sol28") {
      act({ type: "BOARD_ROVER" });
      return;
    }
    openPanel(id);
  }
  function go(id: BuildingId) {
    closeModal();
    requestAnimationFrame(() => world.current?.goTo(id));
  }
  const objective =
    s.solActual === 0
      ? cinematic === "select"
        ? "Objetivo: Elige una ciudad para empezar."
        : cinematic === "earth"
          ? "Objetivo: Explora tu isla. La historia avanza sola."
          : cinematic === "warning"
            ? "Objetivo: ¡Atención! Chispa nos guía durante la alerta."
            : "Objetivo: Mira cómo tu isla se convierte en Marte."
      : s.learning.pending !== null
        ? "Objetivo: Responde a Chispa para ganar tu medalla."
        : s.support
          ? "Objetivo: Arregla el control con la ayuda de Chispa."
          : missionObjective(s, !!pendingEva);
  const dialogue =
    cinematic === "select"
      ? "¡Hola, explorador! Toca un pin de Bolivia para crear tu isla mágica."
      : cinematic === "earth"
        ? `¡Bienvenido a ${city?.name}! Explora tu ciudad mientras analizamos el clima real con la NASA...`
        : prologueAlert
          ? PROLOGUE_DANGER
          : pendingEva
            ? cleaning
              ? "Estamos limpiando. Pronto recuperaremos batería."
              : "Camina a los paneles. Tu traje te protege del frío."
            : s.solActual === 0
              ? "Ahora estamos en Marte. ¡Vamos a cuidar al equipo!"
              : s.solActual === 1
                ? s.greenhouse.status === "failed"
                  ? "¡Probemos otra vez! Toca el Invernadero y deja el agua en verde."
                  : PROLOGUE_SURVIVED
                : s.solActual === 8
                  ? "¡Una nube de polvo! Toca el Refugio para elegir dos ayudas."
                  : s.solActual === 18
                    ? s.rescue.status === "failed"
                      ? "¡Otra oportunidad! Toca la Antena y pulsa «Probar otra vez»."
                      : "¡Llamemos a la Tierra! Toca la Antena y junta las líneas de colores."
                    : "¡El rescate nos espera! Toca el Garaje y sube al rover.";
  const heading =
    s.solActual === 0
      ? "DE BOLIVIA A MARTE"
      : s.solActual === 1
        ? "HAGAMOS AGUA"
        : s.solActual === 8
          ? "CUIDA AL EQUIPO"
          : s.solActual === 18
            ? "LLAMA A LA TIERRA"
            : "VAMOS AL RESCATE";
  const nearby = structuresForCity(s.cityId).find(
      (b) => b.id === position.nearby,
    ),
    building = structuresForCity(s.cityId).find((b) => b.id === modal),
    science =
      s.solActual === 0
        ? "origin"
        : s.solActual === 1
          ? "water"
          : s.solActual === 8
            ? "storm"
            : s.solActual === 18
              ? "signal"
              : "rover";
  const nasaContent = (
    <NasaFact mission={science} initialOpen>
      {s.solActual === 0 && (
        <p className="short-copy">
          Las islas vuelan solo en esta historia.{" "}
          <a
            href="https://www.geoboundaries.org/api/current/gbOpen/BOL/ADM1/"
            target="_blank"
            rel="noreferrer"
          >
            Su forma viene de GeoBolivia.
          </a>
        </p>
      )}
      {s.solActual === 0 && s.climate && (
        <>
          <p className="short-copy">
            {city?.name}: {s.climate.temperature.toFixed(1)} °C.
          </p>
          <p className="short-copy">
            Luz solar: {s.climate.solar.toFixed(2)} kWh/m²/día.
          </p>
          <p className="short-copy">
            {s.climate.source === "live"
              ? "Consulta a NASA POWER."
              : "Dato real guardado: la consulta no respondió."}
          </p>
          <a href={s.climate.url} target="_blank" rel="noreferrer">
            Ver dato del 15/01/2024 ↗
          </a>
        </>
      )}
      {s.solActual === 18 && s.rescue.event && (
        <>
          <p className="short-copy">
            Llamarada {s.rescue.event.classType} ·{" "}
            {s.rescue.event.source === "live"
              ? "Consulta NASA"
              : "Dato real guardado"}
          </p>
          <p className="short-copy">
            {s.rescue.event.peakTime.replace("T", " · ").replace("Z", " UTC")}
          </p>
          <p className="short-copy">
            Zona del Sol: {s.rescue.event.activeRegion}
          </p>
          <a href={s.rescue.event.link} target="_blank" rel="noreferrer">
            Ver este dato en NASA ↗
          </a>
        </>
      )}
    </NasaFact>
  );
  let missionAction: React.ReactNode;
  if (modal === "greenhouse" && s.solActual === 1) {
    const status = s.greenhouse.status,
      ended = ["complete", "failed"].includes(status);
    missionAction = (
      <button
        className="launch-button easy-primary"
        onClick={() =>
          act({
            type: ended
              ? status === "complete"
                ? "ENTER_STORM"
                : "RETRY"
              : status === "running"
                ? "GREENHOUSE_PAUSE"
                : "GREENHOUSE_START",
          })
        }
      >
        {ended
          ? status === "complete"
            ? "IR AL DÍA 8"
            : "PROBAR OTRA VEZ"
          : status === "running"
            ? "PAUSAR"
            : status === "paused"
              ? "SEGUIR CULTIVANDO"
              : "EMPEZAR A CULTIVAR"}
        <span>{status === "running" ? "Ⅱ" : "→"}</span>
      </button>
    );
  } else if (modal === "refuge" && s.solActual === 8) {
    const done = s.storm.status === "complete",
      failed = s.storm.status === "failed";
    missionAction = (
      <button
        className="launch-button easy-primary"
        onClick={() =>
          done
            ? act({ type: "ENTER_RESCUE" })
            : failed
              ? act({ type: "RETRY" })
              : requestCycle()
        }
      >
        {done
          ? "IR AL DÍA 18"
          : failed
            ? "PROBAR OTRA VEZ"
            : s.storm.allocation.eva > 0
              ? "SALIR A LIMPIAR PANELES"
              : `PASAR RONDA ${s.storm.cycle + 1}`}
        <span>→</span>
      </button>
    );
  } else if (modal === "probe" && s.solActual === 18) {
    const status = s.rescue.status;
    missionAction = (
      <button
        className="launch-button easy-primary"
        disabled={
          status === "tuning" || status === "connected" || status === "alert"
        }
        onClick={() =>
          act(
            status === "idle"
              ? { type: "SIGNAL_START", now: Date.now() }
              : status === "complete"
                ? { type: "ENTER_ROVER" }
                : { type: "RETRY" },
          )
        }
      >
        {status === "idle"
          ? "CONECTAR CON LA TIERRA"
          : status === "tuning"
            ? `CONECTANDO… ${Math.ceil(20 - s.rescue.elapsed)} S`
            : status === "connected"
              ? "ESPERANDO AVISO DE NASA…"
              : status === "complete"
                ? "IR AL DÍA 28"
                : "PROBAR OTRA VEZ"}
        <span>→</span>
      </button>
    );
  }
  if (s.rover.boarded) return <JezeroExpedition onRestart={restart} />;
  return (
    <div
      className={`iso-game easy-game kids-game ${s.solActual === 8 ? "iso-storm" : ""} ${prologueAlert ? "iso-prologue-alert" : ""} ${s.solActual === 0 && s.cityId ? "prologue-narrative" : ""} ${solarAlert ? "iso-solar-alert" : ""}`}
    >
      <header className="iso-topbar">
        <a className="iso-brand" href="#world">
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
          {s.solActual === 0 ? "BOLIVIA → MARTE" : "BASE EN MARTE"}
        </div>
        <div className="iso-header-actions">
          <span className="iso-sol">
            DÍA <strong>{String(s.solActual).padStart(2, "0")}</strong>
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
          <button
            className="iso-icon-button"
            onClick={() => openPanel("help")}
            aria-label="Cómo jugar"
            disabled={solarAlert || prologueAlert}
          >
            ?
          </button>
        </div>
      </header>
      <MissionGoal
        text={objective}
        onGo={
          active && cinematic === "mars" && !modal && !pendingEva
            ? () => go(active)
            : undefined
        }
      />
      <MedalBar />
      <WorldHUD evaRadiation={pendingEva ? evaProjection(s, evaElapsed) : 0} />
      {s.solActual === 0 && (
        <section
          className="prologue-steps prologue-timeline"
          aria-label="Prólogo automático de 20 segundos"
        >
          <div aria-current={cinematic === "earth" ? "step" : undefined}>
            <b>0–10 s</b> Explora tu ciudad
          </div>
          <div aria-current={cinematic === "warning" ? "step" : undefined}>
            <b>10–16 s</b> ¡Alerta!
          </div>
          <div aria-current={cinematic === "collapse" ? "step" : undefined}>
            <b>16–20 s</b> Rumbo a Marte
          </div>
          {s.cityId && (
            <span
              className="prologue-clock"
              role="timer"
              aria-label="Segundos del prólogo"
            >
              {Math.floor(prologue.seconds)} / 20 s
            </span>
          )}
          <small>HISTORIA DE FANTASÍA · LOS DATOS NASA SON REALES</small>
        </section>
      )}
      <main
        id="world"
        className="iso-world"
        aria-label="Base en Marte: toca un edificio para ir hasta él"
      >
        <div className="world-heading">
          <div className="eyebrow">
            {s.solActual === 0 ? "EL COMIENZO" : `DÍA ${s.solActual} EN MARTE`}
          </div>
          <h1>{heading}</h1>
          <p>
            {cinematic === "earth"
              ? city?.name
              : cinematic === "collapse"
                ? "Tu ciudad está cambiando…"
                : cinematic === "warning"
                  ? "¡Chispa está contigo!"
                  : "Toca un edificio. Tu personaje caminará hasta allí."}
          </p>
        </div>
        <div className="world-coordinate-card easy-location">
          <span>
            {s.solActual === 0 && cinematic !== "mars"
              ? "TU CIUDAD"
              : "TU BASE"}
          </span>
          <strong>
            {s.solActual === 0 && cinematic !== "mars"
              ? (city?.name ?? "BOLIVIA")
              : "MARTE"}
          </strong>
          <span className="coordinate-link">
            <i />
            {s.climate ? "DATOS NASA LISTOS" : "PREPARANDO VIAJE"}
          </span>
        </div>
        <WorldCanvas
          ref={world}
          transformation={transformation}
          blocked={
            !!modal ||
            !!s.support ||
            s.learning.pending !== null ||
            !!s.outcome ||
            cinematic === "select" ||
            prologueAlert ||
            cleaning ||
            solarAlert
          }
          active={cinematic === "mars" ? (pendingEva ? "solar" : active) : null}
          cleaning={cleaning}
          onArrive={arrived}
          onPosition={setPosition}
        />
        {cinematic === "select" && (
          <section className="origin-overlay" aria-label="Elegir ciudad">
            <div className="origin-overlay-header">
              <span className="eyebrow">1. ELEGIR CIUDAD</span>
              <h2>
                TU ISLA <em>ESPACIAL</em>
              </h2>
              <p>¡Elige un pin y despierta tu isla mágica!</p>
            </div>
            <BoliviaMap onChoose={chooseCity} />
            <div className="origin-choices">
              {CITIES.map((c, i) => (
                <button
                  className={`origin-choice origin-${c.id}`}
                  key={c.id}
                  onClick={() => chooseCity(c.id)}
                >
                  <span className="origin-symbol" aria-hidden="true">
                    {i === 0 ? "▟" : i === 1 ? "▱" : "▴"}
                  </span>
                  <span>
                    <strong>{c.name}</strong>
                    <span className="origin-bonus">{c.bonus}</span>
                  </span>
                  <b>→</b>
                </button>
              ))}
            </div>
            <div className="origin-overlay-footer">
              <span className="live-dot" />
              ELIGE UNA. LA HISTORIA AVANZA SOLA EN 20 SEGUNDOS.
            </div>
          </section>
        )}
        {s.solActual === 0 &&
          cinematic !== "select" &&
          cinematic === "earth" && (
            <div className="origin-science">
              <SciencePlayCard mission={0} cityId={s.cityId} />
            </div>
          )}
        {prologueAlert && (
          <div
            className="prologue-danger-card"
            role="alert"
            aria-label="¡Peligro! Escena de fantasía"
          >
            <Chispa mood="alert" />
            <div>
              <strong>¡PELIGRO!</strong>
              <p>{PROLOGUE_DANGER}</p>
              <small>
                AVENTURA DE FANTASÍA · NO ES UNA ALERTA REAL DE NASA
              </small>
            </div>
            {cinematic === "collapse" && (
              <progress
                value={transformation}
                max={1}
                aria-label="Transformación a Marte"
              />
            )}
          </div>
        )}
        {toast && !solarAlert && (
          <div className="world-toast short-copy" role="status">
            ▸ {toast}
          </div>
        )}
        {pendingEva && (
          <div className="eva-route-card" role="status">
            <span className="live-dot" />
            <div>
              {cleaning ? "LIMPIANDO PANELES" : "CAMINANDO A LOS PANELES"}
              <strong>
                Riesgo al salir: +{evaProjection(s, evaElapsed).toFixed(1)}%
              </strong>
              <small>
                {cleaning ? "YA CASI TERMINAMOS" : "SIGUE LA FLECHA AMARILLA"}
              </small>
            </div>
          </div>
        )}
        {s.rescue.status === "complete" && s.solActual === 18 && !s.outcome && (
          <div className="world-complete-banner">
            <span className="live-dot" />
            ¡EL EQUIPO ESTÁ A SALVO!
            <button
              className="world-secondary"
              onClick={() => act({ type: "ENTER_ROVER" })}
            >
              IR AL DÍA 28 →
            </button>
          </div>
        )}
        {s.rescue.status === "connected" && (
          <div className="world-complete-banner" role="status">
            ¡Hay señal! Esperando el aviso de NASA…
          </div>
        )}
        <div className="world-tools">
          <button
            aria-label="Acercar mapa"
            onClick={() => world.current?.zoom(1)}
          >
            +
          </button>
          <button
            aria-label="Alejar mapa"
            onClick={() => world.current?.zoom(-1)}
          >
            −
          </button>
          <button
            aria-label="Ver toda la base"
            onClick={() => world.current?.zoom(0)}
          >
            ⌖
          </button>
        </div>
        <button
          className="world-nasa-button"
          onClick={() => openPanel("nasa")}
          disabled={prologueAlert}
        >
          [?] Dato Real NASA
        </button>
      </main>
      <WorldDialogue
        text={dialogue}
        tag={`DÍA ${s.solActual}`}
        onHistory={() => openPanel("history")}
        mood={prologueAlert ? "alert" : undefined}
        instant={prologueAlert}
        action={
          s.solActual !== 0 && nearby && !pendingEva
            ? () => world.current?.interact()
            : undefined
        }
        actionLabel="ABRIR [E]"
      />
      <footer className="iso-controls">
        <span>
          <kbd>WASD</kbd> / <kbd>FLECHAS</kbd> CAMINAR · TOCA UN EDIFICIO PARA
          ENTRAR
        </span>
        <span>HECHO EN BOLIVIA. RUMBO A MARTE.</span>
      </footer>
      {modal && !s.outcome && (
        <TacticalModal
          title={
            modal === "help"
              ? "Cómo jugar"
              : modal === "history"
                ? "Mi viaje"
                : modal === "nasa"
                  ? "Dato Real NASA"
                  : (building?.name ?? "")
          }
          tag={`DÍA ${s.solActual}`}
          onClose={closeModal}
          action={missionAction}
          preview={
            modal === "probe" && s.solActual === 18 ? (
              <SignalPreview />
            ) : undefined
          }
          kind={
            modal === "greenhouse" && s.solActual === 1
              ? "greenhouse"
              : modal === "refuge" && s.solActual === 8
                ? "storm"
                : modal === "probe" && s.solActual === 18
                  ? "rescue"
                  : "info"
          }
        >
          {((modal === "greenhouse" && s.solActual === 1) ||
            (modal === "refuge" && s.solActual === 8) ||
            (modal === "probe" && s.solActual === 18)) && (
            <SciencePlayCard
              mission={s.solActual as 1 | 8 | 18}
              cityId={s.cityId}
            />
          )}
          {modal === "help" ? (
            <div className="world-info easy-help">
              <p className="short-copy">
                Toca un edificio para caminar hasta él y entrar.
              </p>
              <p className="short-copy">
                También puedes caminar con WASD o las flechas.
              </p>
              <p className="short-copy">
                Sigue la flecha amarilla. Ahí está tu siguiente tarea.
              </p>
              <p className="short-copy">
                No gastas reservas por caminar o leer la ayuda.
              </p>
              <p className="short-copy">
                Día 1: pon el agua en verde para cultivar.
              </p>
              <p className="short-copy">
                Día 8: elige dos ayudas en cada ronda.
              </p>
              <p className="short-copy">
                Día 18: junta las líneas y activa el escudo en 10 segundos.
              </p>
              <p className="short-copy">
                Día 28: sigue el camino y enciende el calor de noche.
              </p>
              {resetConfirm ? (
                <div className="reset-confirm">
                  ¿EMPEZAR DE CERO? <button onClick={restart}>SÍ</button>
                  <button onClick={() => setResetConfirm(false)}>
                    CANCELAR
                  </button>
                </div>
              ) : (
                <button
                  className="world-secondary"
                  onClick={() => setResetConfirm(true)}
                >
                  ELEGIR OTRA CIUDAD ↻
                </button>
              )}
            </div>
          ) : modal === "history" ? (
            <div className="world-history">
              {s.logs.map((l, i) => (
                <article key={`${l.id}-${i}`}>
                  <span>{l.tag}</span>
                  <p className="short-copy">{l.text}</p>
                </article>
              ))}
            </div>
          ) : modal === "nasa" ? (
            nasaContent
          ) : modal === "greenhouse" && s.solActual === 1 ? (
            <Greenhouse />
          ) : modal === "refuge" && s.solActual === 8 ? (
            <Storm onCycle={requestCycle} />
          ) : modal === "probe" && s.solActual === 18 ? (
            <RescueChapter />
          ) : (
            <div className="world-info">
              <h3>{building?.name}</h3>
              <p className="short-copy">
                {modal === "garage"
                  ? "El rover nos llevará al rescate en el día 28."
                  : modal === "solar"
                    ? "Estos paneles dan energía. Se limpian desde el Refugio."
                    : modal === "greenhouse"
                      ? "Aquí hacemos agua para cuidar las plantas."
                      : modal === "probe"
                        ? "Esta antena nos ayudará a llamar a la Tierra."
                        : "Aquí cuidamos el calor, el aire y las plantas."}
              </p>
              {active && (
                <button
                  className="launch-button easy-primary"
                  onClick={() => go(active)}
                >
                  IR A MI TAREA <span>→</span>
                </button>
              )}
            </div>
          )}
        </TacticalModal>
      )}
      {solarAlert && !s.outcome && (
        <dialog
          ref={emergency}
          className="world-solar-emergency easy-emergency"
          role="alertdialog"
          aria-modal="true"
          aria-label="Alerta solar: activa el escudo"
          onCancel={(e) => e.preventDefault()}
        >
          <div className="solar-emergency-heading">
            <Chispa mood="alert" />
            <div>
              ¡ALERTA SOLAR!<small>PROTEGE AL EQUIPO DE LA RADIACIÓN</small>
            </div>
          </div>
          <div
            className="easy-countdown"
            role="timer"
            aria-label="Segundos para activar el escudo"
          >
            <strong>{s.rescue.secondsLeft}</strong>
            <span>SEGUNDOS</span>
          </div>
          <p className="short-copy">
            ¡El Sol estornudó energía! Enciende nuestro escudo de fantasía.
          </p>
          <button
            autoFocus
            className="world-shield-button"
            onClick={() => act({ type: "SHIELD", now: Date.now() })}
          >
            ¡ACTIVAR ESCUDO!
          </button>
          <p className="short-copy">
            Escudo Anti-Radiación · usa {SHIELD_COST}% de batería.
          </p>
          {s.resources.energia < SHIELD_COST && (
            <p className="short-copy warn" role="alert">
              Falta batería. Después podrás volver a limpiar paneles.
            </p>
          )}
        </dialog>
      )}
      <LearningLayer />
      {s.outcome && <MissionDossier onRestart={restart} />}
    </div>
  );
}
