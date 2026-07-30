import Link from "next/link";
import type { Dictionary } from "@/lib/i18n";

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
      {TEASERS.map((t) => (
        <Link key={t.key} href={t.href} className="teaser">
          <span className="teaser-idx">{t.idx}</span>
          <span className="teaser-label">{home.teasers[t.key]}</span>
          <span className="teaser-cue">
            {home.cue}
            <span className="arrow" aria-hidden="true">
              →
            </span>
          </span>
        </Link>
      ))}
    </nav>
  );
}
