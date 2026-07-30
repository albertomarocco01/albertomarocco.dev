import { PretextLayout } from './PretextLayout';
import { GlowingDandelion } from './GlowingDandelion';
import type { TarassacoCopy } from '../copy';

interface DandelionSceneProps {
  copy: TarassacoCopy;
  windowWidth: number;
  registerNode: (el: HTMLElement | SVGElement | null, x: number, y: number) => void;
  clearNodes: () => void;
}

export function DandelionScene({ copy, windowWidth, registerNode, clearNodes }: DandelionSceneProps) {
  return (
    <div className="max-w-6xl w-full relative z-10 mt-12 px-8 md:px-16">
      {/* Header */}
      <div className="mb-16">
        <h1 className="text-sm font-mono tracking-[0.5em] text-gray-400 uppercase glow-text">
          Tarassaco Dandelion 
        </h1>
        <div className="h-[1px] w-24 bg-white/30 mt-4"></div>
      </div>

      {/* Main Layout Area */}
      <div className="relative w-full">
        
        {/* The Locked, Luminous Dandelion (Top Right) */}
        <div className="absolute top-0 right-0 z-20 pointer-events-none -mt-24 -mr-12 flex flex-col items-center gap-4">
          <GlowingDandelion registerNode={registerNode} />
          <span className="tara-hint">{copy.blow}</span>
        </div>

        {/* The Custom Pretext Engine */}
        <div className="w-full relative z-10">
          <PretextLayout 
            text={copy.poem}
            windowWidth={windowWidth}
            exclusionWidth={480} // Increased for the new dandelion
            exclusionHeight={450} // Increased for the new dandelion
            registerNode={registerNode}
            clearNodes={clearNodes}
          />
        </div>

      </div>
    </div>
  );
}
