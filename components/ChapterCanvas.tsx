"use client";
import { useEffect, useRef } from "react";
import { useGame } from "./GameProvider";
export function GreenhouseCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const { state } = useGame();
  const { growth, uv, risk } = state.greenhouse;
  const health = state.resources.saludCosecha;
  useEffect(() => {
    const c = ref.current?.getContext("2d");
    if (!c) return;
    c.imageSmoothingEnabled = false;
    const r = (color: string, x: number, y: number, w: number, h: number) => {
      c.fillStyle = color;
      c.fillRect(Math.floor(x), Math.floor(y), w, h);
    };
    r("#171822", 0, 0, 640, 340);
    for (let i = 0; i < 70; i++) {
      const x = (i * 193 + 17) % 640,
        y = (i * 67 + 29) % 160;
      r(i % 4 ? "#777081" : "#b4a19c", x, y, 1, 1);
    }
    for (let y = 185; y < 340; y += 4)
      for (let x = 0; x < 640; x += 4) {
        const n = Math.sin(x * 12 + y * 7);
        r(n > 0.5 ? "#754238" : n < -0.5 ? "#683b37" : "#5b3534", x, y, 4, 4);
      }
    r("#252731", 58, 260, 522, 20);
    r("#777d81", 69, 250, 500, 10);
    r("#373b47", 80, 103, 477, 147);
    r("#707b80", 92, 76, 452, 8);
    r("#657478", 81, 84, 476, 11);
    r("#839091", 74, 95, 490, 10);
    r("#a1ad9f", 68, 105, 7, 145);
    r("#87968e", 561, 105, 7, 145);
    r("#293b3d", 80, 108, 476, 135);
    r("#375253", 83, 111, 470, 3);
    r("#48726b", 87, 114, 462, 3);
    for (let x = 91; x < 550; x += 76) {
      r("#79938a", x, 104, 4, 142);
      r("#91a89a", x, 105, 1, 134);
    }
    r("#718b80", 80, 157, 477, 3);
    r("#253039", 82, 113, 471, 38);
    const lamp = uv > 70 ? "#bdb2eb" : uv > 20 ? "#8c91c2" : "#4a4e64";
    for (let x = 110; x < 540; x += 76) {
      r("#686e80", x, 119, 50, 8);
      r(lamp, x + 3, 127, 44, 4);
      if (uv > 10) {
        c.fillStyle = `rgba(147,139,207,${uv / 900})`;
        c.beginPath();
        c.moveTo(x + 3, 132);
        c.lineTo(x - 13, 231);
        c.lineTo(x + 65, 231);
        c.lineTo(x + 47, 132);
        c.fill();
      }
    }
    for (let i = 0; i < 7; i++) {
      const x = 103 + i * 65,
        base = 232;
      const h = 8 + growth * 0.62 + (i % 3) * 5;
      const leaf =
        health < 35 ? "#977748" : health < 65 ? "#7e9d48" : "#72bf57";
      r("#57483a", x - 10, base, 42, 10);
      r("#94836a", x - 13, base + 10, 48, 5);
      r("#475644", x + 8, base - h, 4, h);
      for (let j = 0; j < Math.max(1, Math.floor(h / 12)); j++) {
        const y = base - j * 12 - 9;
        const side = j % 2 === 0 ? 1 : -1;
        const droop = health < 45 ? 5 : 0;
        r(leaf, x + 9 + (side > 0 ? 3 : -13), y + droop, 13, 5);
        r(
          health < 35 ? "#7c603d" : "#a4d077",
          x + 9 + (side > 0 ? 9 : -16),
          y - 4 + droop,
          8,
          5,
        );
      }
      if (growth > 65 && health > 35) {
        r("#c2cf79", x + 5, base - h - 6, 10, 7);
        r("#daca6a", x + 8, base - h - 8, 4, 4);
      }
    }
    r("#898c85", 81, 244, 476, 5);
    r("#d2c3a8", 576, 193, 32, 62);
    r("#656b76", 580, 204, 24, 26);
    r(risk > 75 ? "#FF2A2A" : "#39FF14", 584, 209, 5, 5);
    r("#a8a394", 580, 237, 24, 6);
    r("#474a57", 587, 255, 12, 20);
    r("#999a8b", 595, 183, 3, 11);
    r("#6c6b66", 566, 201, 10, 4);
    r("#b9b1a0", 29, 203, 20, 35);
    r("#e1d4ba", 30, 190, 20, 16);
    r("#628d99", 34, 193, 13, 8);
    r("#91897c", 31, 237, 7, 17);
    r("#bdb29c", 43, 236, 7, 18);
    r("#414049", 29, 252, 10, 4);
    r("#414049", 42, 252, 11, 4);
    r("#cb694f", 44, 212, 4, 5);
    c.font = "10px monospace";
    c.fillStyle = "#b7c2a2";
    c.fillText("ARES / BIO-01", 85, 278);
    c.fillStyle = "#9a8b7e";
    c.fillText("REGOLITO TRATADO · CIRCUITO CERRADO", 278, 278);
  }, [growth, health, uv, risk]);
  return (
    <canvas
      ref={ref}
      width={640}
      height={340}
      className="greenhouse-canvas"
      role="img"
      aria-label={`Plantas en píxeles: crecimiento ${Math.round(growth)}%, salud ${Math.round(health)}%. Las plantas crecen cuando tienen agua y luz.`}
    />
  );
}
export function DustCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const { state } = useGame();
  const eva = state.storm.allocation.eva;
  useEffect(() => {
    const c = ref.current?.getContext("2d");
    if (!c) return;
    c.imageSmoothingEnabled = false;
    let raf = 0;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    function frame(t: number) {
      c!.clearRect(0, 0, 640, 350);
      c!.fillStyle = "#3a231e88";
      c!.fillRect(0, 0, 640, 350);
      for (let i = 0; i < 110; i++) {
        const x = ((i * 97 + t * (0.04 + (i % 5) * 0.018)) % 720) - 40,
          y = ((i * 71 + t * 0.009) % 370) - 10;
        c!.fillStyle = ["#d3794866", "#e39a5b66", "#b36a4277"][i % 3];
        c!.fillRect(
          Math.floor(x / 3) * 3,
          Math.floor(y / 3) * 3,
          i % 5 === 0 ? 15 : 6,
          3,
        );
      }
      if (eva) {
        const x = 430 + Math.floor(Math.sin(t / 400) * 7),
          y = 246;
        c!.fillStyle = "#eadac0";
        c!.fillRect(x, y, 14, 14);
        c!.fillRect(x - 2, y + 14, 18, 22);
        c!.fillStyle = "#6ea3b3";
        c!.fillRect(x + 2, y + 3, 11, 7);
        c!.fillStyle = "#d1c4ad";
        c!.fillRect(x, y + 36, 5, 12);
        c!.fillRect(x + 10, y + 36, 5, 12);
        c!.fillRect(x + 16, y + 15, 17, 5);
        c!.fillStyle = "#a89a79";
        c!.fillRect(x + 31, y + 13, 3, 32);
        c!.fillRect(x + 26, y + 41, 14, 4);
      }
      if (!reduced) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [eva]);
  return (
    <canvas
      ref={ref}
      width={640}
      height={350}
      className="dust-canvas"
      aria-label={
        eva
          ? "Tormenta de polvo con astronauta limpiando paneles solares"
          : "Tormenta de polvo naranja sobre el hábitat marciano"
      }
      role="img"
    />
  );
}
