import type { GameState } from "./game";
import { project, type Point } from "./isometric";
import { ROUTES, roverNight, terrainHeight, terrainHeightAt } from "./rover";
import {
  pixelBox as box,
  pixelPolygon as poly,
  pixelLine as line,
  isoCorners as corners,
} from "./world-renderer";
type P = [number, number];
export const jezeroProject = (p: Point): Point => {
  const q = project(p);
  return { x: q.x, y: q.y - terrainHeightAt(p) };
};
export function pickJezeroTile(p: Point): Point | null {
  for (let sum = 18; sum >= 0; sum--)
    for (let x = 9; x >= 0; x--) {
      const y = sum - x;
      if (y < 0 || y > 9) continue;
      const q = jezeroProject({ x, y });
      if (Math.abs(p.x - q.x) / 32 + Math.abs(p.y - q.y) / 16 <= 1)
        return { x, y };
    }
  return null;
}
function wheel(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame: number,
) {
  box(c, "#17141b", x - 6, y - 5, 12, 10);
  box(c, "#302e38", x - 4, y - 7, 8, 14);
  box(c, "#0c0c13", x - 6, y - 2, 12, 4);
  box(c, "#9c9a91", x - 2, y - 3, 4, 6);
  box(c, "#505465", x - 1 + (frame % 2 ? 1 : -1), y - 2, 2, 4);
}
function rover(
  c: CanvasRenderingContext2D,
  p: Point,
  moving: boolean,
  time: number,
  night: boolean,
) {
  const q = jezeroProject(p),
    x = Math.round(q.x),
    y = Math.round(q.y),
    frame = moving ? Math.floor(time / 110) % 4 : 0;
  poly(c, "#35212a", [
    [x - 36, y + 4],
    [x, y - 14],
    [x + 38, y + 5],
    [x, y + 23],
  ]);
  if (night) {
    c.globalAlpha = 0.18;
    poly(c, "#fff5cb", [
      [x + 22, y - 4],
      [x + 107, y + 15],
      [x + 72, y + 49],
      [x + 12, y + 5],
    ]);
    c.globalAlpha = 1;
  }
  // Three far and three near wheels remain visible around the chassis.
  for (let i = 0; i < 3; i++) wheel(c, x - 20 + i * 18, y - 8 + i * 7, frame);
  poly(c, "#aaa99e", [
    [x - 28, y - 20],
    [x - 7, y - 31],
    [x + 31, y - 12],
    [x + 10, y - 2],
  ]);
  poly(c, "#817e77", [
    [x - 28, y - 20],
    [x + 10, y - 2],
    [x + 10, y + 9],
    [x - 28, y - 9],
  ]);
  poly(c, "#d8c8a4", [
    [x + 10, y - 2],
    [x + 31, y - 12],
    [x + 31, y],
    [x + 10, y + 9],
  ]);
  box(c, "#c8c2b2", x - 11, y - 34, 25, 17);
  box(c, "#3a5565", x - 8, y - 31, 19, 8);
  box(c, "#88c6c6", x - 6, y - 30, 14, 3);
  line(c, "#c6b99e", [x + 1, y - 33], [x + 1, y - 51], 2);
  box(c, "#ded8c7", x - 6, y - 54, 17, 7);
  box(c, "#5ce1e6", x + 6, y - 53, 3, 3);
  for (let i = 0; i < 3; i++) wheel(c, x - 27 + i * 18, y + 1 + i * 7, frame);
  box(c, "#ec6a4a", x + 15, y - 4, 8, 4);
  box(c, "#fff5cb", x + 27, y - 9, 4, 4);
}
export function renderJezero(
  c: CanvasRenderingContext2D,
  s: GameState,
  p: Point,
  moving: boolean,
  time: number,
  hover: Point | null,
) {
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, 800, 520);
  const night = roverNight(s.rover.route, s.rover.segment);
  for (let i = 0; i < 65; i++) {
    const x = (i * 137 + 37) % 800,
      y = (i * i * 31) % 165;
    box(c, night ? "#5b5d78" : "#453139", x, y, i % 7 === 0 ? 2 : 1, 1);
  }
  // Painter ordering: each cliff is drawn before its upper diamond.
  for (let sum = 0; sum < 19; sum++)
    for (let x = 0; x < 10; x++) {
      const y = sum - x;
      if (y < 0 || y > 9) continue;
      const z = terrainHeight(x, y),
        q = corners(x, y, 1, 1, z),
        base = corners(x, y, 1, 1, -18);
      poly(c, "#683b36", [q[1], q[2], base[2], base[1]]);
      poly(c, "#4a3031", [q[2], q[3], base[3], base[2]]);
      for (let h = 6; h < z + 18; h += 9) {
        line(c, "#8c4a3a", [q[1][0], q[1][1] + h], [q[2][0], q[2][1] + h]);
        line(c, "#623634", [q[2][0], q[2][1] + h], [q[3][0], q[3][1] + h]);
      }
      const color =
        z > 35
          ? "#c17850"
          : z > 18
            ? "#b46343"
            : (x + y) % 3 === 0
              ? "#a64e37"
              : "#b2583c";
      poly(c, color, q);
      for (let i = 0; i < 4; i++) line(c, "#cf7951", q[i], q[(i + 1) % 4]);
      const a = jezeroProject({ x, y });
      for (let i = 0; i < 3; i++)
        box(
          c,
          i === 0 ? "#703b32" : "#d78255",
          a.x - 13 + ((x * 17 + y * 11 + i * 9) % 25),
          a.y - 4 + ((x * 3 + y + i * 5) % 9),
          i === 0 ? 4 : 2,
          2,
        );
    }
  // Both routes stay legible. The chosen corridor is highlighted; checkpoints charge once.
  for (const route of Object.values(ROUTES)) {
    c.globalAlpha = !s.rover.route || s.rover.route === route.id ? 0.85 : 0.22;
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1],
        b = route.points[i],
        steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) * 12;
      for (let j = 0; j <= steps; j++) {
        if (j % 4 === 3) continue;
        const q = jezeroProject({
          x: a.x + ((b.x - a.x) * j) / steps,
          y: a.y + ((b.y - a.y) * j) / steps,
        });
        box(c, route.color, q.x - 1, q.y - 1, 3, 3);
      }
    }
    c.globalAlpha = 1;
  }
  const route = s.rover.route ? ROUTES[s.rover.route] : null;
  if (route) {
    route.points.forEach((v, i) => {
      const q = jezeroProject(v);
      box(
        c,
        i <= s.rover.segment ? "#a8cf83" : "#1c2026",
        q.x - 5,
        q.y - 4,
        10,
        8,
      );
      box(
        c,
        i <= s.rover.segment ? "#ecf2cf" : route.color,
        q.x - 2,
        q.y - 2,
        4,
        4,
      );
    });
  }
  const end = jezeroProject({ x: 8, y: 1 });
  poly(c, "#e0be83", [
    [end.x - 22, end.y],
    [end.x, end.y - 11],
    [end.x + 22, end.y],
    [end.x, end.y + 11],
  ]);
  poly(c, "#5b7e72", [
    [end.x - 15, end.y],
    [end.x, end.y - 7],
    [end.x + 15, end.y],
    [end.x, end.y + 7],
  ]);
  line(c, "#e5d5b4", [end.x + 15, end.y - 4], [end.x + 15, end.y - 42], 2);
  box(c, "#5ce1e6", end.x + 17, end.y - 42, 17, 10);
  box(c, "#dbffed", end.x + 19, end.y - 40, 3, 3);
  if (hover) {
    const q = corners(hover.x, hover.y, 1, 1, terrainHeight(hover.x, hover.y));
    for (let i = 0; i < 4; i++) line(c, "#f6dfba", q[i], q[(i + 1) % 4], 2);
  }
  rover(c, p, moving, time, night);
  if (night) {
    c.fillStyle = "rgba(13,19,43,.43)";
    c.fillRect(0, 0, 800, 520);
    for (let i = 0; i < 25; i++)
      box(c, "#b4bfd5", (i * 131 + 47) % 800, (i * i * 17) % 94, 1, 1);
  }
  const next = route?.points[s.rover.segment + 1];
  if (next && !s.outcome) {
    const q = jezeroProject(next),
      bounce = (Math.floor(time / 450) % 2) * 3;
    box(c, "#6c4e23", q.x - 5, q.y - 41 - bounce, 10, 15);
    box(c, "#ffdf37", q.x - 3, q.y - 42 - bounce, 6, 13);
    poly(c, "#ffdf37", [
      [q.x - 10, q.y - 30 - bounce],
      [q.x + 11, q.y - 30 - bounce],
      [q.x, q.y - 19 - bounce],
    ]);
  }
}
