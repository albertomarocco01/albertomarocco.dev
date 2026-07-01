import { useState, useCallback } from 'react';
import { MiniDandelion } from './MiniDandelion';
import { PretextLayout } from './PretextLayout';

interface EastSceneProps {
  registerNode: (el: HTMLElement | null, x: number, y: number) => void;
  clearNodes: () => void;
  windowWidth: number;
  onRevealComplete: () => void;
}

export function EastScene({ registerNode, clearNodes, windowWidth, onRevealComplete }: EastSceneProps) {
  const [showDandelion, setShowDandelion] = useState(false);
  const text = "The East Wind replies. A counter-breath from the horizon, restoring balance to the scattered light.";

  const handleRevealComplete = useCallback(() => {
    setShowDandelion(true);
    onRevealComplete();
  }, [onRevealComplete]);

  return (
    <div className="absolute inset-0 flex items-center justify-center z-40 bg-black">
      {/* Mini Dandelion on the RIGHT + directional blow hint - only after reveal */}
      <div className={`absolute right-8 md:right-16 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 transition-opacity duration-1000 ${showDandelion ? 'opacity-100' : 'opacity-0'}`}>
        <MiniDandelion />
        <span className="tara-hint">blow on the right →</span>
      </div>
      
      <div className="max-w-2xl w-full">
        <PretextLayout
          text={text}
          windowWidth={windowWidth}
          registerNode={registerNode}
          clearNodes={clearNodes}
          enableReveal={true}
          revealMode="rtl"
          onRevealComplete={handleRevealComplete}
        />
      </div>
    </div>
  );
}
