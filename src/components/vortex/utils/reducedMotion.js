import { useState, useEffect } from 'react';

/**
 * useReducedMotion — true when the OS "reduce motion" setting is on.
 * Lazy-initialised (no first-frame flash) and live (updates if toggled).
 */
export function useReducedMotion() {
  const [reduce, setReduce] = useState(
    () => typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduce(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  return reduce;
}
