"use client";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useGame } from "../GameProvider";
import { WORLD, type Point } from "@/lib/isometric";
import { ROUTES, terrainPath, roverKeyboardStep } from "@/lib/rover";
import { renderJezero, pickJezeroTile } from "@/lib/jezero-renderer";
export type JezeroHandle = { next: () => void };
export const JezeroCanvas = forwardRef<
  JezeroHandle,
  { onMoving: (moving: boolean) => void; blocked: boolean }
>(function JezeroCanvas({ onMoving, blocked }, ref) {
  const { state, act } = useGame(),
    live = useRef({ state, act, onMoving, blocked });
  live.current = { state, act, onMoving, blocked };
  const canvas = useRef<HTMLCanvasElement>(null),
    container = useRef<HTMLDivElement>(null),
    hero = useRef<Point>({ x: 1, y: 8 }),
    path = useRef<Point[]>([]),
    hover = useRef<Point | null>(null),
    keys = useRef(new Set<string>()),
    reported = useRef(0),
    [fit, setFit] = useState(1);
  function walk(p: Point) {
    if (
      live.current.state.rover.status !== "ready" ||
      live.current.state.outcome ||
      live.current.blocked
    )
      return;
    path.current = terrainPath(hero.current, p).slice(1);
    keys.current.clear();
  }
  useImperativeHandle(ref, () => ({
    next: () => {
      const s = live.current.state;
      if (s.rover.route) {
        const p = ROUTES[s.rover.route].points[s.rover.segment + 1];
        if (p) walk(p);
      }
    },
  }));
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const observer = new ResizeObserver(([v]) =>
      setFit(Math.min(v.contentRect.width / 800, v.contentRect.height / 520)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        ["INPUT", "SELECT", "TEXTAREA"].includes(
          (e.target as HTMLElement)?.tagName,
        )
      )
        return;
      const k = e.key.toLowerCase();
      if (
        [
          "w",
          "a",
          "s",
          "d",
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
        ].includes(k)
      ) {
        e.preventDefault();
        keys.current.add(k);
        if (
          !e.repeat &&
          live.current.state.rover.status === "ready" &&
          !live.current.blocked &&
          !live.current.state.outcome
        ) {
          const goal = roverKeyboardStep(hero.current, keys.current);
          path.current = goal ? terrainPath(hero.current, goal).slice(1) : [];
        }
      }
    }
    function up(e: KeyboardEvent) {
      keys.current.delete(e.key.toLowerCase());
    }
    function clear() {
      keys.current.clear();
      path.current = [];
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clear);
    };
  }, []);
  useEffect(() => {
    let frame = 0,
      last = 0,
      lastMoving = false;
    function draw(time: number) {
      // Cap generously so low-FPS devices keep real-time rover speed.
      const delta = Math.min(0.25, (time - last) / 1000 || 0);
      last = time;
      const s = live.current.state;
      let moving = false;
      if (s.rover.status === "ready" && !s.outcome && !live.current.blocked) {
        if (!path.current.length && keys.current.size) {
          const goal = roverKeyboardStep(hero.current, keys.current);
          if (goal) path.current = terrainPath(hero.current, goal).slice(1);
        }
        const goal = path.current[0];
        if (goal) {
          const dx = goal.x - hero.current.x,
            dy = goal.y - hero.current.y,
            d = Math.hypot(dx, dy),
            amount = delta * 2.2;
          moving = true;
          if (d <= amount) {
            hero.current = { ...goal };
            path.current.shift();
          } else
            hero.current = {
              x: hero.current.x + (dx / d) * amount,
              y: hero.current.y + (dy / d) * amount,
            };
        }
        if (s.rover.route) {
          const target = ROUTES[s.rover.route].points[s.rover.segment + 1];
          if (
            target &&
            Math.hypot(hero.current.x - target.x, hero.current.y - target.y) <
              0.06 &&
            reported.current < s.rover.segment + 1
          ) {
            reported.current = s.rover.segment + 1;
            path.current = [];
            keys.current.clear();
            live.current.act({
              type: "ROVER_STEP",
              segment: s.rover.segment + 1,
            });
          }
        }
      } else {
        path.current = [];
        keys.current.clear();
      }
      if (moving !== lastMoving) {
        lastMoving = moving;
        live.current.onMoving(moving);
      }
      const c = canvas.current?.getContext("2d");
      if (c) renderJezero(c, s, hero.current, moving, time, hover.current);
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);
  function tile(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return pickJezeroTile({
      x: ((e.clientX - r.left) * WORLD.width) / r.width,
      y: ((e.clientY - r.top) * WORLD.height) / r.height,
    });
  }
  return (
    <div className="jezero-canvas-container" ref={container}>
      <canvas
        ref={canvas}
        width={800}
        height={520}
        style={{ width: 800 * fit, height: 520 * fit }}
        tabIndex={0}
        aria-label="Mapa de Jezero. Conduce con flechas, WASD o un toque."
        onPointerMove={(e) => {
          hover.current = tile(e);
        }}
        onPointerLeave={() => {
          hover.current = null;
        }}
        onPointerDown={(e) => {
          e.currentTarget.focus();
          const p = tile(e);
          if (p) walk(p);
        }}
      />
    </div>
  );
});
