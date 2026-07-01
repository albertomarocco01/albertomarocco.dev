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

  // Scene Transition Refs
  const blowStartTimeRef = useRef<number>(0);
  const hasTriggeredSustainedRef = useRef<boolean>(false);
  
  const canInteractRef = useRef(canInteract);
  const onBlowSustainedRef = useRef(onBlowSustained);
  const onSensorsReadyRef = useRef(onSensorsReady);
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
        // pinned @mediapipe/tasks-vision@0.10.17 package + the float16 model).
        // No third-party CDN at runtime: kills the @latest version-drift trap
        // and the per-visit IP leak to jsdelivr/Google.
        const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/mediapipe/face_landmarker.task",
            delegate: "GPU"
          },
          outputFaceBlendshapes: false,
          runningMode: "VIDEO",
          numFaces: 2
        });
        faceLandmarkerRef.current = faceLandmarker;
        console.log("MediaPipe Face Landmarker Initialized");
      } catch (e) {
        console.error("MediaPipe Init Error:", e);
      }
    };

    const startSensors = async () => {
      try {
        // getUserMedia runs FIRST, directly off the gate click, so the permission
        // prompt opens inside the user-gesture window (iOS Safari is strict about
        // this). The ~3.6MB MediaPipe model loads in the background afterwards;
        // the physics loop guards on faceLandmarkerRef and runs mic-only until
        // detection is ready.
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { width: 640, height: 480 }
        });
        
        if (!isMounted) return;
        streamRef.current = stream;

        // Audio Setup
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        const timeDomainData = new Float32Array(analyser.fftSize);
        const freqData = new Uint8Array(analyser.frequencyBinCount);

        // Video Setup. Off-screen but renderable: iOS Safari refuses to decode/
        // play a display:none or zero-size <video>, which stalls onloadedmetadata
        // and freezes the gate forever. Keep it 1px and transparent instead.
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        video.style.cssText =
          'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;';
        document.body.appendChild(video);
        videoRef.current = video;
        
        // Ensure video starts and notify ready
        video.onloadedmetadata = () => {
          video.play().then(() => {
            if (onSensorsReadyRef.current) onSensorsReadyRef.current();
          }).catch(e => console.error("Video play error:", e));
        };

        const physicsLoop = () => {
          if (!isMounted) return;

          // 1. Audio Analysis
          analyser.getFloatTimeDomainData(timeDomainData);
          analyser.getByteFrequencyData(freqData);
          let sumSquares = 0;
          for (let i = 0; i < timeDomainData.length; i++) sumSquares += timeDomainData[i] * timeDomainData[i];
          const rms = Math.sqrt(sumSquares / timeDomainData.length);
          let lowFreqSum = 0;
          for (let i = 0; i < 15; i++) lowFreqSum += freqData[i];
          const lowFreqAvg = lowFreqSum / 15;

          const now = performance.now();
          
          // 2. MediaPipe Analysis
          if (faceLandmarkerRef.current && video.readyState >= 2) {
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
          
          if (allowedDirectionRef.current === 'left') {
            activeMouths = activeMouths.filter(x => x < 0.5);
            if (activeMouths.length === 0) isValidBlow = false;
          } else if (allowedDirectionRef.current === 'right') {
            activeMouths = activeMouths.filter(x => x >= 0.5);
            if (activeMouths.length === 0) isValidBlow = false;
          }

          const currentMicThreshold = micThresholdOverrideRef.current ?? MIC_THRESHOLD;
          const isBlowing = canInteractRef.current && rms > currentMicThreshold && lowFreqAvg > LOW_FREQ_THRESHOLD && isValidBlow;

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
                if (x < 0.5) windFrontX_LTR += 180; 
                else windFrontX_RTL -= 180;
              });
            } else {
              // Fallback if no face but blowing (e.g. camera covered)
              if (allowedDirectionRef.current === 'left') windFrontX_LTR += 180;
              else windFrontX_RTL -= 180;
            }
          } else {
            blowStartTimeRef.current = 0;
            windFrontX_LTR -= 200;
            windFrontX_RTL += 200;
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
            const forceBase = isBlowing ? (rms - MIC_THRESHOLD) * WIND_FORCE_MULTIPLIER : 0;

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

              state.vx = (state.vx + ax) * FRICTION_DRAG;
              state.vy = (state.vy + ay) * FRICTION_DRAG;
              state.vRot = (state.vRot + aRot) * FRICTION_DRAG;

              state.dx += state.vx;
              state.dy += state.vy;
              state.rot += state.vRot;

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

        // Load the face model in the background; mouth-direction detection
        // switches on once faceLandmarkerRef is set. Mic-only blow works meanwhile.
        initMediaPipe();
      } catch (err) {
        console.error("Sensor error:", err);
      }
    };

    startSensors();

    return () => {
      isMounted = false;
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
    };
  }, [enabled]);

  return { registerNode, clearNodes };
}
