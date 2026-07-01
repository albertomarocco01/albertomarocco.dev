import { Mic, Camera, Loader2 } from 'lucide-react';
import { useState } from 'react';

export function GateScene({ onStart }: { onStart: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    onStart();
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50 bg-black">
      <button 
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-4 text-sm font-mono tracking-[0.5em] text-white glow-text uppercase border border-white/30 px-8 py-4 hover:bg-white hover:text-black transition-all disabled:opacity-50 disabled:cursor-wait"
      >
        {loading ? (
          <>
            <span>INITIALIZING</span>
            <Loader2 size={18} className="animate-spin" />
          </>
        ) : (
          <>
            <span>CLICK TO ENABLE</span>
            <div className="flex items-center gap-2">
              <Mic size={18} />
              <Camera size={18} />
            </div>
          </>
        )}
      </button>

      {/* Consent / privacy notice. Even though processing is 100% local, EU/IT
          law expects an informed notice before activating camera + microphone. */}
      <p
        style={{
          position: "absolute",
          bottom: "2rem",
          left: 0,
          right: 0,
          textAlign: "center",
          padding: "0 1.5rem",
          margin: 0,
          fontSize: "0.66rem",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.45)",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }}
      >
        Camera &amp; microphone are processed locally in your browser. Nothing is
        recorded, stored or sent anywhere.
      </p>
    </div>
  );
}
