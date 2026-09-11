import {
  FILTER_BETA,
  FILTER_D_CUTOFF,
  FILTER_MIN_CUTOFF,
  FIST_ENTER_FRAMES,
  FIST_EXIT_FRAMES,
  HAND_LOST_GRACE_MS,
  PALM_OPEN_FRAMES,
  PINCH_ENTER,
  PINCH_ENTER_FRAMES,
  PINCH_EXIT,
  PINCH_EXIT_FRAMES,
  PUSH_COOLDOWN_MS,
  PUSH_FOCUS_SPEED_FACTOR,
  PUSH_GROWTH_RATE,
  PUSH_MIN_PRESENCE_MS,
  PUSH_SPEED,
  RENDER_FOLLOW_TAU_S,
  VELOCITY_TAU_S,
} from "../hands.config";
import { OneEuro, OneEuro2 } from "./oneEuro";

/**
 * One tracked hand, in world units at z = 0. Fed a sample per detection
 * (~30 Hz) and updated every render frame; owns the smoothing, the hysteresis
 * and the gesture edges. Nothing here knows about cards.
 */

export interface WorldSample {
  /** true for the pointer / keyboard: pinch is a flag, no palm */
  explicit: boolean;
  tipX: number;
  tipY: number;
  holdX: number;
  holdY: number;
  palmX: number;
  palmY: number;
  /** hand size s = |wrist − middle MCP| (explicit: nominal) */
  size: number;
  /** |thumb tip − index tip| (ignored when explicit) */
  pinchDist: number;
  pinch: boolean;
  /** four fingers extended (push) / four fingers curled (fist) — never both */
  fingersOpen: boolean;
  fingersClosed: boolean;
  /** sample timestamp (ms) — a repeated stamp is not a new detection */
  t: number;
}

export interface HandState {
  present: boolean;
  pinching: boolean;
  /** edges, valid for the frame they were raised in */
  pinchEnter: boolean;
  pinchExit: boolean;
  /** the hand is a fist; `fistEnter` for one frame, with the palm centre then */
  fist: boolean;
  fistEnter: boolean;
  fistX: number;
  fistY: number;
  /** raised for one frame when an open palm pushes; where it was, and which way */
  pushX: number;
  pushY: number;
  pushDirX: number;
  pushDirY: number;
  pushed: boolean;
  /** render-smoothed points */
  tipX: number;
  tipY: number;
  holdX: number;
  holdY: number;
  /** hand velocity (units / s), from the smoothed hold point */
  velX: number;
  velY: number;
  size: number;
}

export class HandTracker {
  readonly state: HandState = {
    present: false,
    pinching: false,
    pinchEnter: false,
    pinchExit: false,
    fist: false,
    fistEnter: false,
    fistX: 0,
    fistY: 0,
    pushX: 0,
    pushY: 0,
    pushDirX: 0,
    pushDirY: -1,
    pushed: false,
    tipX: 0,
    tipY: 0,
    holdX: 0,
    holdY: 0,
    velX: 0,
    velY: 0,
    size: 0,
  };

  /**
   * Focus mode (a print is open): the open-palm sweep is the close gesture —
   * a lower speed threshold and no cooldown. Set by the scene each frame.
   */
  focus = false;

  private tip = new OneEuro2(FILTER_MIN_CUTOFF, FILTER_BETA, FILTER_D_CUTOFF);
  private hold = new OneEuro2(FILTER_MIN_CUTOFF, FILTER_BETA, FILTER_D_CUTOFF);
  private palm = new OneEuro2(FILTER_MIN_CUTOFF, FILTER_BETA, FILTER_D_CUTOFF);
  private size = new OneEuro(FILTER_MIN_CUTOFF, FILTER_BETA, FILTER_D_CUTOFF);

  private lastSampleT = -1;
  private lastSeen = 0;
  private since = 0;
  private prevHoldX = 0;
  private prevHoldY = 0;
  private prevPalmX = 0;
  private prevPalmY = 0;
  private prevSize = 0;
  private palmVelX = 0;
  private palmVelY = 0;
  private growth = 0;
  private pinchCount = 0;
  private openCount = 0;
  private closedCount = 0;
  private lastPush = -1e9;
  private explicit = false;

  update(sample: WorldSample | null, now: number, dtRender: number): HandState {
    const s = this.state;
    s.pinchEnter = false;
    s.pinchExit = false;
    s.fistEnter = false;
    s.pushed = false;

    // A landmark sample that stopped being refreshed (the producer stalled or
    // the track ended without nulling the slot) ages out like an absent hand;
    // explicit sources (pointer, keyboard) write only on change and never age.
    const stale = !!sample && !sample.explicit && now - sample.t > HAND_LOST_GRACE_MS;
    if (sample && !stale) {
      if (!s.present) this.begin(sample, now);
      const fresh = sample.explicit || sample.t !== this.lastSampleT;
      if (fresh) this.lastSeen = now;
      if (sample.t !== this.lastSampleT) this.ingest(sample, now);
    }
    if ((!sample || stale) && s.present && now - this.lastSeen > HAND_LOST_GRACE_MS) {
      this.end();
      return s;
    }

    if (!s.present) return s;

    // Render-side follow: the sample steps at ~30 Hz, the frame runs faster.
    const k = 1 - Math.exp(-dtRender / RENDER_FOLLOW_TAU_S);
    s.tipX += (this.tip.x - s.tipX) * k;
    s.tipY += (this.tip.y - s.tipY) * k;
    s.holdX += (this.hold.x - s.holdX) * k;
    s.holdY += (this.hold.y - s.holdY) * k;
    return s;
  }

  private begin(sample: WorldSample, now: number): void {
    const s = this.state;
    s.present = true;
    s.pinching = false;
    s.fist = false;
    this.explicit = sample.explicit;
    this.since = now;
    this.lastSampleT = -1;
    this.pinchCount = 0;
    this.openCount = 0;
    this.closedCount = 0;
    this.tip.reset();
    this.hold.reset();
    this.palm.reset();
    this.size.reset();
    this.tip.filter(sample.tipX, sample.tipY, sample.t);
    this.hold.filter(sample.holdX, sample.holdY, sample.t);
    this.palm.filter(sample.palmX, sample.palmY, sample.t);
    this.size.filter(sample.size, sample.t);
    s.tipX = sample.tipX;
    s.tipY = sample.tipY;
    s.holdX = sample.holdX;
    s.holdY = sample.holdY;
    s.velX = s.velY = 0;
    this.palmVelX = this.palmVelY = 0;
    this.growth = 0;
    this.prevHoldX = sample.holdX;
    this.prevHoldY = sample.holdY;
    this.prevPalmX = sample.palmX;
    this.prevPalmY = sample.palmY;
    this.prevSize = sample.size;
    s.size = sample.size;
  }

  private end(): void {
    const s = this.state;
    if (s.pinching) s.pinchExit = true;
    s.pinching = false;
    s.fist = false;
    s.present = false;
  }

  private ingest(sample: WorldSample, now: number): void {
    const s = this.state;
    const dt =
      this.lastSampleT < 0
        ? 1 / 30
        : Math.min(0.1, Math.max(1e-3, (sample.t - this.lastSampleT) / 1000));
    this.lastSampleT = sample.t;

    this.tip.filter(sample.tipX, sample.tipY, sample.t);
    this.hold.filter(sample.holdX, sample.holdY, sample.t);
    this.palm.filter(sample.palmX, sample.palmY, sample.t);
    const size = this.size.filter(sample.size, sample.t);
    s.size = size;

    // Velocities from the smoothed positions, then a short EMA.
    const a = 1 - Math.exp(-dt / VELOCITY_TAU_S);
    const vx = (this.hold.x - this.prevHoldX) / dt;
    const vy = (this.hold.y - this.prevHoldY) / dt;
    s.velX += (vx - s.velX) * a;
    s.velY += (vy - s.velY) * a;
    this.prevHoldX = this.hold.x;
    this.prevHoldY = this.hold.y;
    const pvx = (this.palm.x - this.prevPalmX) / dt;
    const pvy = (this.palm.y - this.prevPalmY) / dt;
    this.palmVelX += (pvx - this.palmVelX) * a;
    this.palmVelY += (pvy - this.palmVelY) * a;
    this.prevPalmX = this.palm.x;
    this.prevPalmY = this.palm.y;
    const g = size > 1e-4 ? (size - this.prevSize) / dt / size : 0;
    this.growth += (g - this.growth) * a;
    this.prevSize = size;

    const settled = now - this.since > PUSH_MIN_PRESENCE_MS;

    // Fist — the four fingers curled, counted only once the hand has settled
    // (the same gate as the push). A fist also brings thumb and index
    // together, so while it holds the pinch detector is frozen, and a pinch
    // that was on ends here: the world opens what the hand was holding.
    if (!this.explicit) {
      if (!s.fist) {
        this.closedCount = settled && sample.fingersClosed ? this.closedCount + 1 : 0;
        if (this.closedCount >= FIST_ENTER_FRAMES) {
          s.fist = true;
          s.fistEnter = true;
          s.fistX = this.palm.x;
          s.fistY = this.palm.y;
          this.closedCount = 0;
          this.pinchCount = 0;
          if (s.pinching) {
            s.pinching = false;
            s.pinchExit = true;
          }
        }
      } else {
        this.closedCount = sample.fingersClosed ? 0 : this.closedCount + 1;
        if (this.closedCount >= FIST_EXIT_FRAMES) {
          s.fist = false;
          this.closedCount = 0;
          this.pinchCount = 0;
        }
      }
    }

    // Pinch — with hysteresis on the ratio and on time.
    if (this.explicit) {
      if (sample.pinch && !s.pinching) {
        s.pinching = true;
        s.pinchEnter = true;
      } else if (!sample.pinch && s.pinching) {
        s.pinching = false;
        s.pinchExit = true;
      }
    } else if (!s.fist) {
      const ratio = size > 1e-4 ? sample.pinchDist / size : 1;
      if (!s.pinching) {
        this.pinchCount = ratio < PINCH_ENTER ? this.pinchCount + 1 : 0;
        if (this.pinchCount >= PINCH_ENTER_FRAMES) {
          s.pinching = true;
          s.pinchEnter = true;
          this.pinchCount = 0;
        }
      } else {
        this.pinchCount = ratio > PINCH_EXIT ? this.pinchCount + 1 : 0;
        if (this.pinchCount >= PINCH_EXIT_FRAMES) {
          s.pinching = false;
          s.pinchExit = true;
          this.pinchCount = 0;
        }
      }
    }

    // Open palm → push. Never while pinching or fisted (the open test is the
    // fist's inverse — keep it that way), never right after appearing (the
    // filters are still settling and would read as a swipe). In focus mode
    // the same sweep closes the print: a lower threshold, no cooldown.
    if (!this.explicit) {
      this.openCount = sample.fingersOpen ? this.openCount + 1 : 0;
      const open = this.openCount >= PALM_OPEN_FRAMES;
      const speed = Math.hypot(this.palmVelX, this.palmVelY);
      const threshold = PUSH_SPEED * (this.focus ? PUSH_FOCUS_SPEED_FACTOR : 1);
      if (
        open &&
        !s.pinching &&
        !s.fist &&
        settled &&
        (this.focus || now - this.lastPush > PUSH_COOLDOWN_MS) &&
        (speed > threshold || this.growth > PUSH_GROWTH_RATE)
      ) {
        this.lastPush = now;
        s.pushed = true;
        s.pushX = this.palm.x;
        s.pushY = this.palm.y;
        // The sweep's direction; a push straight at the camera has none — down.
        s.pushDirX = speed > 0.5 ? this.palmVelX / speed : 0;
        s.pushDirY = speed > 0.5 ? this.palmVelY / speed : -1;
      }
    }
  }
}
