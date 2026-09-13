import { Mic, Camera, Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { TarassacoCopy } from '../copy';

export function GateScene({ copy, onStart }: { copy: TarassacoCopy; onStart: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    onStart();
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50 bg-black">
      <button type="button" onClick={handleClick} disabled={loading} className="tara-gate-btn">
        {loading ? (
          <>
            <span>{copy.initializing}</span>
            <Loader2 size={18} className="animate-spin" />
          </>
        ) : (
          <>
            <span>{copy.enable}</span>
            <span className="tara-gate-icons">
              <Mic size={18} />
              <Camera size={18} />
            </span>
          </>
        )}
      </button>

      {/* Consent / privacy notice. Even though processing is 100% local, EU/IT
          law expects an informed notice before activating camera + microphone. */}
      <p className="tara-privacy">{copy.privacy}</p>
    </div>
  );
}
