import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { hasWebGL2 } from "@/lib/webgl-caps";
import { useTabVisible } from "@/lib/use-tab-visible";
import { CAMERA_FOV_DEG, CAMERA_Z, DPR_RANGE } from "../hands.config";
import { HandTracker, type HandState, type WorldSample } from "../engine/hand";
import { LM, type HandsInput } from "../engine/input";
import { World, type WorldEvent } from "../engine/world";
import type { HandsCopy } from "../copy";

/**
 * The stage: one R3F canvas, the world of cards inside it, the reticles
 * outside it (DOM, positioned each frame). WebGL detection up front, a
 * message on context loss, rendering only while the tab is visible.
 */

export interface ReticleHandles {
  els: (HTMLDivElement | null)[];
}

interface SceneProps {
  copy: HandsCopy;
  input: HandsInput;
  reticles: RefObject<ReticleHandles>;
  worldRef: RefObject<World | null>;
  reducedMotion: boolean;
  onEvent: (e: WorldEvent) => void;
}

export function HandsScene({ copy, input, reticles, worldRef, reducedMotion, onEvent }: SceneProps) {
  // three 0.185 is WebGL2-only: the shared probe (released right away) decides
  // between the canvas and the message before anything mounts.
  const webgl = useMemo(() => hasWebGL2(), []);
  const [contextLost, setContextLost] = useState(false);
  const visible = useTabVisible();

  if (!webgl) {
    return <div className="hands-fallback">{copy.noWebgl}</div>;
  }

  return (
    <>
      <Canvas
        className="hands-canvas"
        dpr={DPR_RANGE}
        frameloop={visible && !contextLost ? "always" : "never"}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ fov: CAMERA_FOV_DEG, near: 0.1, far: 100, position: [0, 0, CAMERA_Z] }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0); // the stage paints the ground
          gl.toneMapping = THREE.NoToneMapping;
          const canvas = gl.domElement;
          // Without preventDefault the browser drops the context for good; with
          // it the GPU can restore, and we say so meanwhile.
          canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); setContextLost(true); }, false);
          canvas.addEventListener("webglcontextrestored", () => setContextLost(false), false);
        }}
      >
        <Field
          input={input}
          reticles={reticles}
          worldRef={worldRef}
          reducedMotion={reducedMotion}
          onEvent={onEvent}
        />
      </Canvas>
      {contextLost && <div className="hands-fallback">{copy.contextLost}</div>}
    </>
  );
}

/* ---- the frame loop ------------------------------------------------------ */

function exposeForTests(world: World, input: HandsInput): void {
  const g = window as unknown as { __handsWorld?: World; __handsInput?: HandsInput };
  g.__handsWorld = world;
  g.__handsInput = input;
}

const NOMINAL_HAND = 0.11; // explicit hands: nominal size, fraction of the viewport height

function landmarkSample(pts: Float32Array, vw: number, vh: number, t: number, out: WorldSample): WorldSample {
  const X = (i: number) => (pts[i * 2] - 0.5) * vw;
  const Y = (i: number) => (0.5 - pts[i * 2 + 1]) * vh;
  const d = (a: number, b: number) => Math.hypot(X(a) - X(b), Y(a) - Y(b));
  out.explicit = false;
  out.tipX = X(LM.INDEX_TIP);
  out.tipY = Y(LM.INDEX_TIP);
  out.holdX = (X(LM.INDEX_TIP) + X(LM.THUMB_TIP)) / 2;
  out.holdY = (Y(LM.INDEX_TIP) + Y(LM.THUMB_TIP)) / 2;
  out.palmX = (X(LM.WRIST) + X(LM.INDEX_MCP) + X(LM.MIDDLE_MCP) + X(LM.RING_MCP) + X(LM.PINKY_MCP)) / 5;
  out.palmY = (Y(LM.WRIST) + Y(LM.INDEX_MCP) + Y(LM.MIDDLE_MCP) + Y(LM.RING_MCP) + Y(LM.PINKY_MCP)) / 5;
  out.size = d(LM.WRIST, LM.MIDDLE_MCP);
  out.pinchDist = d(LM.THUMB_TIP, LM.INDEX_TIP);
  out.pinch = false;
  // Four fingers extended: each tip farther from the wrist than its PIP joint.
  out.fingersOpen =
    d(LM.INDEX_TIP, LM.WRIST) > d(LM.INDEX_PIP, LM.WRIST) * 1.08 &&
    d(LM.MIDDLE_TIP, LM.WRIST) > d(LM.MIDDLE_PIP, LM.WRIST) * 1.08 &&
    d(LM.RING_TIP, LM.WRIST) > d(LM.RING_PIP, LM.WRIST) * 1.08 &&
    d(LM.PINKY_TIP, LM.WRIST) > d(LM.PINKY_PIP, LM.WRIST) * 1.08;
  out.t = t;
  return out;
}

function explicitSample(u: number, v: number, pinch: boolean, vw: number, vh: number, t: number, out: WorldSample): WorldSample {
  const x = (u - 0.5) * vw;
  const y = (0.5 - v) * vh;
  out.explicit = true;
  out.tipX = out.holdX = out.palmX = x;
  out.tipY = out.holdY = out.palmY = y;
  out.size = NOMINAL_HAND * vh;
  out.pinchDist = pinch ? 0 : Infinity;
  out.pinch = pinch;
  out.fingersOpen = false;
  out.t = t;
  return out;
}

/** DOM writes for a reticle, kept out of the component (imperative, per frame). */
function placeReticle(
  el: HTMLDivElement,
  h: HandState,
  rs: { on: boolean; pinch: boolean },
  vw: number,
  vh: number,
  width: number,
  height: number,
): void {
  if (h.present) {
    const px = (h.tipX / vw + 0.5) * width;
    const py = (0.5 - h.tipY / vh) * height;
    el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0)`;
  }
  if (rs.on !== h.present) {
    rs.on = h.present;
    el.classList.toggle("is-on", h.present);
  }
  if (rs.pinch !== h.pinching) {
    rs.pinch = h.pinching;
    el.classList.toggle("is-pinch", h.pinching);
  }
}

function blankSample(): WorldSample {
  return {
    explicit: true, tipX: 0, tipY: 0, holdX: 0, holdY: 0, palmX: 0, palmY: 0,
    size: 1, pinchDist: Infinity, pinch: false, fingersOpen: false, t: 0,
  };
}

interface FieldProps {
  input: HandsInput;
  reticles: RefObject<ReticleHandles>;
  worldRef: RefObject<World | null>;
  reducedMotion: boolean;
  onEvent: (e: WorldEvent) => void;
}

function Field({ input, reticles, worldRef, reducedMotion, onEvent }: FieldProps) {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const get = useThree((s) => s.get);
  const world = useRef<World | null>(null);
  const trackers = useRef([new HandTracker(), new HandTracker()]);
  const samples = useRef([blankSample(), blankSample()]);
  const layout = useRef({ w: 0, h: 0 });
  const reticleState = useRef([{ on: false, pinch: false }, { on: false, pinch: false }]);
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const w = new World(Math.min(4, gl.capabilities.getMaxAnisotropy()));
    w.onEvent = (e) => onEventRef.current(e);
    world.current = w;
    worldRef.current = w;
    scene.add(w.root);
    // Size the world before any card can spawn: the textures may resolve
    // before the first frame (hidden tab, memory-cached images) and spawn
    // positions are only chosen once.
    const { size, camera, viewport } = get();
    const v = viewport.getCurrentViewport(camera, [0, 0, 0]);
    w.resize(v.width, v.height, size.height);
    layout.current = { w: size.width, h: size.height };
    w.load();
    // Development only: let a test script read the world and drive the bus.
    if (process.env.NODE_ENV === "development") exposeForTests(w, input);
    return () => {
      scene.remove(w.root);
      w.dispose();
      world.current = null;
      worldRef.current = null;
    };
  }, [scene, gl, get, worldRef, input]);

  useEffect(() => {
    if (world.current) world.current.reducedMotion = reducedMotion;
  }, [reducedMotion]);

  useFrame((state, delta) => {
    const w = world.current;
    if (!w) return;
    const { size, camera, viewport } = state;
    if (size.width !== layout.current.w || size.height !== layout.current.h) {
      layout.current = { w: size.width, h: size.height };
      const v = viewport.getCurrentViewport(camera, [0, 0, 0]);
      w.resize(v.width, v.height, size.height);
    }
    const v = viewport.getCurrentViewport(camera, [0, 0, 0]);
    const vw = v.width;
    const vh = v.height;
    const now = performance.now();
    const dt = Math.min(delta, 0.1);

    // Sources → world samples → tracked hands.
    const states: HandState[] = [];
    for (let i = 0; i < 2; i++) {
      const s = input.slots[i];
      let sample: WorldSample | null = null;
      if (s?.kind === "landmarks") sample = landmarkSample(s.pts, vw, vh, s.t, samples.current[i]);
      else if (s?.kind === "explicit") sample = explicitSample(s.u, s.v, s.pinch, vw, vh, s.t, samples.current[i]);
      states.push(trackers.current[i].update(sample, now, dt));
    }

    const pushes = input.drainPushes().map((p) => ({ x: (p.u - 0.5) * vw, y: (0.5 - p.v) * vh }));
    const commands = input.drainCommands();

    w.showFocus = input.lastDevice === "keyboard";
    w.update(now, dt, states, pushes, commands, input.kbdMove);

    // Reticles: DOM rings at the index tips, contracting while pinching.
    const els = reticles.current?.els;
    if (els) {
      for (let i = 0; i < 2; i++) {
        const el = els[i];
        if (!el) continue;
        placeReticle(el, states[i], reticleState.current[i], vw, vh, size.width, size.height);
      }
    }
  });

  return null;
}
