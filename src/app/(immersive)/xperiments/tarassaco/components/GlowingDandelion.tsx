import { useEffect, useRef, useMemo } from 'react';

interface GlowingDandelionProps {
  registerNode: (el: HTMLElement | SVGElement | null, x: number, y: number) => void;
}

export function GlowingDandelion({ registerNode }: GlowingDandelionProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Elite "Ethereal" Architecture - More seeds, more organic
  const seeds = useMemo(() => {
    return Array.from({ length: 140 }).map((_, i) => {
      const angle = (i / 140) * Math.PI * 2 + (Math.random() * 0.1 - 0.05);
      const length = 60 + Math.random() * 70;
      const x2 = 200 + Math.cos(angle) * length;
      const y2 = 200 + Math.sin(angle) * length;
      
      return {
        id: `seed-${i}`,
        x1: 200,
        y1: 200,
        x2,
        y2,
        angle: (angle * 180) / Math.PI,
        opacity: 0.3 + Math.random() * 0.5,
      };
    });
  }, []);

  useEffect(() => {
    const registerAll = () => {
      if (svgRef.current) {
        const nodes = svgRef.current.querySelectorAll('.physics-node');
        nodes.forEach(node => {
          const rect = node.getBoundingClientRect();
          registerNode(node as SVGElement, rect.left, rect.top);
        });
      }
    };

    const timer = setTimeout(registerAll, 600);
    window.addEventListener('resize', registerAll);
    window.addEventListener('scroll', registerAll);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', registerAll);
      window.removeEventListener('scroll', registerAll);
    };
  }, [registerNode]);

  return (
    <div className="w-[450px] h-[450px] relative pointer-events-none select-none">
      <svg
        ref={svgRef}
        viewBox="0 0 400 400"
        className="w-full h-full overflow-visible"
      >
        <defs>
          <radialGradient id="coreGlow">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="rgba(255,255,255,0.8)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* The Stem - Elegant and curved */}
        <g style={{ transformOrigin: '200px 400px' }}>
          <path
            d="M 200 200 C 200 280 195 350 185 450"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </g>

        {/* The Core - Soft and luminous */}
        <g style={{ transformOrigin: '200px 200px' }}>
          <circle cx="200" cy="200" r="15" fill="url(#coreGlow)" opacity="0.6" />
          <circle cx="200" cy="200" r="5" fill="#ffffff" filter="url(#softGlow)" />
        </g>

        {/* The Ethereal Seeds */}
        {seeds.map((seed) => (
          <g 
            key={seed.id} 
            className="physics-node" 
            style={{ transformOrigin: '200px 200px', willChange: 'transform, opacity' }}
          >
            {/* Fine Thread */}
            <line
              x1={seed.x1}
              y1={seed.y1}
              x2={seed.x2}
              y2={seed.y2}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="0.5"
            />
            {/* Soft Crown - Multiple fine filaments */}
            <g transform={`translate(${seed.x2}, ${seed.y2}) rotate(${seed.angle})`} opacity={seed.opacity}>
              <path
                d="M -5 -3 L 0 0 M 5 -3 L 0 0 M -3 -5 L 0 0 M 3 -5 L 0 0 M 0 -7 L 0 0"
                stroke="white"
                strokeWidth="0.4"
                fill="none"
              />
              <circle r="0.8" fill="white" />
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}
