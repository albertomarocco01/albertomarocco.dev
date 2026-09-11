import { useEffect, useRef, useCallback } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// === TWEAK PHYSICS & MIC HERE ===
// ⬇️ MODIFICA QUESTO VALORE PER LA SENSIBILITÀ DEL MICROFONO ⬇️
// Più è basso (es. 0.01), più è sensibile. Più è alto (es. 0.1), più devi soffiare forte.
export const MIC_THRESHOLD = 0.02;         
export const LOW_FREQ_THRESHOLD = 150;     // Minimum low-frequency energy to ignore sharp noises
export const WIND_FORCE_MULTIPLIER = 80.0; // Aumentato drasticamente per far volare via tutto velocemente
export const FRICTION_DRAG = 0.96;         // Leggermente aumentato per farli scivolare via più velocemente
export const RECOVERY_TIMEOUT_MS = 2000;   // Milliseconds of silence before fluid CSS recovery kicks in
// =================================

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
}

export interface WindPhysicsOptions {
  enabled: boolean;
  canInteract?: boolean;
  onBlowSustained?: () => void;
  onSensorsReady?: () => void;
  onSensorsError?: (reason: 'denied' | 'timeout' | 'unsupported') => void;
  allowedDirection?: 'left' | 'right' | 'both';
  sustainedDurationMs?: number;
  disableRecovery?: boolean;
  micThresholdOverride?: number;
  sceneKey?: string;
}

export function useWindPhysics({ 
  enabled, 
  canInteract = true,
  onBlowSustained,
  onSensorsReady,
  onSensorsError,
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
  const lastBlowTimeRef = useRef<number>(0);
  const isRecoveringRef = useRef<boolean>(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const mouthXPositionsRef = useRef<number[]>([]);
  const isKeyBlowingRef = useRef(false); // SPACE-held fallback / accessibility blow

  // Scene Transition Refs
  const blowStartTimeRef = useRef<number>(0);
  const hasTriggeredSustainedRef = useRef<boolean>(false);
  
  const canInteractRef = useRef(canInteract);
  const onBlowSustainedRef = useRef(onBlowSustained);
  const onSensorsReadyRef = useRef(onSensorsReady);
  const onSensorsErrorRef = useRef(onSensorsError);
  const allowedDirectionRef = useRef(allowedDirection);
  const sustainedDurationMsRef = useRef(sustainedDurationMs);
  const disableRecoveryRef = useRef(disableRecovery);
  const micThresholdOverrideRef = useRef(micThresholdOverride);

  useEffect(() => { canInteractRef.current = canInteract; }, [canInteract]);
  useEffect(() => { 
    onBlowSustainedRef.current = onBlowSustained; 
  }, [onBlowSustained]);

  useEffect(() => {
    hasTriggeredSustainedRef.current = false;
    blowStartTimeRef.current = 0;
  }, [sceneKey]);
  
  useEffect(() => { onSensorsReadyRef.current = onSensorsReady; }, [onSensorsReady]);
  useEffect(() => { onSensorsErrorRef.current = onSensorsError; }, [onSensorsError]);
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
        isRecovering: false
      });
    }
  }, []);

  const clearNodes = useCallback(() => {
    nodesRef.current.clear();
  }, []);

  useEffect(() => {
    if (!enabled) {
      isRecoveringRef.current = true;
      nodesRef.current.forEach((state, el) => {
        state.vx = 0; state.vy = 0; state.vRot = 0;
        state.dx = 0; state.dy = 0; state.rot = 0;
        state.isRecovering = true;
        el.classList.add('physics-recover');
        el.style.transform = `translate(0px, 0px) rotate(0deg)`;
        el.style.opacity = '1';
      });
      return;
    }

    let isMounted = true;
    let windFrontX_LTR = -300;
    let windFrontX_RTL = window.innerWidth + 300;

    // Keyboard fallback: hold SPACE to "blow". Works with no camera/mic at all
    // (permission denied, no device, insecure origin) and doubles as an
    // accessibility path for anyone who can't blow into the mic. Armed only
    // while the experience is enabled; the physics loop reads isKeyBlowingRef.
    isKeyBlowingRef.current = false;
    const isBlowKey = (e: KeyboardEvent) =>
      e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar';
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isBlowKey(e)) return;
      e.preventDefault(); // no page scroll, no re-firing the focused gate button
      isKeyBlowingRef.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (isBlowKey(e)) isKeyBlowingRef.current = false;
    };
    // keyup never fires if the window loses focus mid-press (alt-tab, a click
    // into devtools), which latched the blow on forever: endless wind and
    // scenes advancing by themselves. Release defensively on both signals.
    const releaseKey = () => {
      isKeyBlowingRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', releaseKey);
    document.addEventListener('visibilitychange', releaseKey);

    // The mic path derives force from RMS above threshold; a key press has none,
    // so give the keyboard a firm, steady synthetic level.
    const KEY_BLOW_RMS = MIC_THRESHOLD + 0.08;

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

    const initMediaPipe = async () => {
      try {
        // Self-hosted from /public/mediapipe (the wasm folder copied from the
        // pinned @mediapipe/tasks-vision@1.0.1 package + the float16 model).
        // No third-party CDN at runtime: kills the @latest version-drift trap
        // and the per-visit IP leak to jsdelivr/Google.
        const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
        if (!isMounted) return;
        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/mediapipe/face_landmarker.task",
            delegate: "GPU"
          },
          outputFaceBlendshapes: false,
          runningMode: "VIDEO",
          numFaces: 2
        });
        // Unmounted while the model loaded, or a prior instance is still around
        // (re-enable toggled) — close before storing so the WASM heap / GPU
        // delegate isn't orphaned and leaked.
        if (!isMounted) { faceLandmarker.close(); return; }
        faceLandmarkerRef.current?.close();
        faceLandmarkerRef.current = faceLandmarker;
        console.log("MediaPipe Face Landmarker Initialized");
      } catch (e) {
        console.error("MediaPipe Init Error:", e);
      }
    };

    // Audio/video handles at effect scope so the physics loop can read them
    // after the acquisition try/catch — they stay null in keyboard-only mode.
    let analyser: AnalyserNode | null = null;
    let timeDomainData: Float32Array<ArrayBuffer> | null = null;
    let freqData: Uint8Array<ArrayBuffer> | null = null;
    let video: HTMLVideoElement | null = null;
    let readyFired = false;
    let readyTimer: ReturnType<typeof setTimeout> | null = null;
    const markReady = () => {
      if (readyFired) return;
      readyFired = true;
      if (readyTimer) clearTimeout(readyTimer);
      if (onSensorsReadyRef.current) onSensorsReadyRef.current();
    };

    // Broadband blow is exactly what noiseSuppression / AGC / echoCancellation
    // strip out, so disable all three or the blow gets filtered before we hear it.
    const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    };

    const startSensors = async () => {
      // getUserMedia runs FIRST, directly off the gate click, so the permission
      // prompt opens inside the user-gesture window (iOS Safari is strict). Try
      // camera+mic, then fall back to mic-only (desktops with a mic but no camera
      // → NotFoundError on the combined request), then to keyboard-only — the
      // demo must never hard-lock on the gate.
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: AUDIO_CONSTRAINTS,
          video: { width: 640, height: 480 },
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS });
        } catch {
          stream = null;
        }
      }

      // Unmounted during the permission prompt: stop any granted tracks so the
      // recording indicator doesn't stay lit, then bail.
      if (!isMounted) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }

      if (!stream) {
        // No camera and no mic (denied / no device / insecure origin). Proceed in
        // keyboard-only mode: advance the gate AND surface a hint so SPACE drives
        // the wind — the experience never dead-ends on "INITIALIZING".
        if (onSensorsErrorRef.current) onSensorsErrorRef.current('denied');
        markReady();
      } else {
        streamRef.current = stream;

        // Audio Setup
        const audioContext = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        audioContextRef.current = audioContext;
        // iOS Safari / the autoplay policy start the context 'suspended' until a
        // gesture resumes it — without this rms stays 0 and no blow is ever
        // detected. The gate click is our gesture.
        if (audioContext.state === 'suspended') {
          try { await audioContext.resume(); } catch { /* best effort */ }
        }
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
        audioContext.createMediaStreamSource(stream).connect(analyser);
        timeDomainData = new Float32Array(analyser.fftSize);
        freqData = new Uint8Array(analyser.frequencyBinCount);

        if (stream.getVideoTracks().length > 0) {
          // Video Setup. Off-screen but renderable: iOS Safari refuses to decode/
          // play a display:none or zero-size <video>, which stalls
          // onloadedmetadata and freezes the gate. Keep it 1px + transparent.
          video = document.createElement('video');
          const v = video;
          v.srcObject = stream;
          v.autoplay = true;
          v.playsInline = true;
          v.muted = true;
          v.style.cssText =
            'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;';
          document.body.appendChild(v);
          videoRef.current = v;

          // Start playback, then notify ready — markReady on failure too, so a
          // play() rejection can't hang the gate.
          v.onloadedmetadata = () => {
            v.play().then(markReady).catch((e) => { console.error("Video play error:", e); markReady(); });
          };

          // Load the face model in the background; mouth-direction detection
          // switches on once faceLandmarkerRef is set. Mic-only blow works meanwhile.
          initMediaPipe();
        } else {
          // Mic-only (no camera): nothing to wait on, proceed immediately.
          markReady();
        }

        // Give up if the sensors never signal ready (camera busy, model stalled)
        // and offer the keyboard instead of hanging on the gate forever.
        readyTimer = setTimeout(() => {
          if (!readyFired) {
            if (onSensorsErrorRef.current) onSensorsErrorRef.current('timeout');
            markReady();
          }
        }, 9000);
      }

      // The physics loop runs regardless of acquisition: mic + face when we have
      // them, keyboard-only (SPACE) otherwise. Reads the effect-scoped analyser/
      // video handles, which stay null when acquisition failed.
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

          // 1. Audio Analysis (skipped in keyboard-only mode, where analyser is null)
          let rms = 0;
          let lowFreqAvg = 0;
          if (analyser && timeDomainData && freqData) {
            analyser.getFloatTimeDomainData(timeDomainData);
            analyser.getByteFrequencyData(freqData);
            let sumSquares = 0;
            for (let i = 0; i < timeDomainData.length; i++) sumSquares += timeDomainData[i] * timeDomainData[i];
            rms = Math.sqrt(sumSquares / timeDomainData.length);
            let lowFreqSum = 0;
            for (let i = 0; i < 15; i++) lowFreqSum += freqData[i];
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
          if (faceLandmarkerRef.current && video && video.readyState >= 2 && now - lastDetect >= 33) {
            lastDetect = now;
            const results = faceLandmarkerRef.current.detectForVideo(video, now);
            if (results.faceLandmarks && results.faceLandmarks.length > 0) {
              mouthXPositionsRef.current = results.faceLandmarks.map(landmarks => {
                return 1 - landmarks[13].x; // Mirroring
              });
            } else {
              mouthXPositionsRef.current = [];
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
    };

    startSensors();

    return () => {
      isMounted = false;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', releaseKey);
      document.removeEventListener('visibilitychange', releaseKey);
      if (readyTimer) clearTimeout(readyTimer);
      // Restore the console methods we patched to swallow MediaPipe noise.
      console.error = consoleOriginals.error;
      console.warn = consoleOriginals.warn;
      console.info = consoleOriginals.info;
      console.log = consoleOriginals.log;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(e => console.error("AudioContext close error:", e));
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.remove();
      }
      // Free the FaceLandmarker (WASM heap + GPU delegate) — never closed before,
      // so every unmount / re-enable leaked one.
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
        faceLandmarkerRef.current = null;
      }
    };
  }, [enabled]);

  return { registerNode, clearNodes };
}
