export function MiniDandelion() {
  return (
    <div className="w-12 h-12 glow-svg animate-pulse opacity-70">
      <svg viewBox="0 0 400 400" className="w-full h-full overflow-visible">
        {/* Main Stem */}
        <path
          d="M 200 200 Q 195 300 180 400"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="4"
          fill="none"
        />
        
        {/* Core */}
        <circle
          cx="200"
          cy="200"
          r="12"
          fill="#ffffff"
        />

        {/* Seeds (Simplified for mini version) */}
        {Array.from({ length: 30 }).map((_, i) => {
          const angle = (i / 30) * Math.PI * 2;
          const length = 100;
          const x2 = 200 + Math.cos(angle) * length;
          const y2 = 200 + Math.sin(angle) * length;
          
          return (
            <g key={i}>
              <line x1="200" y1="200" x2={x2} y2={y2} stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
              <path 
                d={`M ${x2 - 5} ${y2 - 5} L ${x2 + 5} ${y2 + 5} M ${x2 - 5} ${y2 + 5} L ${x2 + 5} ${y2 - 5}`}
                stroke="#ffffff" 
                strokeWidth="3"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
