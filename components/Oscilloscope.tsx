"use client";
import { useEffect, useRef } from "react";
import { useGame } from "./GameProvider";
import { SIGNAL_TARGET } from "@/lib/rescue";
export function Oscilloscope() {
  const ref = useRef<HTMLCanvasElement>(null);
  const { state } = useGame();
  const r = state.rescue;
  useEffect(() => {
    const c = ref.current?.getContext("2d");
    if (!c) return;
    c.imageSmoothingEnabled = false;
    let raf = 0;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    function frame(time: number) {
      const w = 640,
        h = 320;
      c!.fillStyle = "#080f0d";
      c!.fillRect(0, 0, w, h);
      c!.lineWidth = 1;
      for (let x = 0; x < w; x += 20) {
        c!.strokeStyle = x % 80 === 0 ? "#265035" : "#163223";
        c!.beginPath();
        c!.moveTo(x + 0.5, 0);
        c!.lineTo(x + 0.5, h);
        c!.stroke();
      }
      for (let y = 0; y < h; y += 20) {
        c!.strokeStyle = y % 80 === 0 ? "#265035" : "#163223";
        c!.beginPath();
        c!.moveTo(0, y + 0.5);
        c!.lineTo(w, y + 0.5);
        c!.stroke();
      }
      c!.fillStyle = "#4d7a51";
      for (let x = 0; x < w; x += 10)
        c!.fillRect(x, 159, 1, x % 40 === 0 ? 8 : 4);
      const drift = reduced ? 0 : time / 1800;
      function wave(
        angle: number,
        freq: number,
        phase: number,
        color: string,
        dashed: boolean,
      ) {
        c!.fillStyle = color;
        const amp = 30 + (angle / 180) * 70;
        for (let x = 0; x < w; x += 2) {
          if (dashed && x % 12 >= 8) continue;
          const y =
            160 -
            Math.sin(
              (x / w) * Math.PI * 2 * freq + (phase * Math.PI) / 180 + drift,
            ) *
              amp;
          const prev =
            160 -
            Math.sin(
              ((x - 2) / w) * Math.PI * 2 * freq +
                (phase * Math.PI) / 180 +
                drift,
            ) *
              amp;
          c!.fillRect(
            x,
            Math.floor(Math.min(y, prev) / 2) * 2,
            2,
            Math.max(2, Math.ceil(Math.abs(y - prev) / 2) * 2),
          );
        }
      }
      wave(
        SIGNAL_TARGET.angle,
        SIGNAL_TARGET.frequency,
        SIGNAL_TARGET.phase,
        "#39ff1499",
        true,
      );
      wave(r.angle, r.frequency, r.phase, "#5ce1e6", false);
      c!.fillStyle = "#75b36b";
      c!.font = "10px monospace";
      c!.fillText("VERDE: OBJETIVO", 14, 20);
      c!.fillStyle = "#5ce1e6";
      c!.fillText("AZUL: TU SEÑAL", 14, 305);
      c!.fillStyle = "#47764b";
      c!.fillText("BUSCA LA SEÑAL", 510, 20);
      c!.fillText("TIERRA", 553, 305);
      if (!reduced) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [r.angle, r.frequency, r.phase]);
  return (
    <canvas
      ref={ref}
      width={640}
      height={320}
      className="oscilloscope"
      role="img"
      aria-label="Dos líneas en píxeles: la verde es el objetivo y la azul es tu señal."
    />
  );
}
