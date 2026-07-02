import { useState, useEffect, useCallback, useRef } from 'react';
import { useWindPhysics } from './hooks/useWindPhysics';
import { GateScene } from './components/GateScene';
import { IntroScene } from './components/IntroScene';
import { WestScene } from './components/WestScene';
import { EastScene } from './components/EastScene';
import { DandelionScene } from './components/DandelionScene';

export const SCENE_TRANSITION_DELAY = 800; // Anti-skip cool-down

type Scene = '0-gate' | '1-intro' | '2-west' | '3-east' | '4-main';

export default function App() {
  const [scene, setScene] = useState<Scene>('0-gate');
  const [sensorsEnabled, setSensorsEnabled] = useState(false);
  const [canInteract, setCanInteract] = useState(false);
  const [sensorsError, setSensorsError] = useState<null | 'denied' | 'timeout'>(null);
  const [keyboardMode, setKeyboardMode] = useState(false);

  const handleSensorsReady = useCallback(() => {
    setScene('1-intro');
  }, []);

  const handleSensorsError = useCallback(
    (reason: 'denied' | 'timeout' | 'unsupported') => {
      setSensorsError(reason === 'timeout' ? 'timeout' : 'denied');
    },
    [],
  );

  // Fallback path: skip the sensors and drive the whole experience from the
  // keyboard (SPACE = blow). Dismisses the error and advances off the gate.
  const enterKeyboardMode = useCallback(() => {
    setKeyboardMode(true);
    setSensorsError(null);
    setScene((prev) => (prev === '0-gate' ? '1-intro' : prev));
  }, []);

  const handleBlowSustained = useCallback(() => {
    setScene(prev => {
      if (prev === '1-intro') return '2-west';
      if (prev === '2-west') return '3-east';
      if (prev === '3-east') return '4-main';
      return prev;
    });
  }, []);

  // Single owner for the anti-skip unlock timer. Cleared on every scene change
  // and on unmount, so a timer armed in scene A can't fire during scene B and
  // unlock it early (or setState after the demo is torn down).
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When scene changes, lock interaction and clear nodes
  useEffect(() => {
    setCanInteract(false);
    clearNodes();
    if (revealTimerRef.current) { clearTimeout(revealTimerRef.current); revealTimerRef.current = null; }

    // For scenes without a specific reveal callback (like main scene)
    if (scene === '4-main') {
      revealTimerRef.current = setTimeout(() => setCanInteract(true), SCENE_TRANSITION_DELAY);
    }
    return () => {
      if (revealTimerRef.current) { clearTimeout(revealTimerRef.current); revealTimerRef.current = null; }
    };
  }, [scene]);

  const handleRevealComplete = useCallback(() => {
    // Add anti-skip delay after the reveal animation finishes
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    revealTimerRef.current = setTimeout(() => setCanInteract(true), SCENE_TRANSITION_DELAY);
  }, []);

  // Determine physics constraints based on current scene
  const allowedDirection = scene === '2-west' ? 'left' : scene === '3-east' ? 'right' : 'both';
  const sustainedDurationMs = scene === '4-main' ? 9999999 : 150; // 150ms for instant cut after blow
  const disableRecovery = scene !== '4-main'; // Never recover in intro/tutorials
  const micThresholdOverride = (scene === '2-west' || scene === '3-east') ? 0.005 : undefined; // Super sensitive for tutorials

  // Sensors are hoisted to the root. They stay alive during the scene transition.
  const { registerNode, clearNodes } = useWindPhysics({
    enabled: sensorsEnabled,
    canInteract,
    onBlowSustained: handleBlowSustained,
    onSensorsReady: handleSensorsReady,
    onSensorsError: handleSensorsError,
    allowedDirection,
    sustainedDurationMs,
    disableRecovery,
    micThresholdOverride,
    sceneKey: scene
  });
  
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center overflow-hidden relative selection:bg-white selection:text-black">
      
      {scene === '0-gate' && <GateScene onStart={() => setSensorsEnabled(true)} />}
      
      {scene === '1-intro' && (
        <IntroScene registerNode={registerNode} clearNodes={clearNodes} onRevealComplete={handleRevealComplete} />
      )}

      {scene === '2-west' && (
        <WestScene registerNode={registerNode} clearNodes={clearNodes} windowWidth={windowWidth} onRevealComplete={handleRevealComplete} />
      )}

      {scene === '3-east' && (
        <EastScene registerNode={registerNode} clearNodes={clearNodes} windowWidth={windowWidth} onRevealComplete={handleRevealComplete} />
      )}

      {scene === '4-main' && (
        <DandelionScene
          windowWidth={windowWidth}
          registerNode={registerNode}
          clearNodes={clearNodes}
        />
      )}

      {/* Persistent demo chrome — painted above every scene (z-60). The exit
          mirrors the sibling Vortex demo (nothing else here lets you leave
          the experience). The title is a gate-only cover-label — it must not
          survive into the running demo, so it's gated to scene '0-gate'. */}
      <a href="/graphic-designs" className="tara-exit">← esci dalla demo</a>
      {scene === '0-gate' && (
        <div className="tara-title" aria-hidden="true">
          <span className="tara-title-main">Tarassaco</span>
          <span className="tara-title-sub">dandelion wind</span>
        </div>
      )}

      {/* Sensor failure: don't soft-lock on the gate — explain and offer the
          keyboard. Also the accessible path for anyone who can't blow. */}
      {sensorsError && (
        <div
          className="tara-error"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="tara-error-title"
        >
          <div className="tara-error-card">
            <p id="tara-error-title" className="tara-error-title">
              {sensorsError === 'timeout'
                ? 'I sensori non rispondono'
                : 'Fotocamera o microfono non disponibili'}
            </p>
            <p className="tara-error-body">
              Consenti fotocamera e microfono per soffiare davvero — oppure
              continua con la tastiera.
            </p>
            <button type="button" className="tara-error-btn" onClick={enterKeyboardMode}>
              Continua — premi SPAZIO per soffiare
            </button>
          </div>
        </div>
      )}

      {keyboardMode && scene !== '0-gate' && (
        <div className="tara-kbd-hint" aria-hidden="true">
          premi SPAZIO per soffiare
        </div>
      )}
    </div>
  );
}
