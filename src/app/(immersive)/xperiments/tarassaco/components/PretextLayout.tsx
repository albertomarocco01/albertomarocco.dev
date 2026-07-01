import { useEffect, useRef, useState, useMemo } from "react";

export const REVEAL_SPEED = 30; // ms per character

interface PretextLayoutProps {
  text: string;
  windowWidth: number;
  exclusionWidth?: number;
  exclusionHeight?: number;
  registerNode: (el: HTMLElement | null, x: number, y: number) => void;
  clearNodes: () => void;
  enableReveal?: boolean;
  revealMode?: 'ltr' | 'rtl';
  onRevealComplete?: () => void;
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
  registerNode, 
  clearNodes,
  enableReveal = false,
  revealMode = 'ltr',
  onRevealComplete
}: PretextLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<WordData[]>([]);
  const [containerHeight, setContainerHeight] = useState(0);
  const [revealedCharCount, setRevealedCharCount] = useState(0);
  const [isRevealDone, setIsRevealDone] = useState(false);

  const processedText = text; // Keep text normal

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
      
      ctx.font = '16px "Inter", sans-serif';
      
      const lineHeight = 32;
      let currentX = 0;
      let currentY = 0;
      let globalIndex = 0;

      const newNodes: WordData[] = [];

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const metrics = ctx.measureText(token);
        const wordWidth = metrics.width;

        // Dynamic Exclusion Zone
        let allowedWidth = currentY < exclusionHeight ? Math.max(200, width - exclusionWidth - 40) : width;

        if (currentX + wordWidth > allowedWidth && token.trim() !== "") {
          currentX = 0;
          currentY += lineHeight;
          allowedWidth = currentY < exclusionHeight ? Math.max(200, width - exclusionWidth - 40) : width;
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

    return () => observer.disconnect();
  }, [processedText, exclusionWidth, exclusionHeight, windowWidth]);

  // Typewriter effect
  useEffect(() => {
    if (!enableReveal) {
      setRevealedCharCount(processedText.length);
      setIsRevealDone(true);
      if (onRevealComplete) onRevealComplete();
      return;
    }

    setRevealedCharCount(0);
    setIsRevealDone(false);

    // Updater stays pure — advance one char, no-op at the end. Completion
    // side-effects (setIsRevealDone + onRevealComplete) live in the effect
    // below: firing a parent setState from inside a state updater runs during
    // render and warns "cannot update a component while rendering another".
    const interval = setInterval(() => {
      setRevealedCharCount(prev => (prev >= processedText.length ? prev : prev + 1));
    }, REVEAL_SPEED);

    return () => clearInterval(interval);
  }, [processedText, enableReveal, onRevealComplete]);

  // Fire completion once the reveal reaches the end — as an effect (post-commit),
  // not inside the updater. isRevealDone guards against re-firing.
  useEffect(() => {
    if (!enableReveal || isRevealDone) return;
    if (processedText.length > 0 && revealedCharCount >= processedText.length) {
      setIsRevealDone(true);
      if (onRevealComplete) onRevealComplete();
    }
  }, [enableReveal, isRevealDone, revealedCharCount, processedText, onRevealComplete]);

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
