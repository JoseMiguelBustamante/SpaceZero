import test from "node:test";
import assert from "node:assert/strict";
import {
  STRUCTURES,
  structuresForCity,
  WORLD,
  canStep,
  keyboardStep,
  findPath,
  inBounds,
  pickTile,
  project,
  unproject,
  walkable,
  terraceHeight,
  tileIsMars,
  evaProjection,
} from "./isometric";
import { regionSpawn, islandTile, pointInRegion } from "./regions";
import { INITIAL_STATE, CITIES } from "./game";
test("diamond projection is exactly 2:1 and invertible across all 100 tiles", () => {
  assert.equal(WORLD.halfW / WORLD.halfH, 2);
  for (let x = 0; x < 10; x++)
    for (let y = 0; y < 10; y++) {
      const p = { x, y };
      assert.deepEqual(unproject(project(p)), p);
      assert.deepEqual(pickTile(project(p), null, 0), p);
    }
});
test("every reachable tile and all five structure doors can be reached without crossing buildings or cutting corners", () => {
  const start = { x: 5, y: 6 };
  assert.equal(STRUCTURES.length, 5);
  for (let x = 0; x < 10; x++)
    for (let y = 0; y < 10; y++) {
      const end = { x, y };
      if (!walkable(end)) continue;
      const path = findPath(start, end);
      assert.ok(path.length > 0, `route to ${x},${y}`);
      assert.deepEqual(path.at(-1), end);
      for (let i = 0; i < path.length; i++) {
        assert.ok(inBounds(path[i]));
        assert.ok(walkable(path[i]));
        if (i) assert.ok(canStep(path[i - 1], path[i]));
      }
    }
  for (const b of STRUCTURES) {
    assert.ok(walkable(b.door));
    assert.deepEqual(findPath(start, b.door).at(-1), b.door);
  }
  assert.equal(canStep({ x: 2, y: 2 }, { x: 3, y: 3 }), false);
});
test("clicking a blocked footprint chooses a walkable goal and terrace picking accounts for elevation", () => {
  for (const b of STRUCTURES) {
    const path = findPath({ x: 5, y: 6 }, { x: b.x, y: b.y });
    assert.ok(walkable(path.at(-1)!));
  }
  for (let x = 0; x < 10; x++)
    for (let y = 0; y < 10; y++) {
      const p = project({ x, y });
      p.y -= terraceHeight(x, y, "la-paz");
      if (islandTile({ x, y }, "la-paz"))
        assert.deepEqual(pickTile(p, "la-paz", 0), { x, y });
    }
  assert.equal(pickTile({ x: -100, y: -100 }, "uyuni", 1), null);
});
test("planetary wave transforms tiles in order and eventually converts all 100", () => {
  assert.equal(tileIsMars(0, 0, 0), false);
  assert.equal(tileIsMars(0, 0, 0.3), true);
  assert.equal(tileIsMars(9, 9, 0.3), false);
  for (let x = 0; x < 10; x++)
    for (let y = 0; y < 10; y++) assert.equal(tileIsMars(x, y, 1), true);
});
test("EVA presentation predicts only the existing cycle cost and never mutates resources", () => {
  const s = {
    ...INITIAL_STATE,
    storm: {
      ...INITIAL_STATE.storm,
      allocation: { ...INITIAL_STATE.storm.allocation, eva: 50 as const },
    },
  };
  const before = structuredClone(s);
  assert.equal(evaProjection(s, 0), 0);
  assert.equal(evaProjection(s, 2.5), 3);
  assert.equal(evaProjection(s, 100), 6);
  assert.deepEqual(s, before);
  s.storm.allocation.eva = 50;
  const maximum = {
    ...s,
    storm: {
      ...s.storm,
      allocation: { ...s.storm.allocation, eva: 50 as const },
    },
  };
  assert.equal(evaProjection(maximum, 5), 6);
  const nearlyFull = {
    ...maximum,
    resources: { ...maximum.resources, radiacionTripulacion: 97 },
  };
  assert.equal(evaProjection(nearlyFull, 5), 3);
});

test("WASD and arrow taps project toward their screen directions and never enter structures", () => {
  const start = { x: 5, y: 6 };
  for (const pair of [
    ["d", "arrowright"],
    ["a", "arrowleft"],
    ["w", "arrowup"],
    ["s", "arrowdown"],
  ]) {
    const a = keyboardStep(start, new Set([pair[0]])),
      b = keyboardStep(start, new Set([pair[1]]));
    assert.deepEqual(a, b);
    assert.ok(a && walkable(a));
  }
  const p = project(start),
    right = project(keyboardStep(start, new Set(["d"]))!);
  assert.ok(right.x > p.x);
  assert.equal(right.y, p.y);
  const up = project(keyboardStep(start, new Set(["w"]))!);
  assert.ok(up.y < p.y);
  assert.equal(up.x, p.x);
  assert.equal(keyboardStep(start, new Set(["d", "a"])), null);
});

for (const city of CITIES)
  test(`isla ${city.name}: todas las puertas y casillas se alcanzan dentro de la silueta`, () => {
    const start = regionSpawn(city.id),
      buildings = structuresForCity(city.id);
    assert.ok(walkable(start, city.id));
    for (const b of buildings) {
      const path = findPath(start, b.door, city.id);
      assert.deepEqual(path.at(-1), b.door, b.id);
      for (let i = 0; i < path.length; i++) {
        assert.ok(islandTile(path[i], city.id));
        assert.ok(walkable(path[i], city.id));
        if (i) assert.ok(canStep(path[i - 1], path[i], city.id));
      }
    }
    for (let x = 0; x < 10; x++)
      for (let y = 0; y < 10; y++)
        if (walkable({ x, y }, city.id))
          assert.deepEqual(findPath(start, { x, y }, city.id).at(-1), { x, y });
    for (const b of buildings)
      assert.ok(pointInRegion({ x: b.x, y: b.y }, city.id));
    for (const key of ["w", "a", "s", "d"]) {
      let p = start;
      for (let i = 0; i < 30; i++) {
        const q = keyboardStep(p, new Set([key]), city.id);
        if (!q) break;
        assert.ok(islandTile(q, city.id));
        p = q;
      }
    }
  });
