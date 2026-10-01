import { useEffect, useRef, useState } from 'react';
import type { WindParticle, WindTarget } from '../hooks/useWindPhysics';

interface GlowingDandelionProps {
  registerNode: (el: WindTarget | null, x: number, y: number) => void;
  /** the square box the flower is drawn in, CSS px (tarassaco.config.ts) */
  size: number;
}

// The flower is laid out in the 400 × 400 user-unit box the original SVG used,
// centre at (200, 200); the canvas maps those units onto the box's screen rect.
const VIEW = 400;
const CENTER = 200;
const SEED_COUNT = 140;
const THREAD = 'rgba(255, 255, 255, 0.15)';
const CROWN = 'M -5 -3 L 0 0 M 5 -3 L 0 0 M -3 -5 L 0 0 M 3 -5 L 0 0 M 0 -7 L 0 0';

interface Tween {
  from: [number, number, number, number];
  to: [number, number, number, number];
  t0: number;
  ms: number;
}

/** One seed: its rest geometry and its wind state (screen px, degrees, 0–1). */
interface Seed extends WindParticle {
  x2: number;
  y2: number;
  angle: number;
  crown: number;
  dx: number;
  dy: number;
  rot: number;
  alpha: number;
  tween: Tween | null;
}

// The site's ease, cubic-bezier(0.22, 1, 0.36, 1), is close enough to a cubic
// ease-out for a drift back home.
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * The luminous dandelion of the main scene. Stem and core are a static SVG in
 * the flower's box; the 140 seeds are particles on one 2D canvas that covers
 * the viewport (they fly a long way past the box, as the SVG's overflow:
 * visible let them). The wind hook integrates them exactly as it integrated
 * the old SVG groups and hands each one its displacement through set() — one
 * canvas draw per frame instead of 140 style writes and a full SVG repaint
 * (audit S12). Recovery and the reduced-motion settle arrive through ease(),
 * a short tween drawn here. A still flower schedules no frames.
 */
export function GlowingDandelion({ registerNode, size }: GlowingDandelionProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const drawRef = useRef<() => void>(() => {});

  // Lazy useState, not useMemo: the random layout is drawn once per mount,
  // never in render. Each seed is also its own WindParticle, so the physics
  // hook can key its state on the object.
  const [seeds] = useState<Seed[]>(() =>
    Array.from({ length: SEED_COUNT }, (_, i) => {
      const angle = (i / SEED_COUNT) * Math.PI * 2 + (Math.random() * 0.1 - 0.05);
      const length = 60 + Math.random() * 70;
      const seed: Seed = {
        kind: 'particle',
        x2: CENTER + Math.cos(angle) * length,
        y2: CENTER + Math.sin(angle) * length,
        angle: (angle * 180) / Math.PI,
        crown: 0.3 + Math.random() * 0.5,
        dx: 0, dy: 0, rot: 0, alpha: 1,
        tween: null,
        set(dx, dy, rot, alpha) {
          seed.tween = null;
          seed.dx = dx; seed.dy = dy; seed.rot = rot; seed.alpha = alpha;
          drawRef.current();
        },
        ease(dx, dy, rot, alpha, ms) {
          seed.tween = { from: [seed.dx, seed.dy, seed.rot, seed.alpha], to: [dx, dy, rot, alpha], t0: performance.now(), ms };
          drawRef.current();
        },
      };
      return seed;
    }),
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!canvas || !box) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const crown = new Path2D(CROWN); // parsed once, stroked 140 times a frame

    // Where the flower's box sits on screen and how big a user unit is there.
    // Read on mount, at the scene's entrance and on resize — never per frame.
    const geo = { left: 0, top: 0, k: size / VIEW, dpr: 1 };
    const layout = () => {
      const r = box.getBoundingClientRect();
      geo.left = r.left;
      geo.top = r.top;
      geo.k = r.width / VIEW;
      // A viewport-sized backing store: cap the ratio so a 2x desktop is not
      // 20 MB of canvas for hairlines.
      geo.dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth > 1000 ? 1.5 : 2);
      canvas.width = Math.round(window.innerWidth * geo.dpr);
      canvas.height = Math.round(window.innerHeight * geo.dpr);
    };

    const paint = (now: number) => {
      let live = false;
      ctx.setTransform(geo.dpr, 0, 0, geo.dpr, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.lineCap = 'round';
      const cx = geo.left + CENTER * geo.k;
      const cy = geo.top + CENTER * geo.k;
      for (const s of seeds) {
        const tw = s.tween;
        if (tw) {
          const t = Math.min(1, (now - tw.t0) / tw.ms);
          const e = easeOut(t);
          s.dx = tw.from[0] + (tw.to[0] - tw.from[0]) * e;
          s.dy = tw.from[1] + (tw.to[1] - tw.from[1]) * e;
          s.rot = tw.from[2] + (tw.to[2] - tw.from[2]) * e;
          s.alpha = tw.from[3] + (tw.to[3] - tw.from[3]) * e;
          if (t >= 1) s.tween = null; else live = true;
        }
        if (s.alpha <= 0) continue;
        ctx.save();
        // Same pivot the SVG groups had (transform-origin at the flower's
        // centre): translate by the displacement, rotate about the centre,
        // then draw in user units.
        ctx.translate(cx + s.dx, cy + s.dy);
        if (s.rot) ctx.rotate((s.rot * Math.PI) / 180);
        ctx.scale(geo.k, geo.k);
        ctx.globalAlpha = s.alpha;
        ctx.strokeStyle = THREAD;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(s.x2 - CENTER, s.y2 - CENTER);
        ctx.stroke();
        // the crown: a few fine filaments and a dot at the tip
        ctx.translate(s.x2 - CENTER, s.y2 - CENTER);
        ctx.rotate((s.angle * Math.PI) / 180);
        ctx.globalAlpha = s.alpha * s.crown;
        ctx.strokeStyle = '#fff';
        ctx.fillStyle = '#fff';
        ctx.lineWidth = 0.4;
        ctx.stroke(crown);
        ctx.beginPath();
        ctx.arc(0, 0, 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      rafRef.current = live ? requestAnimationFrame(paint) : null;
    };

    // set()/ease() ask for a frame; several asks in one frame coalesce, and
    // the loop keeps itself alive only while a tween is in flight.
    const request = () => {
      if (rafRef.current === null) rafRef.current = requestAnimationFrame(paint);
    };
    drawRef.current = request;

    // Hand every seed's screen origin to the wind. At 600 ms (the scene's
    // entrance) and again on resize, debounced: a rect read mid-flight would
    // store a displaced position as the origin. A size change (phone ↔
    // desktop) re-registers through the same path.
    const registerAll = () => {
      layout();
      for (const s of seeds) registerNode(s, geo.left + s.x2 * geo.k, geo.top + s.y2 * geo.k);
      request();
    };

    layout();
    request(); // the flower at rest
    const timer = setTimeout(registerAll, 600);
    let debounce: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(debounce);
      debounce = setTimeout(registerAll, 150);
    };
    window.addEventListener('resize', onResize);

    return () => {
      clearTimeout(timer);
      clearTimeout(debounce);
      window.removeEventListener('resize', onResize);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      drawRef.current = () => {};
    };
  }, [registerNode, seeds, size]);

  return (
    <div ref={boxRef} className="relative pointer-events-none select-none" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="absolute inset-0 w-full h-full overflow-visible" aria-hidden="true">
        <defs>
          <radialGradient id="coreGlow">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="rgba(255,255,255,0.8)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* The Stem - Elegant and curved */}
        <path
          d="M 200 200 C 200 280 195 350 185 450"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />

        {/* The Core - Soft and luminous */}
        <circle cx="200" cy="200" r="15" fill="url(#coreGlow)" opacity="0.6" />
        <circle cx="200" cy="200" r="5" fill="#ffffff" filter="url(#softGlow)" />
      </svg>

      {/* The seeds: particles the wind hook moves, one draw per frame. Fixed to
          the viewport so a seed can fly all the way across it (.tara-seeds). */}
      <canvas ref={canvasRef} className="tara-seeds" aria-hidden="true" />
    </div>
  );
}
