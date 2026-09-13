import { PretextLayout } from './PretextLayout';
import { GlowingDandelion } from './GlowingDandelion';
import { flowerLayout } from '../tarassaco.config';
import type { TarassacoCopy } from '../copy';

interface DandelionSceneProps {
  copy: TarassacoCopy;
  windowWidth: number;
  registerNode: (el: HTMLElement | SVGElement | null, x: number, y: number) => void;
  clearNodes: () => void;
}

export function DandelionScene({ copy, windowWidth, registerNode, clearNodes }: DandelionSceneProps) {
  // One set of numbers for the flower box, its overhang and the poem's
  // exclusion zone, so the two can never disagree (tarassaco.config.ts). On a
  // phone the flower shrinks and the poem wraps around a smaller corner:
  // everything shares the viewport, nothing scrolls.
  const flower = flowerLayout(windowWidth);

  return (
    <div className="tara-main max-w-6xl w-full relative z-10 px-8 md:px-16">
      {/* Header */}
      <div className="tara-main-head">
        <h1 className="text-sm font-mono tracking-[0.5em] text-gray-400 uppercase glow-text">
          Tarassaco Dandelion
        </h1>
        <div className="h-[1px] w-24 bg-white/30 mt-4"></div>
      </div>

      {/* Main Layout Area */}
      <div className="relative w-full">

        {/* The Locked, Luminous Dandelion (Top Right) */}
        <div
          className="absolute top-0 right-0 z-20 pointer-events-none flex flex-col items-center gap-4"
          style={{ marginTop: flower.offset.top, marginRight: flower.offset.right }}
        >
          <GlowingDandelion registerNode={registerNode} size={flower.size} />
          <span className="tara-hint">{copy.blow}</span>
        </div>

        {/* The Custom Pretext Engine */}
        <div className="w-full relative z-10">
          <PretextLayout
            text={copy.poem}
            windowWidth={windowWidth}
            exclusionWidth={flower.exclusionWidth}
            exclusionHeight={flower.exclusionHeight}
            minTextWidth={flower.minTextWidth}
            registerNode={registerNode}
            clearNodes={clearNodes}
          />
        </div>

      </div>
    </div>
  );
}
