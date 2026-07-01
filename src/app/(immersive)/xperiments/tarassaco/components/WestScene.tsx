import { useState, useCallback } from 'react';
import { MiniDandelion } from './MiniDandelion';
import { PretextLayout } from './PretextLayout';

interface WestSceneProps {
  registerNode: (el: HTMLElement | null, x: number, y: number) => void;
  clearNodes: () => void;
  windowWidth: number;
  onRevealComplete: () => void;
}

export function WestScene({ registerNode, clearNodes, windowWidth, onRevealComplete }: WestSceneProps) {
  const [showDandelion, setShowDandelion] = useState(false);
  const text = "The West Wind awakens. It sweeps across the void, pushing the dark towards the dawn.";

  const handleRevealComplete = useCallback(() => {
    setShowDandelion(true);
    onRevealComplete();
  }, [onRevealComplete]);

  return (
    <div className="absolute inset-0 flex items-center justify-center z-40 bg-black">
      {/* Mini Dandelion on the LEFT + directional blow hint - only after reveal */}
      <div className={`absolute left-8 md:left-16 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 transition-opacity duration-1000 ${showDandelion ? 'opacity-100' : 'opacity-0'}`}>
        <MiniDandelion />
        <span className="tara-hint">← blow on the left</span>
      </div>
      
      <div className="max-w-2xl w-full pl-32 md:pl-48">
        <PretextLayout 
          text={text}
          windowWidth={windowWidth}
          registerNode={registerNode}
          clearNodes={clearNodes}
          enableReveal={true}
          revealMode="ltr"
          onRevealComplete={handleRevealComplete}
        />
      </div>
    </div>
  );
}
