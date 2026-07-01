import { PretextLayout } from './PretextLayout';
import { GlowingDandelion } from './GlowingDandelion';

const POETIC_TEXT = `In the silent theater of the cosmos, the dandelion stands as a fragile monument to endurance. A delicate architecture of silver threads, it waits for the inevitable breath of change. It does not resist the gale; it embraces the fracture. Each seed, a microscopic vessel of potential, is tethered by the thinnest of margins, anticipating the moment of release. When the wind arrives, the structure shatters, not in defeat, but in a spectacular dispersal. The seeds scatter across the dark canvas, navigating chaotic currents, carrying the ghost of their origin to distant, unseen soils. This is the paradox of the dandelion: its destruction is its propagation. To blow upon it is not to end its life, but to begin a hundred others. The glow of its fragile crown is a beacon in the dark, a silent promise that even when torn apart, the pieces will find a place to root, to rise, and to bloom once more in the endless cycle of the wind.`;

interface DandelionSceneProps {
  windowWidth: number;
  registerNode: (el: HTMLElement | SVGElement | null, x: number, y: number) => void;
  clearNodes: () => void;
}

export function DandelionScene({ windowWidth, registerNode, clearNodes }: DandelionSceneProps) {
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
          <span className="tara-hint">blow</span>
        </div>

        {/* The Custom Pretext Engine */}
        <div className="w-full relative z-10">
          <PretextLayout 
            text={POETIC_TEXT} 
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
