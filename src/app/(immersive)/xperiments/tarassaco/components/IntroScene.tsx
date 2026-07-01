import { useState, useEffect, useRef } from 'react';

interface IntroSceneProps {
  registerNode: (el: HTMLElement | null, x: number, y: number) => void;
  clearNodes: () => void;
  onRevealComplete: () => void;
}

export function IntroScene({ registerNode, clearNodes, onRevealComplete }: IntroSceneProps) {
  const [progress, setProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (progress === 100) {
      clearNodes();
      // Small delay to ensure React has rendered the final text before measuring
      setTimeout(() => {
        if (containerRef.current) {
          const spans = containerRef.current.querySelectorAll('span');
          spans.forEach(span => {
            const rect = span.getBoundingClientRect();
            registerNode(span, rect.left, rect.top);
          });
          onRevealComplete();
        }
      }, 50);
    }
  }, [progress, registerNode, clearNodes, onRevealComplete]);

  const filled = Math.floor(progress / 10);
  const empty = 10 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  
  const text = progress < 100 
    ? `[${bar}] ${progress}%` 
    : `[██████████] BLOW`;

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
