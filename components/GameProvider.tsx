"use client";
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CITIES,
  INITIAL_STATE,
  climateUrl,
  gameReducer,
  parseClimate,
  type Action,
  type CityId,
  type GameState,
} from "@/lib/game";
import { prologueFrame } from "@/lib/prologue";
import { HISTORICAL_FLARE, donkiUrl, latestFlare } from "@/lib/donki";
type GameContextType = {
  state: GameState;
  selectCity: (id: CityId) => void;
  start: () => void;
  reset: () => void;
  sound: boolean;
  toggleSound: () => void;
  act: (action: Action) => void;
};
const Context = createContext<GameContextType | null>(null);
export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE);
  const [sound, setSound] = useState(true);
  const counter = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const prologueAlert =
    state.solActual === 0 && prologueFrame(state.prologue.elapsed).alert;
  useEffect(() => {
    if (
      state.solActual !== 0 ||
      !state.cityId ||
      state.prologue.startedAt === null
    )
      return;
    const requestId = state.requestId;
    const tick = () =>
      dispatch({ type: "PROLOGUE_TICK", requestId, now: Date.now() });
    tick();
    // Wall-clock based: 100 ms keeps the 20 s transition exact while
    // cutting re-render load on low-powered devices.
    const timer = setInterval(tick, 100);
    return () => clearInterval(timer);
  }, [
    state.solActual,
    state.cityId,
    state.requestId,
    state.prologue.startedAt,
  ]);
  useEffect(() => {
    if (state.support || state.learning.pending !== null) return;
    const tuning = state.phase === "sol18" && state.rescue.status === "tuning";
    const alert = state.phase === "sol18" && state.rescue.status === "alert";
    if (!tuning && !alert) return;
    const timer = setInterval(
      () =>
        dispatch({
          type: tuning ? "SIGNAL_TICK" : "ALERT_TICK",
          now: Date.now(),
        }),
      100,
    );
    return () => clearInterval(timer);
  }, [state.phase, state.rescue.status, state.support, state.learning.pending]);
  useEffect(() => {
    if (state.phase !== "sol18" || state.rescue.status !== "connected") return;
    const attempt = state.rescue.attempt;
    const abort = new AbortController();
    let disposed = false;
    const timeout = setTimeout(() => abort.abort(), 5000);
    async function load() {
      let event;
      try {
        const response = await fetch(donkiUrl(), { signal: abort.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        event = latestFlare(await response.json());
      } catch (error) {
        event = {
          ...HISTORICAL_FLARE,
          reason: error instanceof Error ? error.message : "API indisponible",
        };
      } finally {
        clearTimeout(timeout);
      }
      if (!disposed)
        dispatch({ type: "SOLAR_EVENT", event, attempt, now: Date.now() });
    }
    void load();
    return () => {
      disposed = true;
      clearTimeout(timeout);
      abort.abort();
    };
  }, [state.phase, state.rescue.status, state.rescue.attempt]);
  useEffect(() => {
    if (
      state.support ||
      !sound ||
      (!prologueAlert &&
        (state.phase !== "sol18" || state.rescue.status !== "alert"))
    )
      return;
    const playing = new Set<OscillatorNode>();
    const siren = () => {
      try {
        const a = audio.current ?? (audio.current = new AudioContext());
        void a.resume();
        const o = a.createOscillator(),
          g = a.createGain();
        playing.add(o);
        o.onended = () => {
          playing.delete(o);
          o.disconnect();
          g.disconnect();
        };
        o.type = "square";
        o.frequency.setValueAtTime(330, a.currentTime);
        o.frequency.linearRampToValueAtTime(660, a.currentTime + 0.3);
        o.frequency.linearRampToValueAtTime(330, a.currentTime + 0.6);
        g.gain.setValueAtTime(0.035, a.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.65);
        o.connect(g);
        g.connect(a.destination);
        o.start();
        o.stop(a.currentTime + 0.66);
      } catch {}
    };
    siren();
    const timer = setInterval(siren, 700);
    return () => {
      clearInterval(timer);
      for (const o of playing) {
        try {
          o.stop();
        } catch {}
      }
      playing.clear();
    };
  }, [sound, state.phase, state.rescue.status, state.support, prologueAlert]);
  useEffect(
    () => () => {
      controller.current?.abort();
      void audio.current?.close();
    },
    [],
  );
  useEffect(() => {
    if (
      state.support ||
      state.learning.pending !== null ||
      state.phase !== "sol1" ||
      state.greenhouse.status !== "running"
    )
      return;
    const timer = setInterval(
      () => dispatch({ type: "GREENHOUSE_TICK" }),
      1000,
    );
    const visibility = () => {
      if (document.hidden) dispatch({ type: "GREENHOUSE_PAUSE" });
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [
    state.phase,
    state.greenhouse.status,
    state.support,
    state.learning.pending,
  ]);
  useEffect(() => {
    if (
      !sound ||
      state.phase !== "sol1" ||
      state.greenhouse.status !== "running" ||
      (state.greenhouse.risk < 75 && state.resources.oxigeno >= 30)
    )
      return;
    const alarm = () => {
      try {
        const a = audio.current ?? (audio.current = new AudioContext());
        void a.resume();
        const o = a.createOscillator(),
          g = a.createGain();
        o.type = "square";
        o.frequency.setValueAtTime(220, a.currentTime);
        o.frequency.setValueAtTime(440, a.currentTime + 0.1);
        g.gain.setValueAtTime(0.025, a.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.25);
        o.connect(g);
        g.connect(a.destination);
        o.start();
        o.stop(a.currentTime + 0.26);
      } catch {}
    };
    alarm();
    const timer = setInterval(alarm, 1000);
    return () => clearInterval(timer);
  }, [
    sound,
    state.phase,
    state.greenhouse.status,
    state.greenhouse.risk >= 75,
    state.resources.oxigeno < 30,
  ]);
  function beep() {
    if (!sound) return;
    try {
      const a = audio.current ?? (audio.current = new AudioContext());
      void a.resume();
      void a.resume();
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(440, a.currentTime);
      o.frequency.exponentialRampToValueAtTime(660, a.currentTime + 0.09);
      g.gain.setValueAtTime(0.025, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.14);
      o.connect(g);
      g.connect(a.destination);
      o.start();
      o.stop(a.currentTime + 0.15);
    } catch {
      /* Browser audio is optional. */
    }
  }
  async function selectCity(id: CityId) {
    if (state.solActual !== 0) return;
    beep();
    controller.current?.abort();
    const requestId = ++counter.current;
    const city = CITIES.find((c) => c.id === id)!;
    const abort = new AbortController();
    controller.current = abort;
    dispatch({ type: "SELECT", cityId: id, requestId, now: Date.now() });
    const timeout = setTimeout(() => abort.abort(), 6500);
    const url = climateUrl(city);
    try {
      const response = await fetch(url, { signal: abort.signal });
      if (!response.ok) throw new Error(`POWER ${response.status}`);
      const climate = parseClimate(await response.json(), url);
      dispatch({ type: "CLIMATE", requestId, climate });
    } catch {
      if (requestId !== counter.current) return;
      dispatch({
        type: "CLIMATE",
        requestId,
        climate: {
          ...city.fallback,
          date: "2024-01-15",
          source: "fallback",
          url,
        },
      });
    } finally {
      clearTimeout(timeout);
    }
  }
  function reset() {
    beep();
    controller.current?.abort();
    counter.current++;
    dispatch({ type: "RESET" });
  }
  return (
    <Context.Provider
      value={{
        state,
        selectCity,
        start: () => {
          beep();
          dispatch({ type: "START" });
        },
        reset,
        sound,
        toggleSound: () => {
          if (!sound) {
            try {
              const a = audio.current ?? (audio.current = new AudioContext());
              void a.resume();
            } catch {}
          }
          setSound((v) => !v);
        },
        act: (action) => {
          beep();
          dispatch(action);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useGame() {
  const context = useContext(Context);
  if (!context) throw new Error("Falta GameProvider");
  return context;
}
