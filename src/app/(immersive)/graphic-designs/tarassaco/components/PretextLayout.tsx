import { useEffect, useRef, useState } from "react";

export const REVEAL_SPEED = 30; // ms per character

interface PretextLayoutProps {
  text: string;
  windowWidth: number;
  exclusionWidth?: number;
  exclusionHeight?: number;
  /** narrowest row allowed beside the exclusion zone before rows run under it */
  minTextWidth?: number;
  registerNode: (el: HTMLElement | null, x: number, y: number) => void;
  clearNodes: () => void;
  enableReveal?: boolean;
  revealMode?: 'ltr' | 'rtl';
  onRevealComplete?: () => void;
  /** prefers-reduced-motion: the text is whole at once, no typewriter */
  reducedMotion?: boolean;
}

interface WordData {
  id: string;
  word: string;
  x: number;
  y: number;
  startIndex: number;
  endIndex: number;
}

export function PretextLayout({ 
  text, 
  windowWidth, 
  exclusionWidth = 0, 
  exclusionHeight = 0, 
  minTextWidth = 200,
  registerNode,
  enableReveal: enableRevealProp = false,
  revealMode = 'ltr',
  onRevealComplete,
  reducedMotion = false,
}: PretextLayoutProps) {
  const enableReveal = enableRevealProp && !reducedMotion;
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<WordData[]>([]);
  const [containerHeight, setContainerHeight] = useState(0);

  const processedText = text; // Keep text normal

  // Typewriter progress, keyed by the text it counts: a text change reads as 0
  // on the very next render, with no reset effect, and the interval below just
  // starts counting for the new text. Completion is derived the same way.
  const [progress, setProgress] = useState({ text: '', count: 0 });
  const revealedCharCount = !enableReveal
    ? processedText.length
    : progress.text === processedText ? progress.count : 0;
  const isRevealDone =
    !enableReveal || (processedText.length > 0 && revealedCharCount >= processedText.length);

  // The core "Pretext" layout engine
  useEffect(() => {
    if (!containerRef.current || !processedText) return;

    const calculateLayout = () => {
      const container = containerRef.current;
      if (!container) return;

      const width = container.clientWidth;
      // Split by words and spaces to preserve exact formatting
      const tokens = processedText.split(/(\s+)/);
      
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Must mirror what the DOM actually renders, or the absolutely-positioned
      // words drift and overlap — so read the container's computed font, letter
      // spacing and line height instead of hard-coding them: the stylesheet
      // sets a smaller poem on phones and the face is the site's own serif
      // (a next/font variable, resolved here to its real family name). Canvas
      // measureText ignores letter-spacing, so it is added back per character,
      // after every character including the last. Fonts still loading measure
      // with the fallback face; `document.fonts.ready` below re-runs this.
      const cs = getComputedStyle(container);
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const fontSize = parseFloat(cs.fontSize) || 16;
      const LETTER_SPACING = parseFloat(cs.letterSpacing) || 0;

      const lineHeight = parseFloat(cs.lineHeight) || fontSize * 2;
      let currentX = 0;
      let currentY = 0;
      let globalIndex = 0;

      const newNodes: WordData[] = [];

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const metrics = ctx.measureText(token);
        const wordWidth = metrics.width + token.length * LETTER_SPACING;

        // Dynamic Exclusion Zone
        let allowedWidth = currentY < exclusionHeight ? Math.max(minTextWidth, width - exclusionWidth - 40) : width;

        if (currentX + wordWidth > allowedWidth && token.trim() !== "") {
          currentX = 0;
          currentY += lineHeight;
          allowedWidth = currentY < exclusionHeight ? Math.max(minTextWidth, width - exclusionWidth - 40) : width;
        }

        if (token.trim() !== "") {
          newNodes.push({
            id: `word-${i}`,
            word: token,
            x: currentX,
            y: currentY,
            startIndex: globalIndex,
            endIndex: globalIndex + token.length
          });
        }

        currentX += wordWidth;
        globalIndex += token.length;
      }

      setNodes(newNodes);
      setContainerHeight(currentY + lineHeight);
    };

    calculateLayout();
    const observer = new ResizeObserver(calculateLayout);
    observer.observe(containerRef.current);
    // The web font may land after the first measure; measuring with the
    // fallback face lays the words out for the wrong widths.
    let live = true;
    document.fonts?.ready.then(() => { if (live) calculateLayout(); });

    return () => { live = false; observer.disconnect(); };
  }, [processedText, exclusionWidth, exclusionHeight, minTextWidth, windowWidth]);

  // Typewriter effect. Updater stays pure — advance one char, no-op at the end.
  useEffect(() => {
    if (!enableReveal) return;
    const interval = setInterval(() => {
      setProgress(p => {
        const count = p.text === processedText ? p.count : 0;
        return count >= processedText.length ? p : { text: processedText, count: count + 1 };
      });
    }, REVEAL_SPEED);
    return () => clearInterval(interval);
  }, [processedText, enableReveal]);

  // Fire completion once the reveal reaches the end — as an effect (post-commit),
  // not inside the updater: firing a parent setState from inside a state updater
  // runs during render and warns "cannot update a component while rendering
  // another". Fires once per completion, since isRevealDone only flips once.
  useEffect(() => {
    if (isRevealDone && onRevealComplete) onRevealComplete();
  }, [isRevealDone, onRevealComplete]);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full glow-text text-base tracking-wide leading-loose"
      style={{ height: containerHeight > 0 ? containerHeight : 'auto' }}
    >
      {nodes.map((node) => {
        let visiblePart = "";
        
        if (revealMode === 'ltr') {
          const wordRevealCount = Math.max(0, Math.min(node.word.length, revealedCharCount - node.startIndex));
          visiblePart = node.word.slice(0, wordRevealCount);
        } else {
          // RTL / Reverse Mode: Reveal from the end of the text to the start
          // revealedCharCount is how many chars from the END are visible
          const threshold = processedText.length - revealedCharCount;
          
          if (node.endIndex <= threshold) {
            visiblePart = "";
          } else if (node.startIndex >= threshold) {
            visiblePart = node.word;
          } else {
            // Partial word reveal
            const visibleFrom = threshold - node.startIndex;
            visiblePart = node.word.slice(visibleFrom);
          }
        }
        
        if (!visiblePart) return null;

        return (
          <span
            key={node.id}
            ref={(el) => {
              // Only register for physics if the word is fully revealed
              if (el && containerRef.current && isRevealDone) {
                const containerRect = containerRef.current.getBoundingClientRect();
                registerNode(el, containerRect.left + node.x, containerRect.top + node.y);
              }
            }}
            style={{ 
              position: 'absolute', 
              top: `${node.y}px`, 
              left: `${node.x}px`, 
              display: 'inline-block',
              whiteSpace: 'pre',
              willChange: 'transform, opacity',
            }}
          >
            {visiblePart}
          </span>
        );
      })}
    </div>
  );
}
