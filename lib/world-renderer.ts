import { regionPolygon, islandTile, pointInRegion } from "./regions";
import type { CityId, GameState } from "./game";
import {
  WORLD,
  structuresForCity,
  project,
  terraceHeight,
  tileIsMars,
  type Point,
  type Structure,
} from "./isometric";
type P = [number, number];
export type WorldFrame = {
  state: GameState;
  position: Point;
  moving: boolean;
  direction: number;
  time: number;
  transform: number;
  path: Point[];
  hover: Point | null;
  reduced: boolean;
  cleaning: boolean;
};
const n = (x: number, y: number) => {
  const a = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return a - Math.floor(a);
};
function box(
  c: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
// Scanline polygons and Bresenham lines deliberately avoid antialiased vector edges.
function poly(c: CanvasRenderingContext2D, color: string, points: P[]) {
  c.fillStyle = color;
  const low = Math.ceil(Math.min(...points.map((p) => p[1]))),
    high = Math.floor(Math.max(...points.map((p) => p[1])));
  for (let y = low; y <= high; y++) {
    const intersections: number[] = [];
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[j],
        b = points[i];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y))
        intersections.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
    intersections.sort((a, b) => a - b);
    for (let i = 0; i < intersections.length - 1; i += 2)
      c.fillRect(
        Math.floor(intersections[i]),
        y,
        Math.ceil(intersections[i + 1]) - Math.floor(intersections[i]),
        1,
      );
  }
}
function line(
  c: CanvasRenderingContext2D,
  color: string,
  a: P,
  b: P,
  width = 1,
) {
  let x = Math.round(a[0]),
    y = Math.round(a[1]);
  const x2 = Math.round(b[0]),
    y2 = Math.round(b[1]),
    dx = Math.abs(x2 - x),
    sx = x < x2 ? 1 : -1,
    dy = -Math.abs(y2 - y),
    sy = y < y2 ? 1 : -1;
  let error = dx + dy;
  c.fillStyle = color;
  for (;;) {
    c.fillRect(x, y, width, width);
    if (x === x2 && y === y2) break;
    const e = 2 * error;
    if (e >= dy) {
      error += dy;
      x += sx;
    }
    if (e <= dx) {
      error += dx;
      y += sy;
    }
  }
}
function q(p: Point, z = 0): P {
  const a = project(p);
  return [a.x, a.y - z];
}
function corners(x: number, y: number, w: number, d: number, z = 0): P[] {
  return [
    q({ x: x - 0.5, y: y - 0.5 }, z),
    q({ x: x + w - 0.5, y: y - 0.5 }, z),
    q({ x: x + w - 0.5, y: y + d - 0.5 }, z),
    q({ x: x - 0.5, y: y + d - 0.5 }, z),
  ];
}
function prism(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  d: number,
  h: number,
  z: number,
  colors: string[],
) {
  const p = corners(x, y, w, d, z),
    top = p.map(([x, y]) => [x, y - h] as P);
  poly(c, colors[1], [p[3], p[2], top[2], top[3]]);
  poly(c, colors[2], [p[1], p[2], top[2], top[1]]);
  poly(c, colors[0], top);
  return { p, top };
}
function diamond(
  c: CanvasRenderingContext2D,
  color: string,
  p: Point,
  w = 32,
  h = 16,
) {
  poly(c, color, [
    [p.x, p.y - h],
    [p.x + w, p.y],
    [p.x, p.y + h],
    [p.x - w, p.y],
  ]);
}
function faceWindow(
  c: CanvasRenderingContext2D,
  left: P,
  right: P,
  t: number,
  z: number,
  width: number,
  height: number,
  color: string,
) {
  const x = left[0] + (right[0] - left[0]) * t,
    y = left[1] + (right[1] - left[1]) * t - z;
  const dy = ((right[1] - left[1]) / (right[0] - left[0])) * width;
  poly(c, "#262a36", [
    [x, y],
    [x + width, y + dy],
    [x + width, y + dy + height],
    [x, y + height],
  ]);
  poly(c, color, [
    [x + 2, y + 2],
    [x + width - 2, y + dy + 2],
    [x + width - 2, y + dy + height - 2],
    [x + 2, y + height - 2],
  ]);
  line(c, "#c7ded2", [x + 2, y + 3], [x + width - 3, y + dy + 3]);
}
function tree(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  palm: boolean,
) {
  box(c, "#283c2d66", x - 12, y - 1, 27, 5);
  box(c, "#72644a", x - 2, y - 29, 4, 28);
  if (palm) {
    for (const [dx, dy] of [
      [-20, -5],
      [-16, -15],
      [0, -20],
      [17, -15],
      [22, -3],
    ]) {
      line(c, "#60905c", [x, y - 28], [x + dx, y - 28 + dy], 3);
      line(
        c,
        "#7ba665",
        [x + dx, y - 28 + dy],
        [x + dx + (dx > 0 ? 4 : -3), y - 20 + dy],
        2,
      );
    }
    box(c, "#a1b37a", x - 2, y - 33, 5, 4);
  } else {
    poly(c, "#47734c", [
      [x, y - 53],
      [x + 15, y - 29],
      [x + 9, y - 29],
      [x + 22, y - 12],
      [x - 21, y - 12],
      [x - 10, y - 29],
      [x - 15, y - 29],
    ]);
    poly(c, "#79a86d", [
      [x, y - 53],
      [x + 4, y - 28],
      [x - 10, y - 29],
      [x - 15, y - 29],
    ]);
  }
}
function urban(
  c: CanvasRenderingContext2D,
  b: Structure,
  city: CityId | null,
  z: number,
) {
  const paz = city === "la-paz",
    salt = city === "uyuni";
  const h = b.id === "probe" ? 24 : b.id === "garage" ? 35 : paz ? 50 : 34;
  const a = prism(
    c,
    b.x,
    b.y,
    b.w,
    b.d,
    h,
    z,
    salt
      ? ["#e3d6b3", "#bab190", "#928c7b"]
      : paz
        ? ["#bb785a", "#9b5c48", "#75463f"]
        : ["#d8a26e", "#c5b38f", "#9b9a7c"],
  );
  if (!paz && !salt) {
    const roof = a.top;
    poly(c, "#f57d7a", [
      [roof[3][0] - 3, roof[3][1]],
      [roof[0][0], roof[0][1] - 10],
      [roof[1][0] + 3, roof[1][1]],
      [roof[2][0], roof[2][1] - 10],
    ]);
    line(
      c,
      "#e19366",
      [roof[0][0], roof[0][1] - 10],
      [roof[2][0], roof[2][1] - 10],
      2,
    );
  }
  for (const t of [0.15, 0.6])
    faceWindow(c, a.p[3], a.p[2], t, h - 10, 13, 11, "#6a9695");
  if (paz) {
    const p = a.top[0];
    box(c, "#ba9580", p[0] - 4, p[1] - 12, 8, 13);
    box(c, "#e3c09b", p[0] - 5, p[1] - 13, 10, 3);
  }
  faceWindow(c, a.p[1], a.p[2], 0.7, h - 7, -13, 18, "#495b63");
}
function refuge(
  c: CanvasRenderingContext2D,
  b: Structure,
  z: number,
  storm: boolean,
) {
  prism(c, b.x - 0.08, b.y - 0.08, 2.16, 2.16, 6, z, [
    "#64656b",
    "#454650",
    "#343942",
  ]);
  const a = prism(c, b.x, b.y, 2, 2, 47, z + 6, [
    "#fff0cd",
    "#b6b9b0",
    "#89989d",
  ]);
  prism(c, b.x + 0.14, b.y + 0.14, 1.72, 1.72, 6, z + 53, [
    "#e5deca",
    "#a7aaa6",
    "#8b9a9e",
  ]);
  const roof = corners(b.x + 0.3, b.y + 0.3, 1.4, 1.4, z + 60);
  poly(c, "#b2b8b2", roof);
  line(c, "#9b6858", roof[3], roof[2], 4);
  for (const t of [0.12, 0.55])
    faceWindow(c, a.p[3], a.p[2], t, 34, 16, 11, storm ? "#b39050" : "#5ce1e6");
  faceWindow(c, a.p[1], a.p[2], 0.12, 34, -15, 11, "#699ca8");
  const door = q({ x: b.x + 1.5, y: b.y + 1.5 }, z);
  poly(c, "#3c4a54", [
    [door[0] - 17, door[1] - 25],
    [door[0] - 3, door[1] - 18],
    [door[0] - 3, door[1]],
    [door[0] - 17, door[1] - 7],
  ]);
  box(c, "#ec6a4a", door[0] - 14, door[1] - 18, 4, 5);
  const ant = q({ x: b.x + 0.4, y: b.y + 0.5 }, z + 60);
  line(c, "#9aaca8", [ant[0], ant[1]], [ant[0], ant[1] - 28], 2);
  box(c, "#ec6a4a", ant[0] - 2, ant[1] - 31, 5, 4);
  line(c, "#bfc4ae", [ant[0] - 8, ant[1] - 19], [ant[0] + 9, ant[1] - 19], 2);
}
function greenhouse(
  c: CanvasRenderingContext2D,
  b: Structure,
  z: number,
  s: GameState,
) {
  const a = prism(c, b.x, b.y, 2, 2, 8, z, ["#838a74", "#58615a", "#414f51"]);
  const health = s.resources.saludCosecha,
    growth = s.greenhouse.growth;
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      const p = q(
        { x: b.x + 0.15 + i * 0.55, y: b.y + 0.15 + j * 0.55 },
        z + 10,
      );
      poly(c, "#675640", [
        [p[0] - 7, p[1]],
        [p[0], p[1] - 4],
        [p[0] + 8, p[1]],
        [p[0] + 1, p[1] + 4],
      ]);
      const h = 3 + growth * 0.14 + (i % 2) * 3;
      const col = health < 35 ? "#a27e49" : "#39ff64";
      box(c, col, p[0] - 1, p[1] - h, 2, h);
      box(c, col, p[0] - 5, p[1] - h + 3, 5, 3);
      box(c, health < 35 ? "#887448" : "#c0ff70", p[0] + 1, p[1] - h, 5, 3);
    }
  const p = a.top;
  const roof: P[] = [
    [p[3][0], p[3][1]],
    [p[3][0], p[3][1] - 25],
    [p[0][0] - 13, p[0][1] - 30],
    [p[0][0] + 10, p[0][1] - 28],
    [p[1][0], p[1][1] - 25],
    [p[1][0], p[1][1]],
    [p[2][0], p[2][1]],
  ];
  poly(c, "#6ec5b82c", roof);
  for (let i = 0; i < roof.length; i++)
    line(c, "#b3ffb9", roof[i], roof[(i + 1) % roof.length], 2);
  for (let i = 0; i < 3; i++) {
    const x = b.x + i * 0.7,
      y = b.y;
    const v1 = q({ x, y: y - 0.5 }, z + 38),
      v2 = q({ x: x + 1.5, y: y + 1.5 }, z + 30);
    line(c, "#79a89d", v1, v2, 1);
  }
  line(c, "#d0ddbf", [p[3][0], p[3][1] - 24], [p[1][0], p[1][1] - 24], 1);
  const uv = s.greenhouse.uv;
  poly(c, `rgba(164,158,227,${uv / 700})`, [p[0], p[1], p[2], p[3]]);
  box(c, "#c6e0ba", p[0][0] + 12, p[0][1] - 18, 8, 2);
}
function solar(
  c: CanvasRenderingContext2D,
  b: Structure,
  z: number,
  cleaning: boolean,
) {
  for (let row = 0; row < 2; row++) {
    const x = b.x,
      y = b.y + row;
    prism(c, x + 0.1, y + 0.1, 1.8, 0.8, 4, z, [
      "#6c6e72",
      "#4d4c55",
      "#3b3e4c",
    ]);
    for (const [dx, dy] of [
      [0, 0],
      [1.5, 0.5],
    ]) {
      const p = q({ x: x + dx, y: y + dy }, z);
      box(c, "#7e8d94", p[0], p[1] - 17, 3, 17);
    }
    const p = corners(x, y, 1.95, 0.75, z + 19);
    poly(c, "#333e59", p);
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 2; j++) {
        const a = corners(
          x + i * 0.31 + 0.03,
          y + j * 0.33 + 0.04,
          0.26,
          0.27,
          z + 20,
        );
        poly(c, cleaning ? "#458caa" : "#3a6484", a);
        line(c, "#7ea4b2", a[0], a[1], 1);
      }
    for (let i = 0; i < 4; i++) line(c, "#a6a89c", p[i], p[(i + 1) % 4], 1);
  }
}
function antenna(
  c: CanvasRenderingContext2D,
  b: Structure,
  z: number,
  time: number,
  connected: boolean,
) {
  prism(c, b.x - 0.05, b.y - 0.05, 1.1, 1.1, 7, z, [
    "#8f8e7e",
    "#6b6c69",
    "#4f555c",
  ]);
  const p = project({ x: b.x, y: b.y });
  box(c, "#acb7b5", p.x - 3, p.y - z - 50, 7, 43);
  box(c, "#d0c9ae", p.x - 13, p.y - z - 34, 26, 11);
  const x = p.x - 1,
    y = p.y - z - 58;
  poly(c, "#e0d9be", [
    [x - 28, y - 18],
    [x - 18, y - 28],
    [x + 4, y - 28],
    [x + 25, y - 14],
    [x + 25, y],
    [x + 14, y + 13],
    [x - 4, y + 16],
    [x - 24, y + 3],
    [x - 31, y - 9],
  ]);
  poly(c, "#aab7b6", [
    [x - 20, y - 18],
    [x - 12, y - 23],
    [x + 3, y - 22],
    [x + 21, y - 10],
    [x + 18, y + 1],
    [x + 6, y + 10],
    [x - 7, y + 9],
    [x - 23, y - 2],
  ]);
  line(c, "#f0e9cb", [x - 23, y - 17], [x + 14, y + 9], 2);
  line(c, "#d8d8c3", [x + 3, y - 21], [x - 5, y + 10], 2);
  line(c, "#8c9fa2", [x - 24, y + 1], [x + 18, y - 12], 1);
  line(c, "#b66d50", [x - 1, y - 1], [x + 14, y - 26], 2);
  box(c, connected ? "#39ff14" : "#ec6a4a", x + 12, y - 30, 5, 5);
  if (connected) {
    for (let k = 0; k < 3; k++) {
      const d = 12 + k * 8 + (Math.floor(time / 200) % 4);
      line(c, "#5ce1e650", [x + 23 + d / 2, y - d], [x + 26 + d, y - d + 8], 1);
    }
  }
}
function garage(c: CanvasRenderingContext2D, b: Structure, z: number) {
  prism(c, b.x - 0.1, b.y - 0.1, 2.2, 2.2, 5, z, [
    "#696260",
    "#4a464c",
    "#41404a",
  ]);
  const a = prism(c, b.x, b.y, 2, 2, 37, z + 5, [
    "#c1b89c",
    "#a28771",
    "#8c7466",
  ]);
  prism(c, b.x + 0.1, b.y + 0.1, 1.8, 1.8, 7, z + 42, [
    "#c77553",
    "#a65a46",
    "#8f4e41",
  ]);
  const p = a.p;
  poly(c, "#2b2c35", [
    [p[3][0] + 8, p[3][1] - 27],
    [p[2][0] - 7, p[2][1] - 27],
    [p[2][0] - 7, p[2][1] - 3],
    [p[3][0] + 8, p[3][1] - 3],
  ]);
  line(
    c,
    "#bdc1ac",
    [p[3][0] + 6, p[3][1] - 28],
    [p[2][0] - 6, p[2][1] - 28],
    3,
  );
  const rover = q({ x: b.x + 0.5, y: b.y + 1.4 }, z + 7);
  poly(c, "#c9bea1", [
    [rover[0] - 17, rover[1] - 9],
    [rover[0], rover[1] - 17],
    [rover[0] + 19, rover[1] - 8],
    [rover[0], rover[1] + 1],
  ]);
  box(c, "#242b37", rover[0] - 13, rover[1] - 2, 8, 6);
  box(c, "#242b37", rover[0] + 9, rover[1] - 2, 8, 6);
  box(c, "#779aa4", rover[0] - 3, rover[1] - 14, 11, 5);
  line(
    c,
    "#c9c8b6",
    [rover[0] + 2, rover[1] - 13],
    [rover[0] + 2, rover[1] - 24],
    1,
  );
}
function avatar(c: CanvasRenderingContext2D, frame: WorldFrame) {
  const { position, time, moving, direction, state } = frame;
  const mars = tileIsMars(position.x, position.y, frame.transform);
  const elevation = mars
    ? 0
    : terraceHeight(position.x, position.y, state.cityId);
  const p = project(position),
    x = Math.round(p.x),
    y = Math.round(p.y - elevation);
  box(c, "#151a2066", x - 10, y - 1, 21, 4);
  box(c, "#151a2044", x - 13, y, 27, 2);
  const step = moving ? [0, 2, 0, -2][Math.floor(time / 115) % 4] : 0;
  const bob = moving && Math.floor(time / 115) % 2 === 0 ? 1 : 0;
  const suit = mars
    ? "#e9dfc7"
    : state.cityId === "la-paz"
      ? "#c77858"
      : "#e6b25d";
  const shade = mars ? "#acb7b1" : "#8a7560";
  const dy = y - bob;
  box(c, shade, x - 8, dy - 21, 5, 15);
  box(c, suit, x - 5, dy - 22, 12, 16);
  box(c, suit, x - 9, dy - 18 - step, 4, 10);
  box(c, suit, x + 7, dy - 18 + step, 4, 10);
  box(c, shade, x - 5, dy - 7, 5, 7 + step);
  box(c, suit, x + 3, dy - 7, 5, 7 - step);
  box(c, "#353942", x - 7, dy - 1 + step, 8, 3);
  box(c, "#353942", x + 2, dy - 1 - step, 8, 3);
  if (mars) {
    box(c, "#f3e6c9", x - 5, dy - 32, 11, 3);
    box(c, suit, x - 8, dy - 29, 17, 11);
    box(c, "#344857", x - 5 + (direction < 0 ? -1 : 1), dy - 28, 11, 7);
    box(c, "#70bbc1", x - 4 + (direction < 0 ? -1 : 1), dy - 27, 9, 3);
    box(c, "#c36d53", x + 3, dy - 18, 3, 4);
    box(c, "#879d98", x - 3, dy - 12, 6, 2);
  } else {
    box(c, "#b98e6e", x - 5, dy - 31, 11, 11);
    box(c, "#483c36", x - 6, dy - 32, 13, 5);
    box(c, "#282f36", x + (direction < 0 ? -4 : 3), dy - 25, 2, 2);
  }
  if (frame.cleaning) {
    line(c, "#d1bb86", [x + 8, y - 17], [x + 21, y - 10], 2);
    line(c, "#a59c7f", [x + 21, y - 18], [x + 21, y + 4], 2);
    box(c, "#bdb79a", x + 16, y + 2, 12, 3);
  }
}
// Offscreen static-layer cache: stars and the island terrain are repainted
// identically every frame; caching them cuts per-frame draw calls drastically
// on low-powered (mobile) devices.
const layerCache = new Map<string, HTMLCanvasElement>();
function cachedLayer(
  key: string,
  paint: (tc: CanvasRenderingContext2D) => void,
): HTMLCanvasElement {
  let layer = layerCache.get(key);
  if (!layer) {
    layer = document.createElement("canvas");
    layer.width = WORLD.width;
    layer.height = WORLD.height;
    const tc = layer.getContext("2d");
    if (tc) {
      tc.imageSmoothingEnabled = false;
      paint(tc);
      layerCache.set(key, layer);
      if (layerCache.size > 6) {
        const oldest = layerCache.keys().next().value;
        if (oldest !== undefined) layerCache.delete(oldest);
      }
    }
  }
  return layer;
}

export function renderWorld(c: CanvasRenderingContext2D, f: WorldFrame) {
  const { state, transform, time, path, hover } = f;
  const city = state.cityId;
  const storm = state.solActual === 8;
  const mars = transform >= 1;
  const p = project;
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, WORLD.width, WORLD.height);
  c.drawImage(
    cachedLayer("stars", (c) => {
      for (let i = 0; i < 65; i++) {
        const x = Math.floor(n(i, 2) * 800),
          y = Math.floor(n(i, 4) * 470);
        box(
          c,
          i % 8 === 0 ? "#a89c9244" : "#776b8533",
          x,
          y,
          i % 8 === 0 ? 2 : 1,
          1,
        );
      }
    }),
    0,
    0,
  );
  for (let i = 0; i < 5; i++) {
    const cx = ((i * 211 + (f.reduced ? 0 : time * 0.003)) % 940) - 70,
      cy = 78 + (i % 3) * 141;
    const color = mars ? "#dac0ef15" : "#ddf5ff24";
    box(c, color, cx, cy, 70, 12);
    box(c, color, cx + 15, cy - 10, 43, 12);
    box(c, color, cx - 10, cy + 9, 103, 7);
  }
  // The island layer only depends on city and mars-transform progress, so it
  // is painted once per (city, transform bucket) and blitted every frame.
  const bucket = Math.round(transform * 20) / 20;
  c.drawImage(
    cachedLayer(`island|${city}|${bucket}|${mars ? "mars" : "terra"}`, (c) => {
    const outline = regionPolygon(city).map((a) => q(a));
  // A continuous, geographically sourced silhouette; scanline rasterization keeps pixel edges.
  poly(
    c,
    "#131d4933",
    outline.map(([x, y]) => [x, y + 64]),
  );
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i],
      b = outline[(i + 1) % outline.length];
    poly(
      c,
      mars ? (i % 2 ? "#7e4064" : "#a04d66") : i % 2 ? "#755ba1" : "#a07abd",
      [a, b, [b[0], b[1] + 39], [a[0], a[1] + 39]],
    );
  }
  poly(
    c,
    mars
      ? "#ec865e"
      : city === "uyuni"
        ? "#effaff"
        : city === "la-paz"
          ? "#c8ac88"
          : "#80d886",
    outline,
  );
  for (let i = 0; i < outline.length; i++)
    line(
      c,
      mars ? "#ffb47b" : "#b9ffe1",
      outline[i],
      outline[(i + 1) % outline.length],
      2,
    );
  c.save();
  c.beginPath();
  outline.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.clip();
  for (let sum = 0; sum < 19; sum++)
    for (let x = 0; x < 10; x++) {
      const y = sum - x;
      if (y < 0 || y >= 10) continue;
      const isMars = tileIsMars(x, y, transform);
      const z = isMars ? 0 : terraceHeight(x, y, city);
      const pt = p({ x, y });
      pt.y -= z;
      const road = x === 5 || y === 5 || (x === 2 && y >= 5);
      const ring =
        city === "santa-cruz" &&
        Math.abs(Math.hypot(x - 4.5, y - 4.5) - 3) < 0.52;
      const shade = n(x, y);
      let color = isMars
        ? road
          ? "#ad795c"
          : shade > 0.65
            ? "#f19569"
            : shade > 0.3
              ? "#e88860"
              : "#dc7959"
        : city === "uyuni"
          ? road
            ? "#b4bdb0"
            : shade > 0.5
              ? "#f4fbff"
              : "#d8f1f6"
          : city === "la-paz"
            ? road
              ? "#a8977c"
              : shade > 0.5
                ? "#9b8869"
                : "#8c7e64"
            : road || ring
              ? "#b8ae88"
              : shade > 0.6
                ? "#7edc81"
                : shade > 0.3
                  ? "#69c980"
                  : "#53b878";
      const vertices: P[] = [
        [pt.x, pt.y - 16],
        [pt.x + 32, pt.y],
        [pt.x, pt.y + 16],
        [pt.x - 32, pt.y],
      ];
      if (!isMars && city === "la-paz") {
        const dropX = z - terraceHeight(x + 1, y, city),
          dropY = z - terraceHeight(x, y + 1, city);
        if (dropY > 0)
          poly(c, "#645f50", [
            [pt.x - 32, pt.y],
            [pt.x, pt.y + 16],
            [pt.x, pt.y + 16 + dropY],
            [pt.x - 32, pt.y + dropY],
          ]);
        if (dropX > 0)
          poly(c, "#70644f", [
            [pt.x + 32, pt.y],
            [pt.x, pt.y + 16],
            [pt.x, pt.y + 16 + dropX],
            [pt.x + 32, pt.y + dropX],
          ]);
      }
      diamond(c, color, pt);
      line(c, isMars ? "#d28a5b40" : "#f4edc825", vertices[0], vertices[1]);
      line(c, isMars ? "#7e473c77" : "#3d593966", vertices[1], vertices[2]);
      for (let i = 0; i < 9; i++) {
        const dx = Math.floor(n(x * 13 + i, y) * 43) - 21,
          dy = Math.floor(n(y * 11 + i, x) * 13) - 6;
        box(
          c,
          isMars
            ? i % 3
              ? "#de98643f"
              : "#7e49344f"
            : city === "uyuni"
              ? "#f4f0d15f"
              : "#b4b48033",
          pt.x + dx,
          pt.y + dy,
          i % 3 === 0 ? 3 : 2,
          1,
        );
      }
      if (!isMars && city === "uyuni") {
        const h: P[] = [
          [pt.x - 19, pt.y],
          [pt.x - 9, pt.y - 7],
          [pt.x + 9, pt.y - 7],
          [pt.x + 19, pt.y],
          [pt.x + 9, pt.y + 7],
          [pt.x - 9, pt.y + 7],
        ];
        for (let j = 0; j < 6; j++) line(c, "#9dac9a88", h[j], h[(j + 1) % 6]);
        line(c, "#f5f3ddaa", [pt.x - 9, pt.y - 7], [pt.x + 9, pt.y - 7]);
      }
      if (road && isMars && x % 2 === 0 && y % 2 === 1)
        box(c, "#e5b07977", pt.x - 4, pt.y - 1, 8, 2);
      if (
        transform > 0 &&
        transform < 1 &&
        Math.abs((x + y) / 20 - transform) < 0.065
      )
        diamond(c, "#f2b57666", pt);
    }
    c.restore();
    }),
    0,
    0,
  );
  // Cables, ground route and landing markers are part of the terrain layer.
  for (const tile of path) {
    const pt = p(tile);
    pt.y -= tileIsMars(tile.x, tile.y, transform)
      ? 0
      : terraceHeight(tile.x, tile.y, city);
    diamond(
      c,
      `rgba(255,237,95,${0.55 + Math.sin(time / 280 + tile.x) * 0.2})`,
      pt,
      5,
      3,
    );
    box(c, "#fff5b7", pt.x - 1, pt.y - 1, 2, 2);
  }
  if (
    hover &&
    islandTile(hover, city) &&
    hover.x >= 0 &&
    hover.y >= 0 &&
    hover.x < 10 &&
    hover.y < 10
  ) {
    const pt = p(hover);
    pt.y -= tileIsMars(hover.x, hover.y, transform)
      ? 0
      : terraceHeight(hover.x, hover.y, city);
    const vv: P[] = [
      [pt.x, pt.y - 15],
      [pt.x + 30, pt.y],
      [pt.x, pt.y + 15],
      [pt.x - 30, pt.y],
    ];
    for (let i = 0; i < 4; i++) line(c, "#ead1a399", vv[i], vv[(i + 1) % 4]);
  }
  const items: { depth: number; draw: () => void }[] = [];
  for (const site of structuresForCity(city)) {
    const b = { ...site, x: site.x - 0.5, y: site.y - 0.5, w: 2, d: 2 };
    const bm = tileIsMars(b.x + (b.w - 1) / 2, b.y + (b.d - 1) / 2, transform);
    const z = bm ? 0 : terraceHeight(b.x, b.y, city);
    items.push({
      depth: b.x + b.y + b.w + b.d - 2,
      draw: () => {
        const center = project(site);
        c.save();
        c.translate(center.x, center.y);
        c.scale(0.72, 0.9);
        c.translate(-center.x, -center.y);
        if (!bm) {
          urban(c, b, city, z);
          c.restore();
          return;
        }
        switch (b.id) {
          case "refuge":
            refuge(c, b, z, storm);
            break;
          case "greenhouse":
            greenhouse(c, b, z, state);
            break;
          case "solar":
            solar(c, b, z, f.cleaning);
            break;
          case "probe":
            antenna(
              c,
              b,
              z,
              time,
              ["connected", "alert", "complete"].includes(state.rescue.status),
            );
            break;
          case "garage":
            garage(c, b, z);
            break;
        }
        c.restore();
      },
    });
  }
  const decorations: Point[] = [];
  for (let x = -1; x <= 10; x++)
    for (let y = -1; y <= 10; y++) {
      const a = { x: x + 0.25, y: y + 0.25 };
      if (
        pointInRegion(a, city) &&
        structuresForCity(city).every(
          (b) => Math.hypot(b.x - a.x, b.y - a.y) > 1.4,
        ) &&
        Math.hypot(f.position.x - a.x, f.position.y - a.y) > 1 &&
        n(x, y) > 0.45
      )
        decorations.push(a);
    }
  for (const a of decorations) {
    if (!pointInRegion(a, city)) continue;
    const mm = tileIsMars(a.x, a.y, transform),
      pt = p(a);
    const z = mm ? 0 : terraceHeight(a.x, a.y, city);
    items.push({
      depth: a.x + a.y,
      draw: () => {
        if (mm) {
          box(c, "#784c43", pt.x - 6, pt.y - z - 5, 13, 6);
          box(c, "#c48c67", pt.x - 4, pt.y - z - 8, 8, 4);
          if (a.x === 9) {
            const post = pt;
            box(c, "#c5bc9f", post.x, post.y - 21, 2, 21);
            box(c, "#c25b44", post.x + 2, post.y - 21, 11, 3);
            box(c, "#c5a24d", post.x + 2, post.y - 18, 11, 3);
            box(c, "#6c8c57", post.x + 2, post.y - 15, 11, 3);
          }
        } else if (city === "la-paz") {
          poly(c, "#645686", [
            [pt.x - 18, pt.y - z],
            [pt.x - 7, pt.y - z - 31],
            [pt.x, pt.y - z - 38],
            [pt.x + 20, pt.y - z - 3],
          ]);
          poly(c, "#a998c9", [
            [pt.x - 7, pt.y - z - 31],
            [pt.x, pt.y - z - 38],
            [pt.x + 20, pt.y - z - 3],
            [pt.x, pt.y - z + 3],
          ]);
          poly(c, "#fff4e0", [
            [pt.x - 9, pt.y - z - 26],
            [pt.x, pt.y - z - 38],
            [pt.x + 8, pt.y - z - 23],
            [pt.x + 2, pt.y - z - 25],
            [pt.x - 2, pt.y - z - 20],
          ]);
        } else if (city !== "uyuni") {
          tree(c, pt.x, pt.y - z, true);
        } else {
          poly(c, "#b0f6ff", [
            [pt.x - 10, pt.y - z],
            [pt.x - 10, pt.y - z - 17],
            [pt.x - 4, pt.y - z - 26],
            [pt.x + 2, pt.y - z - 16],
            [pt.x + 2, pt.y - z + 2],
          ]);
          poly(c, "#f4ffff", [
            [pt.x - 4, pt.y - z - 26],
            [pt.x + 4, pt.y - z - 22],
            [pt.x + 7, pt.y - z - 2],
            [pt.x + 2, pt.y - z + 2],
            [pt.x + 2, pt.y - z - 16],
          ]);
          box(c, "#eef0d5", pt.x - 5, pt.y - z - 4, 11, 4);
          box(c, "#aab8aa", pt.x - 6, pt.y - z, 14, 2);
        }
      },
    });
  }
  items.push({
    depth: f.position.x + f.position.y + 0.15,
    draw: () => {
      const foot = project(f.position);
      c.save();
      c.translate(foot.x, foot.y);
      c.scale(1.15, 1.15);
      c.translate(-foot.x, -foot.y);
      avatar(c, f);
      c.restore();
    },
  });
  items.sort((a, b) => a.depth - b.depth);
  items.forEach((i) => i.draw());
  if (storm) {
    for (let i = 0; i < 110; i++) {
      const dx =
          ((i * 97 + (f.reduced ? 0 : time) * (0.07 + (i % 4) * 0.02)) % 880) -
          40,
        dy = (i * 71 + (f.reduced ? 0 : time) * 0.015) % 520;
      box(
        c,
        i % 3 ? "#da9b5b55" : "#e3b57555",
        Math.floor(dx / 2) * 2,
        Math.floor(dy / 2) * 2,
        i % 6 ? 5 : 13,
        2,
      );
    }
  }
  if (transform > 0 && transform < 1) {
    const wave = transform * 650;
    for (let i = 0; i < 90; i++) {
      const px = (i * 83) % 800,
        py = wave - 130 + ((i * 41) % 120);
      box(c, "#ecaa7044", px, py, 7 + (i % 5), 2);
    }
  }
  if (state.rescue.status === "complete") {
    const p0 = project({ x: 4, y: 4 });
    for (let k = 0; k < 3; k++) {
      const radius = 85 + k * 10;
      poly(c, "#5ce1e608", [
        [p0.x, p0.y - radius * 0.7 - 80],
        [p0.x + radius, p0.y - 35],
        [p0.x + radius * 0.8, p0.y + 22],
        [p0.x, p0.y + radius * 0.45],
        [p0.x - radius * 0.8, p0.y + 22],
        [p0.x - radius, p0.y - 35],
      ]);
      line(
        c,
        "#5ce1e650",
        [p0.x - radius, p0.y - 35],
        [p0.x, p0.y - radius * 0.7 - 80],
      );
      line(
        c,
        "#5ce1e633",
        [p0.x, p0.y - radius * 0.7 - 80],
        [p0.x + radius, p0.y - 35],
      );
    }
  }
}

export {
  box as pixelBox,
  poly as pixelPolygon,
  line as pixelLine,
  corners as isoCorners,
  prism as isoPrism,
};
