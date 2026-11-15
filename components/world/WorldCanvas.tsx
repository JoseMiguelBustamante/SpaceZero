"use client";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useGame } from "../GameProvider";
import { regionSpawn } from "@/lib/regions";
import { renderWorld } from "@/lib/world-renderer";
import {
  structuresForCity,
  activeBuilding,
  WORLD,
  keyboardStep,
  distance,
  findPath,
  nearestWalkable,
  pickTile,
  project,
  terraceHeight,
  tileIsMars,
  unproject,
  type BuildingId,
  type Point,
} from "@/lib/isometric";
export type WorldHandle = {
  goTo: (id: BuildingId) => void;
  walkTo: (p: Point) => void;
  interact: () => void;
  reset: () => void;
  zoom: (direction: number) => void;
};
export type PositionUpdate = {
  position: Point;
  moving: boolean;
  nearby: BuildingId | null;
};
type Props = {
  transformation: number;
  blocked: boolean;
  active: BuildingId | null;
  cleaning: boolean;
  onArrive: (id: BuildingId) => void;
  onPosition: (update: PositionUpdate) => void;
};
export const WorldCanvas = forwardRef<WorldHandle, Props>(
  function WorldCanvas(props, ref) {
    const { state } = useGame();
    const live = useRef({ state, ...props });
    live.current = { state, ...props };
    const canvas = useRef<HTMLCanvasElement>(null),
      container = useRef<HTMLDivElement>(null);
    const hero = useRef({
      position: { x: 5, y: 6 } as Point,
      path: [] as Point[],
      destination: null as BuildingId | null,
      moving: false,
      direction: 1,
    });
    const hover = useRef<Point | null>(null),
      held = useRef(new Set<string>());
    const [fit, setFit] = useState(1),
      [zoom, setZoom] = useState(1),
      [pan, setPan] = useState({ x: 0, y: 0 });
    const [position, setPosition] = useState<Point>({ x: 5, y: 6 }),
      [nearby, setNearby] = useState<BuildingId | null>(null);
    const drag = useRef<{
      x: number;
      y: number;
      px: number;
      py: number;
      moved: boolean;
    } | null>(null);
    function walkTo(p: Point, building: BuildingId | null = null) {
      if (live.current.blocked) return;
      const h = hero.current;
      h.path = findPath(h.position, p, live.current.state.cityId);
      h.destination = building;
      held.current.clear();
    }
    function goTo(id: BuildingId) {
      const b = structuresForCity(live.current.state.cityId).find(
        (b) => b.id === id,
      )!;
      walkTo(b.door, id);
    }
    function interact() {
      if (live.current.blocked) return;
      const h = hero.current,
        b = structuresForCity(live.current.state.cityId)
          .filter((b) => distance(h.position, b.door) < 1.35)
          .sort(
            (a, b) =>
              distance(h.position, a.door) - distance(h.position, b.door),
          )[0];
      if (b) {
        h.path = [];
        h.destination = null;
        live.current.onArrive(b.id);
      }
    }
    useImperativeHandle(ref, () => ({
      goTo,
      walkTo: (p) => walkTo(p),
      interact,
      reset: () => {
        hero.current = {
          position: regionSpawn(live.current.state.cityId),
          path: [],
          destination: null,
          moving: false,
          direction: 1,
        };
        held.current.clear();
        setPan({ x: 0, y: 0 });
        setZoom(1);
      },
      zoom: (d) => {
        setZoom((v) => Math.max(0.9, Math.min(1.8, v + d * 0.2)));
        if (d === 0) {
          setZoom(1);
          setPan({ x: 0, y: 0 });
        }
      },
    }));
    useEffect(() => {
      hero.current.position = regionSpawn(state.cityId);
      hero.current.path = [];
      hero.current.destination = null;
      setPosition({ ...hero.current.position });
    }, [state.cityId]);
    useEffect(() => {
      const node = container.current;
      if (!node) return;
      const resize = new ResizeObserver(([entry]) =>
        setFit(
          Math.min(
            entry.contentRect.width / WORLD.width,
            entry.contentRect.height / WORLD.height,
          ),
        ),
      );
      resize.observe(node);
      return () => resize.disconnect();
    }, []);
    useEffect(() => {
      function keyDown(e: KeyboardEvent) {
        if (e.altKey || e.metaKey || e.ctrlKey) return;
        const el = e.target as HTMLElement;
        if (
          el?.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT", "SUMMARY"].includes(el?.tagName)
        )
          return;
        if (live.current.blocked) return;
        const code = e.key.toLowerCase();
        if (
          [
            "arrowup",
            "arrowdown",
            "arrowleft",
            "arrowright",
            "w",
            "a",
            "s",
            "d",
          ].includes(code)
        ) {
          e.preventDefault();
          held.current.add(code);
          if (!e.repeat) {
            const step = keyboardStep(
              hero.current.position,
              held.current,
              live.current.state.cityId,
            );
            hero.current.path = step ? [step] : [];
            hero.current.destination = null;
          }
        }
        if (
          [" ", "enter", "e"].includes(code) &&
          el?.tagName !== "BUTTON" &&
          el?.tagName !== "A"
        ) {
          e.preventDefault();
          interact();
        }
      }
      const keyUp = (e: KeyboardEvent) =>
        held.current.delete(e.key.toLowerCase());
      const blur = () => held.current.clear();
      window.addEventListener("keydown", keyDown);
      window.addEventListener("keyup", keyUp);
      window.addEventListener("blur", blur);
      return () => {
        window.removeEventListener("keydown", keyDown);
        window.removeEventListener("keyup", keyUp);
        window.removeEventListener("blur", blur);
      };
    }, []);
    useEffect(() => {
      const c = canvas.current?.getContext("2d");
      if (!c) return;
      c.imageSmoothingEnabled = false;
      let raf = 0,
        last = performance.now(),
        lastReport = 0;
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      function frame(time: number) {
        const dt = Math.min(0.05, (time - last) / 1000);
        last = time;
        const h = hero.current,
          p = live.current;
        h.moving = false;
        if (!p.blocked) {
          if (!h.path.length && held.current.size) {
            const step = keyboardStep(h.position, held.current, p.state.cityId);
            if (step) h.path = [step];
          }
          if (h.path.length) {
            const target = h.path[0],
              d = distance(h.position, target),
              speed = p.state.solActual === 8 ? 1.9 : 2.7;
            const step = speed * dt;
            if (d <= step) {
              h.position = { ...target };
              h.path.shift();
            } else {
              const vx = (target.x - h.position.x) / d,
                vy = (target.y - h.position.y) / d;
              h.position = {
                x: h.position.x + vx * step,
                y: h.position.y + vy * step,
              };
              h.direction = vx - vy >= 0 ? 1 : -1;
              h.moving = true;
            }
            if (!h.path.length && h.destination) {
              const id = h.destination;
              h.destination = null;
              p.onArrive(id);
            }
          }
        }
        renderWorld(c!, {
          state: p.state,
          position: h.position,
          moving: h.moving,
          direction: h.direction,
          time,
          transform: p.transformation,
          path: h.path.length
            ? h.path
            : p.active
              ? findPath(
                  h.position,
                  structuresForCity(p.state.cityId).find(
                    (b) => b.id === p.active,
                  )!.door,
                  p.state.cityId,
                )
              : [],
          hover: hover.current,
          reduced,
          cleaning: p.cleaning,
        });
        if (time - lastReport > 90) {
          lastReport = time;
          setPosition({ ...h.position });
          const b = structuresForCity(live.current.state.cityId)
            .filter((b) => distance(h.position, b.door) < 1.35)
            .sort(
              (a, b) =>
                distance(h.position, a.door) - distance(h.position, b.door),
            )[0];
          setNearby(b?.id ?? null);
          p.onPosition({
            position: { ...h.position },
            moving: h.moving,
            nearby: b?.id ?? null,
          });
        }
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
      return () => cancelAnimationFrame(raf);
    }, []);
    function pointerPoint(e: React.PointerEvent<HTMLCanvasElement>): Point {
      const bounds = e.currentTarget.getBoundingClientRect();
      return {
        x: ((e.clientX - bounds.left) / bounds.width) * WORLD.width,
        y: ((e.clientY - bounds.top) / bounds.height) * WORLD.height,
      };
    }
    function hit(e: React.PointerEvent<HTMLCanvasElement>) {
      const point = pointerPoint(e);
      const hit = structuresForCity(live.current.state.cityId)
        .slice()
        .sort((a, b) => b.x + b.y - (a.x + a.y))
        .find((b) => {
          const center = project({
            x: b.x + (b.w - 1) / 2,
            y: b.y + (b.d - 1) / 2,
          });
          const z = tileIsMars(b.x, b.y, live.current.transformation)
            ? 0
            : terraceHeight(b.x, b.y, state.cityId);
          return (
            Math.abs(point.x - center.x) < (b.w + b.d) * 16 &&
            point.y > center.y - b.height - z - 15 &&
            point.y < center.y + (b.w + b.d) * 7 - z
          );
        });
      if (hit) {
        goTo(hit.id);
        return;
      }
      const goal = pickTile(point, state.cityId, live.current.transformation);
      if (goal) walkTo(nearestWalkable(goal, state.cityId));
    }
    const avatar = project(position);
    const avatarZ = tileIsMars(position.x, position.y, props.transformation)
      ? 0
      : terraceHeight(position.x, position.y, state.cityId);
    const labelPoints = new Map<BuildingId, Point>();
    const placed: { point: Point; width: number }[] = [];
    const labels = structuresForCity(state.cityId)
      .map((b) => {
        const point = project({
          x: b.x + (b.w - 1) / 2,
          y: b.y + (b.d - 1) / 2,
        });
        const z = tileIsMars(b.x, b.y, props.transformation)
          ? 0
          : terraceHeight(b.x, b.y, state.cityId);
        point.y -= b.height + z + 22;
        return {
          b,
          point,
          width: (b.short.length * 7 + 45) / Math.max(0.4, fit),
        };
      })
      .sort((a, b) => a.point.y - b.point.y);
    for (const { b, point, width } of labels) {
      for (let tries = 0; tries < 10; tries++) {
        const collision = placed.find(
          (p) =>
            Math.abs(p.point.x - point.x) < (p.width + width) / 2 + 5 &&
            Math.abs(p.point.y - point.y) < 42 / Math.max(0.4, fit),
        );
        if (!collision) break;
        point.y = collision.point.y + 43 / Math.max(0.4, fit);
      }
      placed.push({ point, width });
      labelPoints.set(b.id, point);
    }
    return (
      <div className="world-canvas-container" ref={container}>
        <div
          className="world-surface"
          style={{
            width: WORLD.width * fit,
            height: WORLD.height * fit,
            transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
          }}
        >
          <canvas
            ref={canvas}
            width={WORLD.width}
            height={WORLD.height}
            tabIndex={0}
            role="application"
            aria-label="Base en píxeles. Toca un edificio para entrar o camina con WASD y las flechas."
            onPointerDown={(e) => {
              if (props.blocked) return;
              e.currentTarget.focus({ preventScroll: true });
              drag.current = {
                x: e.clientX,
                y: e.clientY,
                px: pan.x,
                py: pan.y,
                moved: false,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const point = unproject(pointerPoint(e));
              hover.current = {
                x: Math.round(point.x),
                y: Math.round(point.y),
              };
              const d = drag.current;
              if (
                d &&
                zoom > 1 &&
                (Math.abs(e.clientX - d.x) > 6 || Math.abs(e.clientY - d.y) > 6)
              ) {
                d.moved = true;
                setPan({
                  x: Math.max(-250, Math.min(250, d.px + e.clientX - d.x)),
                  y: Math.max(-180, Math.min(180, d.py + e.clientY - d.y)),
                });
              }
            }}
            onPointerUp={(e) => {
              if (drag.current && !drag.current.moved) hit(e);
              drag.current = null;
              if (e.currentTarget.hasPointerCapture(e.pointerId))
                e.currentTarget.releasePointerCapture(e.pointerId);
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
            onPointerLeave={() => {
              hover.current = null;
            }}
          />
          {structuresForCity(state.cityId).map((b) => {
            const point = project({
              x: b.x + (b.w - 1) / 2,
              y: b.y + (b.d - 1) / 2,
            });
            const isMars = tileIsMars(b.x, b.y, props.transformation),
              z = isMars ? 0 : terraceHeight(b.x, b.y, state.cityId);
            const active = props.active === b.id;
            return (
              <button
                key={b.id}
                className={`building-label ${active ? "mission-active" : ""} ${nearby === b.id ? "nearby" : ""} ${b.id === "garage" && state.solActual !== 28 ? "future-building" : ""}`}
                style={{
                  left: `${(point.x / WORLD.width) * 100}%`,
                  top: `${(labelPoints.get(b.id)!.y / WORLD.height) * 100}%`,
                }}
                disabled={props.blocked}
                aria-label={`Ir a ${b.name}${active ? ", tu próxima tarea" : ""}`}
                onClick={() => goTo(b.id)}
              >
                {active && (
                  <span className="mission-pointer" aria-hidden="true">
                    <svg viewBox="0 0 20 22" shapeRendering="crispEdges">
                      <path
                        fill="#ffdf37"
                        d="M6 0h8v10h6v3h-3v3h-3v3h-3v3H9v-3H6v-3H3v-3H0v-3h6z"
                      />
                    </svg>
                  </span>
                )}
                <span className="building-icon" aria-hidden="true">
                  {b.id === "refuge"
                    ? "🏠"
                    : b.id === "greenhouse"
                      ? "🌱"
                      : b.id === "solar"
                        ? "☀️"
                        : b.id === "probe"
                          ? "📡"
                          : "🚙"}
                </span>
                <span className="building-name">
                  {isMars
                    ? b.short
                    : b.id === "refuge"
                      ? "PLAZA CENTRAL"
                      : b.id === "greenhouse"
                        ? "JARDÍN BOTÁNICO"
                        : b.id === "solar"
                          ? "ESTACIÓN ELÉCTRICA"
                          : b.id === "probe"
                            ? "TORRE DE RADIO"
                            : "GARAJE"}
                </span>
                {active && <b className="mission-mark">!</b>}
              </button>
            );
          })}
          <span
            className="player-marker"
            style={{
              left: `${(avatar.x / WORLD.width) * 100}%`,
              top: `${((avatar.y - avatarZ - 42) / WORLD.height) * 100}%`,
            }}
          >
            TÚ <i />
          </span>
        </div>
      </div>
    );
  },
);
