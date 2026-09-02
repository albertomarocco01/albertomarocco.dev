/**
 * Instagram's glyph — the rounded camera outline, lens and flash dot — drawn
 * inline so it inherits the link's colour and hover transition like any other
 * character in the mono strip. Stroke-only at 1.5 so it sits at the weight of
 * the JetBrains Mono beside it. Decorative: the link text carries the name.
 */
export function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className ? `ig-glyph ${className}` : "ig-glyph"}
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.2" />
      <circle cx="12" cy="12" r="4.3" />
      <circle cx="17.4" cy="6.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
