import { useState } from 'react';
import type { TarassacoCopy } from '../copy';

// The three gate glyphs, inline. They were lucide-react's Mic, Camera and
// LoaderCircle (18 px, 2 px round strokes, currentColor) — the only use of
// the library on the whole site, so the dependency went and the paths stayed.
const GLYPH = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

function MicGlyph() {
  return (
    <svg {...GLYPH}>
      <path d="M12 19v3" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <rect x="9" y="2" width="6" height="13" rx="3" />
    </svg>
  );
}

function CameraGlyph() {
  return (
    <svg {...GLYPH}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

function LoaderGlyph() {
  return (
    <svg {...GLYPH} className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

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
            <LoaderGlyph />
          </>
        ) : (
          <>
            <span>{copy.enable}</span>
            <span className="tara-gate-icons">
              <MicGlyph />
              <CameraGlyph />
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
