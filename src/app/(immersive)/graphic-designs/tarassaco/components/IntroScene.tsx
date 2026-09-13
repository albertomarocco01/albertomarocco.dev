import { useState, useEffect, useRef } from 'react';

interface IntroSceneProps {
  /** the word the bar resolves into once the fill completes */
  word: string;
  registerNode: (el: HTMLElement | null, x: number, y: number) => void;
  clearNodes: () => void;
  onRevealComplete: () => void;
  /** prefers-reduced-motion: the bar is full at once, no 2.5 s fill */
  reducedMotion?: boolean;
}

export function IntroScene({ word, registerNode, clearNodes, onRevealComplete, reducedMotion = false }: IntroSceneProps) {
  const [progress, setProgress] = useState(reducedMotion ? 100 : 0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 2; // 50 steps * 50ms = 2500ms (2.5 seconds)
      });
    }, 50);
    return () => clearInterval(interval);
  }, [reducedMotion]);

  useEffect(() => {
    if (progress !== 100) return;
    clearNodes();
    // Small delay to ensure React has rendered the final text before measuring.
    // Cleared on unmount (Escape during the intro) so it cannot register nodes
    // of a scene that is gone, or unlock the next one.
    const timer = setTimeout(() => {
      if (containerRef.current) {
        const spans = containerRef.current.querySelectorAll('span');
        spans.forEach(span => {
          const rect = span.getBoundingClientRect();
          registerNode(span, rect.left, rect.top);
        });
        onRevealComplete();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [progress, registerNode, clearNodes, onRevealComplete]);

  const filled = Math.floor(progress / 10);
  const empty = 10 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  
  const text = progress < 100 
    ? `[${bar}] ${progress}%` 
    : `[██████████] ${word}`;

  // Split text into words so they blow away individually
  const words = text.split(' ');

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black">
      <div ref={containerRef} className="text-xl md:text-2xl font-mono tracking-widest text-white glow-text flex gap-4">
        {words.map((word, i) => (
          <span key={i} className="inline-block will-change-transform whitespace-pre">
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}
