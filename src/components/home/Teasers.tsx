import Link from "next/link";
import type { CSSProperties } from "react";
import type { Dictionary } from "@/lib/i18n";
import { TeaserFX } from "./TeaserFX";

/**
 * The three section teasers — the right-hand column of the home page, inside the
 * same single viewport as the name (see the `.home` grid in globals.css). Static
 * server HTML, like the hero: the links are in the SSR markup and tabbable from
 * first paint, and the reveal (`.teaser.is-in`, driven by HomeSequence.tsx) only
 * ever animates opacity/filter/transform on markup that already exists. They sit
 * in normal flow, so composing them costs zero layout shift.
 */
const TEASERS = [
  { key: "websites", href: "/websites", idx: "01" },
  { key: "graphic", href: "/graphic-designs", idx: "02" },
  { key: "xperiments", href: "/xperiments", idx: "03" },
] as const;

export function Teasers({ home }: { home: Dictionary["home"] }) {
  return (
    <nav className="teasers" aria-label={home.aria}>
      {TEASERS.map((t, i) => (
        // `--i` phases the water drift (globals.css) — it inherits down to the
        // idx / label lines / cue, so each teaser floats offset from the next.
        <Link
          key={t.key}
          href={t.href}
          className="teaser"
          style={{ "--i": i } as CSSProperties}
        >
          <span className="teaser-idx">{t.idx}</span>
          {/* The rolling label: two stacked copies inside an overflow-clipped
              box; hover/focus rolls to the italic duplicate (CSS only, see
              `.teaser-roll`). The duplicate is aria-hidden, so the accessible
              name stays the single label. */}
          <span className="teaser-label">
            <span className="teaser-roll">
              <span className="teaser-line">{home.teasers[t.key]}</span>
              <span className="teaser-line teaser-line-alt" aria-hidden="true">
                {home.teasers[t.key]}
              </span>
            </span>
          </span>
          <span className="teaser-cue">
            {home.cue}
            <span className="arrow" aria-hidden="true">
              →
            </span>
          </span>
        </Link>
      ))}
      {/* Client half of the hover/focus effects: excites the bubble field
          near the hovered label. Renders nothing. */}
      <TeaserFX />
    </nav>
  );
}
