import { useEffect, useRef, useCallback } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { hasWebGL2 } from '@/lib/webgl-caps';

// === TWEAK PHYSICS & MIC HERE ===
// ⬇️ MODIFICA QUESTO VALORE PER LA SENSIBILITÀ DEL MICROFONO ⬇️
// Più è basso (es. 0.01), più è sensibile. Più è alto (es. 0.1), più devi soffiare forte.
export const MIC_THRESHOLD = 0.02;
export const LOW_FREQ_THRESHOLD = 150;     // Minimum low-frequency energy to ignore sharp noises
export const WIND_FORCE_MULTIPLIER = 80.0; // Aumentato drasticamente per far volare via tutto velocemente
export const FRICTION_DRAG = 0.96;         // Leggermente aumentato per farli scivolare via più velocemente
export const RECOVERY_TIMEOUT_MS = 2000;   // Milliseconds of silence before fluid CSS recovery kicks in
// Counted from the gate click. A permission prompt left open never settles
// getUserMedia, so this is the only thing that gets the visitor off the gate.
export const SENSOR_TIMEOUT_MS = 9000;
// Reduced motion: no per-frame integration — the first frame the wind reaches
// a node it settles once, this far downwind, over this long, and is gone.
export const REDUCED_SETTLE_PX = 60;
export const REDUCED_SETTLE_MS = 500;
// =================================

/** What drives the wind right now — shown in the HUD. */
export type SensorMode = 'face' | 'face-cpu' | 'face-lost' | 'mic' | 'keyboard';

export interface PhysicsState {
  vx: number;
  vy: number;
  dx: number;
  dy: number;
  originalX: number;
  originalY: number;
  mass: number;
  rot: number;
  vRot: number;
  isRecovering: boolean;
  /** reduced motion: settled once already, waits for recovery */
  launched: boolean;
}

export interface WindPhysicsOptions {
  enabled: boolean;
  canInteract?: boolean;
  onBlowSustained?: () => void;
  onSensorsReady?: () => void;
  onSensorsError?: (reason: 'denied' | 'timeout') => void;
  onModeChange?: (mode: SensorMode) => void;
  /** prefers-reduced-motion: settle nodes once instead of integrating them */
  reducedMotion?: boolean;
  allowedDirection?: 'left' | 'right' | 'both';
  sustainedDurationMs?: number;
  disableRecovery?: boolean;
  micThresholdOverride?: number;
  sceneKey?: string;
}

// Broadband blow is exactly what noiseSuppression / AGC / echoCancellation
// strip out, so disable all three or the blow gets filtered before we hear it.
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
};

export function useWindPhysics({
  enabled,
  canInteract = true,
  onBlowSustained,
  onSensorsReady,
  onSensorsError,
  onModeChange,
  reducedMotion = false,
  allowedDirection = 'both',
  sustainedDurationMs = 1000,
  disableRecovery = false,
  micThresholdOverride,
  sceneKey
}: WindPhysicsOptions) {
  const nodesRef = useRef<Map<HTMLElement | SVGElement, PhysicsState>>(new Map());
  const requestRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<{
    analyser: AnalyserNode;
    time: Float32Array<ArrayBuffer>;
    freq: Uint8Array<ArrayBuffer>;
  } | null>(null);
  const lastBlowTimeRef = useRef<number>(0);
  const isRecoveringRef = useRef<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const mouthXPositionsRef = useRef<number[]>([]);
  const isKeyBlowingRef = useRef(false); // SPACE / press-and-hold fallback blow
  // Every start() is an attempt; a newer attempt (retry) or the unmount bumps
  // the counter, and anything an older attempt resolves late is dropped.
  const attemptRef = useRef(0);
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scene Transition Refs
  const blowStartTimeRef = useRef<number>(0);
  const hasTriggeredSustainedRef = useRef<boolean>(false);

  const canInteractRef = useRef(canInteract);
  const onBlowSustainedRef = useRef(onBlowSustained);
  const onSensorsReadyRef = useRef(onSensorsReady);
  const onSensorsErrorRef = useRef(onSensorsError);
  const onModeChangeRef = useRef(onModeChange);
  const allowedDirectionRef = useRef(allowedDirection);
  const sustainedDurationMsRef = useRef(sustainedDurationMs);
  const disableRecoveryRef = useRef(disableRecovery);
  const micThresholdOverrideRef = useRef(micThresholdOverride);
  const reducedMotionRef = useRef(reducedMotion);

  useEffect(() => { canInteractRef.current = canInteract; }, [canInteract]);
  useEffect(() => { reducedMotionRef.current = reducedMotion; }, [reducedMotion]);
  useEffect(() => {
    onBlowSustainedRef.current = onBlowSustained;
  }, [onBlowSustained]);

  useEffect(() => {
    hasTriggeredSustainedRef.current = false;
    blowStartTimeRef.current = 0;
  }, [sceneKey]);

  useEffect(() => { onSensorsReadyRef.current = onSensorsReady; }, [onSensorsReady]);
  useEffect(() => { onSensorsErrorRef.current = onSensorsError; }, [onSensorsError]);
  useEffect(() => { onModeChangeRef.current = onModeChange; }, [onModeChange]);
  useEffect(() => { allowedDirectionRef.current = allowedDirection; }, [allowedDirection]);
  useEffect(() => { sustainedDurationMsRef.current = sustainedDurationMs; }, [sustainedDurationMs]);
  useEffect(() => { disableRecoveryRef.current = disableRecovery; }, [disableRecovery]);
  useEffect(() => { micThresholdOverrideRef.current = micThresholdOverride; }, [micThresholdOverride]);

  const registerNode = useCallback((el: HTMLElement | SVGElement | null, x: number, y: number) => {
    if (!el) return;
    const existing = nodesRef.current.get(el);
    if (existing) {
      existing.originalX = x;
      existing.originalY = y;
    } else {
      nodesRef.current.set(el, {
        vx: 0, vy: 0, dx: 0, dy: 0,
        originalX: x, originalY: y,
        mass: 0.8 + Math.random() * 1.5,
        rot: 0, vRot: 0,
        isRecovering: false,
        launched: false,
      });
    }
  }, []);

  const clearNodes = useCallback(() => {
    nodesRef.current.clear();
  }, []);

  // Stops every sensor handle: tracks (the recording light), the audio graph,
  // the off-screen video, the FaceLandmarker (WASM heap + GPU delegate).
  const release = useCallback(() => {
    if (readyTimerRef.current) { clearTimeout(readyTimerRef.current); readyTimerRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioRef.current = null;
    const ctx = audioContextRef.current;
    audioContextRef.current = null;
    if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {});
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.remove();
      videoRef.current = null;
    }
    faceLandmarkerRef.current?.close();
    faceLandmarkerRef.current = null;
    mouthXPositionsRef.current = [];
  }, []);

  useEffect(() => () => {
    attemptRef.current++;
    release();
  }, [release]);

  /**
   * Acquire the sensors. Must be called synchronously from the click (gate
   * button, dialog retry): getUserMedia and AudioContext.resume() both run
   * before the first await, inside the user gesture — iOS Safari opens the
   * prompt and starts audio only there. Camera + mic, then mic only, then the
   * error dialog; the timeout is armed here too, so an unanswered prompt ends
   * in the same dialog instead of an endless "initializing".
   */
  const start = useCallback(() => {
    release();
    const attempt = ++attemptRef.current;
    const current = () => attempt === attemptRef.current;
    let settled = false;

    readyTimerRef.current = setTimeout(() => {
      readyTimerRef.current = null;
      if (current() && !settled) onSensorsErrorRef.current?.('timeout');
    }, SENSOR_TIMEOUT_MS);

    let audioContext: AudioContext | null = null;
    try {
      audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioContext.resume().catch(() => {});
      audioContextRef.current = audioContext;
    } catch { /* no Web Audio: face tracking still needs the stream below */ }

    const initFace = async () => {
      try {
        // Self-hosted, versioned by folder (see next.config.ts): the wasm and
        // the float16 model of the pinned @mediapipe/tasks-vision@1.0.1.
        const vision = await FilesetResolver.forVisionTasks("/mediapipe/1.0.1/wasm");
        // GPU first; the CPU delegate when there is no WebGL2 or the GPU one
        // fails to build. If both fail the wind stays on the microphone.
        const delegates = hasWebGL2() ? (['GPU', 'CPU'] as const) : (['CPU'] as const);
        for (const delegate of delegates) {
          if (!current()) return;
          try {
            const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: "/mediapipe/1.0.1/face_landmarker.task",
                delegate,
              },
              outputFaceBlendshapes: false,
              runningMode: "VIDEO",
              numFaces: 2
            });
            if (!current()) { faceLandmarker.close(); return; }
            faceLandmarkerRef.current = faceLandmarker;
            onModeChangeRef.current?.(delegate === 'GPU' ? 'face' : 'face-cpu');
            return;
          } catch (e) {
            console.warn(`MediaPipe ${delegate} delegate failed:`, e);
          }
        }
      } catch (e) {
        console.error("MediaPipe Init Error:", e);
      }
    };

    void (async () => {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: AUDIO_CONSTRAINTS,
          video: { facingMode: 'user', width: 640, height: 480 },
        });
      } catch {
        // desktops with a mic but no camera → NotFoundError on the combined request
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS });
        } catch {
          stream = null;
        }
      }

      // Superseded by a retry or unmounted during the prompt: stop any granted
      // tracks so the recording indicator doesn't stay lit.
      if (!current()) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }
      settled = true;
      if (readyTimerRef.current) { clearTimeout(readyTimerRef.current); readyTimerRef.current = null; }

      if (!stream) {
        // Denied / no device / insecure origin: the dialog offers Space and
        // press-and-hold, and a retry.
        release(); // the AudioContext opened for the gesture
        onSensorsErrorRef.current?.('denied');
        return;
      }
      streamRef.current = stream;

      if (audioContext && stream.getAudioTracks().length > 0) {
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
        audioContext.createMediaStreamSource(stream).connect(analyser);
        audioRef.current = {
          analyser,
          time: new Float32Array(analyser.fftSize),
          freq: new Uint8Array(analyser.frequencyBinCount),
        };
      }

      if (stream.getVideoTracks().length > 0) {
        // Off-screen but renderable: iOS Safari refuses to decode/play a
        // display:none or zero-size <video>. Keep it 1px + transparent. Nothing
        // waits on it — face tracking starts once readyState allows.
        const v = document.createElement('video');
        v.srcObject = stream;
        v.autoplay = true;
        v.playsInline = true;
        v.muted = true;
        v.style.cssText =
          'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;';
        document.body.appendChild(v);
        videoRef.current = v;
        v.play().catch((e) => console.warn("Video play error:", e));
        void initFace();
      }

      onModeChangeRef.current?.(audioRef.current ? 'mic' : 'keyboard');
      onSensorsReadyRef.current?.();
    })();
  }, [release]);

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;
    let windFrontX_LTR = -300;
    let windFrontX_RTL = window.innerWidth + 300;

    // Fallback blow: hold SPACE, or press and hold on the stage. Works with no
    // camera/mic at all (permission denied, no device, insecure origin) and
    // doubles as an accessibility path for anyone who can't blow into the mic.
    // The physics loop reads isKeyBlowingRef.
    isKeyBlowingRef.current = false;
    const isBlowKey = (e: KeyboardEvent) =>
      e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar';
    // A focused control keeps its own Space (the dialog's buttons activate on it).
    const onControl = (t: EventTarget | null) =>
      t instanceof Element && !!t.closest('a, button, input, textarea, select, [role="alertdialog"]');
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isBlowKey(e) || onControl(e.target)) return;
      e.preventDefault(); // no page scroll
      isKeyBlowingRef.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (isBlowKey(e)) isKeyBlowingRef.current = false;
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!e.isPrimary || e.button > 0 || onControl(e.target)) return;
      isKeyBlowingRef.current = true;
    };
    // keyup never fires if the window loses focus mid-press (alt-tab, a click
    // into devtools), which latched the blow on forever: endless wind and
    // scenes advancing by themselves. Release defensively on both signals.
    const releaseKey = () => {
      isKeyBlowingRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', releaseKey);
    window.addEventListener('pointercancel', releaseKey);
    window.addEventListener('blur', releaseKey);
    document.addEventListener('visibilitychange', releaseKey);

    // The mic path derives force from RMS above threshold; a key press has none,
    // so give the keyboard a firm, steady synthetic level.
    const KEY_BLOW_RMS = MIC_THRESHOLD + 0.08;

    // Reduced motion: one short transition downwind and gone. The recovery path
    // (.physics-recover, a cut under the same media query) brings it back.
    const settleOnce = (el: HTMLElement | SVGElement, state: PhysicsState, dir: 1 | -1) => {
      state.launched = true;
      el.style.transition = `transform ${REDUCED_SETTLE_MS}ms var(--ease), opacity ${REDUCED_SETTLE_MS}ms var(--ease)`;
      el.style.transform = `translate(${dir * REDUCED_SETTLE_PX}px, ${-REDUCED_SETTLE_PX * 0.3}px) rotate(0deg)`;
      el.style.opacity = '0';
    };

    // MediaPipe/TFLite spray benign INFO + warning lines to the console, routed
    // through console.error (Emscripten's printErr) — which Next's dev overlay
    // counts as an "Issue". The first line ("Created TensorFlow Lite XNNPACK
    // delegate") only fires on the first detectForVideo, long after init, so a
    // timed restore misses it. Filter only these known-benign markers for the
    // whole sensor lifetime; every unmatched call passes straight through.
    const MP_NOISE = [
      'TensorFlow Lite XNNPACK',
      'Created TensorFlow Lite',
      'OpenGL error checking is disabled',
      'NORM_RECT without IMAGE_DIMENSIONS',
      'gl_context.cc',
      'landmark_projection_calculator',
      'Graph successfully started',
      'GL version:',
      'face_landmarker_graph',
    ];
    const isMpNoise = (a: unknown) =>
      typeof a === 'string' && MP_NOISE.some((m) => a.includes(m));
    const consoleOriginals = {
      error: console.error,
      warn: console.warn,
      info: console.info,
      log: console.log,
    };
    console.error = (...a: unknown[]) => { if (!isMpNoise(a[0])) consoleOriginals.error(...a); };
    console.warn = (...a: unknown[]) => { if (!isMpNoise(a[0])) consoleOriginals.warn(...a); };
    console.info = (...a: unknown[]) => { if (!isMpNoise(a[0])) consoleOriginals.info(...a); };
    console.log = (...a: unknown[]) => { if (!isMpNoise(a[0])) consoleOriginals.log(...a); };

    // The physics loop runs regardless of acquisition: mic + face when start()
    // got them, SPACE / press-and-hold otherwise. Sensor handles are read from
    // refs every frame, so a late grant (or a retry) joins in without a restart.
    let lastDetect = 0; // throttles face detection to ~30fps
    // The integration below was written per-frame, so every constant was
    // implicitly tuned for 60Hz: on a 144Hz display the text blew away 2.4x
    // faster, and after a tab returned from the background the first frame's
    // gap threw it off screen. `dt` is expressed in 60Hz frames so the tuning
    // constants keep their meaning, and is clamped so a long stall (alt-tab,
    // GC pause) can never integrate into a jump.
    let lastFrame = performance.now();
    const physicsLoop = () => {
        if (!isMounted) return;

        // 1. Audio Analysis (skipped without a mic)
        let rms = 0;
        let lowFreqAvg = 0;
        const audio = audioRef.current;
        if (audio) {
          audio.analyser.getFloatTimeDomainData(audio.time);
          audio.analyser.getByteFrequencyData(audio.freq);
          let sumSquares = 0;
          for (let i = 0; i < audio.time.length; i++) sumSquares += audio.time[i] * audio.time[i];
          rms = Math.sqrt(sumSquares / audio.time.length);
          let lowFreqSum = 0;
          for (let i = 0; i < 15; i++) lowFreqSum += audio.freq[i];
          lowFreqAvg = lowFreqSum / 15;
        }

        const now = performance.now();
        // Elapsed time in 60Hz frame units: dt === 1 reproduces the old
        // per-frame behaviour exactly, so every tuned constant keeps its
        // meaning. Capped at 3 frames (~50ms).
        const dt = Math.min((now - lastFrame) / 16.667, 3);
        lastFrame = now;

        // 2. MediaPipe Analysis — throttled to ~30fps. Mouth direction doesn't
        // need 60, and detectForVideo with numFaces:2 is the battery hog.
        const video = videoRef.current;
        const faceLandmarker = faceLandmarkerRef.current;
        if (faceLandmarker && video && video.readyState >= 2 && now - lastDetect >= 33) {
          lastDetect = now;
          try {
            const results = faceLandmarker.detectForVideo(video, now);
            if (results.faceLandmarks && results.faceLandmarks.length > 0) {
              mouthXPositionsRef.current = results.faceLandmarks.map(landmarks => {
                return 1 - landmarks[13].x; // Mirroring
              });
            } else {
              mouthXPositionsRef.current = [];
            }
          } catch (e) {
            // A delegate that built but cannot run: drop face tracking, keep the mic.
            console.warn("MediaPipe detect failed, microphone only:", e);
            faceLandmarker.close();
            faceLandmarkerRef.current = null;
            mouthXPositionsRef.current = [];
            onModeChangeRef.current?.('face-lost');
          }
        }

        // Directional Constraints
        let activeMouths = mouthXPositionsRef.current;
        let isValidBlow = true;

        // Only a *detected* face pointing the wrong way invalidates a blow. With
        // no face data (keyboard mode, or tracking not up yet) the blow stays
        // valid and the allowedDirection fallback below drives it.
        if (activeMouths.length > 0) {
          if (allowedDirectionRef.current === 'left') {
            activeMouths = activeMouths.filter(x => x < 0.5);
            if (activeMouths.length === 0) isValidBlow = false;
          } else if (allowedDirectionRef.current === 'right') {
            activeMouths = activeMouths.filter(x => x >= 0.5);
            if (activeMouths.length === 0) isValidBlow = false;
          }
        }

        const currentMicThreshold = micThresholdOverrideRef.current ?? MIC_THRESHOLD;
        const micBlow = rms > currentMicThreshold && lowFreqAvg > LOW_FREQ_THRESHOLD;
        const isBlowing = canInteractRef.current && isValidBlow && (micBlow || isKeyBlowingRef.current);
        // Force scales with mic loudness; the keyboard uses a fixed synthetic level.
        const effectiveRms = micBlow ? rms : KEY_BLOW_RMS;

        if (isBlowing) {
          lastBlowTimeRef.current = now;
          isRecoveringRef.current = false;

          if (blowStartTimeRef.current === 0) blowStartTimeRef.current = now;
          if (onBlowSustainedRef.current && !hasTriggeredSustainedRef.current && (now - blowStartTimeRef.current > sustainedDurationMsRef.current)) {
            hasTriggeredSustainedRef.current = true;
            onBlowSustainedRef.current();
          }

          if (activeMouths.length > 0) {
            activeMouths.forEach(x => {
              if (x < 0.5) windFrontX_LTR += 180 * dt;
              else windFrontX_RTL -= 180 * dt;
            });
          } else {
            // Fallback if no face but blowing (e.g. camera covered)
            if (allowedDirectionRef.current === 'left') windFrontX_LTR += 180 * dt;
            else windFrontX_RTL -= 180 * dt;
          }
        } else {
          blowStartTimeRef.current = 0;
          windFrontX_LTR -= 200 * dt;
          windFrontX_RTL += 200 * dt;
        }

        windFrontX_LTR = Math.max(-500, Math.min(windFrontX_LTR, window.innerWidth + 500));
        windFrontX_RTL = Math.max(-500, Math.min(windFrontX_RTL, window.innerWidth + 500));

        const timeSinceLastBlow = now - lastBlowTimeRef.current;
        const shouldRecover = timeSinceLastBlow > RECOVERY_TIMEOUT_MS && !disableRecoveryRef.current;

        if (shouldRecover && !isRecoveringRef.current) {
          isRecoveringRef.current = true;
          nodesRef.current.forEach((state, el) => {
            state.vx = 0; state.vy = 0; state.vRot = 0;
            state.dx = 0; state.dy = 0; state.rot = 0;
            state.isRecovering = true;
            el.classList.add('physics-recover');
            el.style.transform = `translate(0px, 0px) rotate(0deg)`;
            el.style.opacity = '1';
          });
        }

        if (!isRecoveringRef.current) {
          // Use the *effective* threshold (mic override in tutorials), not the
          // constant — else an override below MIC_THRESHOLD yields a negative
          // forceBase and nothing moves. Clamp at 0 for safety.
          const forceBase = isBlowing ? Math.max(0, effectiveRms - currentMicThreshold) * WIND_FORCE_MULTIPLIER : 0;

          nodesRef.current.forEach((state, el) => {
            if (state.isRecovering) {
              el.classList.remove('physics-recover');
              state.isRecovering = false;
              state.launched = false;
            }

            if (reducedMotionRef.current) {
              if (forceBase > 0 && !state.launched) {
                const dirs = activeMouths.length > 0
                  ? activeMouths.map((x) => x < 0.5)
                  : [allowedDirectionRef.current === 'left'];
                for (const isLTR of dirs) {
                  const frontX = isLTR ? windFrontX_LTR : windFrontX_RTL;
                  if (isLTR ? state.originalX < frontX : state.originalX > frontX) {
                    settleOnce(el, state, isLTR ? 1 : -1);
                    break;
                  }
                }
              }
              return;
            }

            let ax = 0;
            let ay = 0;
            let aRot = 0;

            if (forceBase > 0) {
              if (activeMouths.length > 0) {
                activeMouths.forEach(mouthX => {
                  const isLTR = mouthX < 0.5;
                  const frontX = isLTR ? windFrontX_LTR : windFrontX_RTL;
                  const inRange = isLTR ? (state.originalX < frontX) : (state.originalX > frontX);

                  if (inRange) {
                    const dist = isLTR ? (frontX - state.originalX) : (state.originalX - frontX);
                    const distFactor = Math.max(0.1, dist / window.innerWidth);
                    const dir = isLTR ? 1 : -1;

                    ax += (dir * forceBase * distFactor) / state.mass;
                    ay -= (forceBase * 0.4 * distFactor) / state.mass * (Math.random() - 0.2);
                    aRot += (Math.random() - 0.5) * forceBase * 6 / state.mass;
                  }
                });
              } else {
                // Fallback
                const isLTR = allowedDirectionRef.current === 'left';
                const frontX = isLTR ? windFrontX_LTR : windFrontX_RTL;
                const inRange = isLTR ? (state.originalX < frontX) : (state.originalX > frontX);

                if (inRange) {
                  const dist = isLTR ? (frontX - state.originalX) : (state.originalX - frontX);
                  const distFactor = Math.max(0.1, dist / window.innerWidth);
                  const dir = isLTR ? 1 : -1;

                  ax += (dir * forceBase * distFactor) / state.mass;
                  ay -= (forceBase * 0.4 * distFactor) / state.mass;
                  aRot += (Math.random() - 0.5) * forceBase * 6 / state.mass;
                }
              }

              // Turbolenza incrociata
              if (activeMouths.some(x => x < 0.5) && activeMouths.some(x => x >= 0.5)) {
                 const midPoint = window.innerWidth / 2;
                 if (Math.abs(state.originalX - midPoint) < 250) {
                   ay += (Math.random() - 0.5) * forceBase * 1.5;
                 }
              }
            }

            // Velocity is in px per 60Hz frame. Acceleration integrates over
            // dt, drag compounds over dt (pow, not multiply — 0.96 twice is
            // not 0.96 once), and position integrates over dt.
            const drag = Math.pow(FRICTION_DRAG, dt);
            state.vx = (state.vx + ax * dt) * drag;
            state.vy = (state.vy + ay * dt) * drag;
            state.vRot = (state.vRot + aRot * dt) * drag;

            state.dx += state.vx * dt;
            state.dy += state.vy * dt;
            state.rot += state.vRot * dt;

            if (Math.abs(state.vx) > 0.05 || Math.abs(state.vy) > 0.05 || Math.abs(state.dx) > 0.5) {
              el.style.transform = `translate(${state.dx}px, ${state.dy}px) rotate(${state.rot}deg)`;
              const distTraveled = Math.sqrt(state.dx * state.dx + state.dy * state.dy);
              el.style.opacity = Math.max(0, 1 - distTraveled / 600).toFixed(3);
            }
          });
        }

        requestRef.current = requestAnimationFrame(physicsLoop);
    };

    physicsLoop();

    return () => {
      isMounted = false;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', releaseKey);
      window.removeEventListener('pointercancel', releaseKey);
      window.removeEventListener('blur', releaseKey);
      document.removeEventListener('visibilitychange', releaseKey);
      // Restore the console methods we patched to swallow MediaPipe noise.
      console.error = consoleOriginals.error;
      console.warn = consoleOriginals.warn;
      console.info = consoleOriginals.info;
      console.log = consoleOriginals.log;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [enabled]);

  return { registerNode, clearNodes, start };
}
