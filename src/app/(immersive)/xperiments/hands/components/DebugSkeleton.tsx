import { useEffect, useRef } from "react";
import type { HandsInput } from "../engine/input";

/** Landmark connections (MediaPipe hand topology). */
const BONES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

/**
 * Development only: a 2D canvas drawing the two hands' landmarks as read from
 * the input bus, toggled with `d`. Never mounted in production.
 */
export function DebugSkeleton({ input }: { input: HandsInput }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.clearRect(0, 0, w, h);
      input.debugHands.forEach((pts, slot) => {
        if (!pts) return;
        ctx.strokeStyle = slot === 0 ? "rgba(199,196,188,0.6)" : "rgba(176,120,70,0.8)";
        ctx.fillStyle = ctx.strokeStyle;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const [a, b] of BONES) {
          ctx.moveTo(pts[a * 2] * w, pts[a * 2 + 1] * h);
          ctx.lineTo(pts[b * 2] * w, pts[b * 2 + 1] * h);
        }
        ctx.stroke();
        for (let i = 0; i < 21; i++) {
          ctx.beginPath();
          ctx.arc(pts[i * 2] * w, pts[i * 2 + 1] * h, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.font = "10px monospace";
        ctx.fillText(`hand ${slot}`, pts[0] * w + 6, pts[1] * h + 12);
      });
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [input]);
  return <canvas ref={ref} className="hands-debug" aria-hidden="true" />;
}
