import { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';

/**
 * How many rings (from the innermost) may be mounted right now. Starts at one;
 * every time the loading manager goes quiet — the previous ring's textures
 * have landed — the next ring follows on idle, so the commits (8, 12, 15, 19
 * cards: geometry, texture upload, first compile) land in separate tasks
 * instead of one. A short timeout covers a warm cache, where nothing ever
 * starts loading and `active` never flips.
 *
 * Call it from the DOM root (VortexScene), never inside the <Canvas>: the
 * manager fires onStart synchronously while a card's useLoader suspends, and a
 * subscriber in the r3f root would be updated mid-render of that card
 * ("Cannot update a component while rendering a different component").
 */
export function useRingStage(total) {
  const { active } = useProgress();
  const [stage, setStage] = useState(1);
  useEffect(() => {
    if (stage >= total || active) return;
    const go = () => setStage((s) => Math.min(total, s + 1));
    const ric = typeof window.requestIdleCallback === 'function';
    const id = ric ? window.requestIdleCallback(go, { timeout: 900 }) : setTimeout(go, 250);
    return () => (ric ? window.cancelIdleCallback(id) : clearTimeout(id));
  }, [active, stage, total]);
  return stage;
}
