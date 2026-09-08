/**
 * The input bus. Every source — the webcam landmarker, the pointer, the
 * keyboard — writes into one shared, mutable object that the scene's frame
 * loop reads. No React state per frame anywhere.
 *
 * Coordinates are viewport-normalised: u right (0 → 1), v down (0 → 1), already
 * mirrored and cover-mapped where a camera is involved. The scene turns them
 * into world units at z = 0.
 */

export type InputMode = "camera" | "pointer";

/** 21 MediaPipe landmarks as interleaved (u, v) pairs. */
export interface LandmarkSample {
  kind: "landmarks";
  pts: Float32Array;
  t: number;
}

/** A synthetic hand: the pointer, a touch, a keyboard cursor. */
export interface ExplicitSample {
  kind: "explicit";
  u: number;
  v: number;
  pinch: boolean;
  t: number;
}

export type HandSample = LandmarkSample | ExplicitSample;

export type KeyboardCommand =
  | { type: "focusNext" }
  | { type: "focusPrev" }
  | { type: "toggleHold" }
  | { type: "tear" }
  | { type: "push" };

export class HandsInput {
  mode: InputMode;
  /** slots 0 / 1: the two hands (camera, pointer, touch); the keyboard is a third, virtual hand */
  slots: [HandSample | null, HandSample | null] = [null, null];
  /** explicit pushes (double-click / -tap): drained each frame */
  pushes: { u: number; v: number }[] = [];
  /** keyboard commands: drained each frame */
  commands: KeyboardCommand[] = [];
  /** arrow keys held right now: -1 / 0 / 1 per axis (v down) */
  kbdMove = { x: 0, y: 0 };
  /** the last device the visitor used — decides which legend / focus ring shows */
  lastDevice: "hand" | "pointer" | "touch" | "keyboard";
  /** raw camera landmarks for the development skeleton overlay (viewport-normalised) */
  debugHands: (Float32Array | null)[] = [null, null];

  constructor(mode: InputMode) {
    this.mode = mode;
    this.lastDevice = mode === "camera" ? "hand" : "pointer";
  }

  setMode(mode: InputMode, device: HandsInput["lastDevice"]): void {
    this.mode = mode;
    this.lastDevice = device;
  }

  /** Camera gone: empty the hand slots and the debug overlay. */
  clearHands(): void {
    this.slots[0] = null;
    this.slots[1] = null;
    this.debugHands[0] = null;
    this.debugHands[1] = null;
  }

  drainPushes(): { u: number; v: number }[] {
    const out = this.pushes;
    this.pushes = [];
    return out;
  }

  drainCommands(): KeyboardCommand[] {
    const out = this.commands;
    this.commands = [];
    return out;
  }
}

export function createInput(mode: InputMode): HandsInput {
  return new HandsInput(mode);
}

/** Landmark indices we read. */
export const LM = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_TIP: 20,
} as const;
