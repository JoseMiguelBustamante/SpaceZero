import { useEffect, useRef } from "react";
import type { CityId } from "@/lib/game";
import { drawLunarFlight } from "@/lib/world-renderer";

// Full-screen overlay that keeps the island launch visible above the
// prologue danger card. Purely visual; it never captures input.
export function RocketLaunch({
  progress,
  cityId,
}: {
  progress: number;
  cityId: CityId | null;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const cityIdRef = useRef(cityId);
  cityIdRef.current = cityId;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;
    c.imageSmoothingEnabled = false;
    let raf = 0;
    let w = 0,
      h = 0;
    const frame = () => {
      const t = progressRef.current;
      const cw = canvas.clientWidth,
        ch = canvas.clientHeight;
      if (cw !== w || ch !== h) {
        w = canvas.width = cw;
        h = canvas.height = ch;
      }
      c.clearRect(0, 0, w, h);
      if (t > 0 && t < 1) drawLunarFlight(c, t, w, h, cityIdRef.current);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} className="rocket-launch-overlay" aria-hidden="true" />;
}
