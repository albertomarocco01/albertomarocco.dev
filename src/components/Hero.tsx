import { Fragment } from "react";
import type { Dictionary } from "@/lib/i18n";

// Static, server-rendered hero — zero 3D, the LCP-critical layer. Copy comes in
// as a prop so the component stays a server component (no client JS).
//
// The words are wrapped in spans *on the server*: the full text is in the SSR
// HTML, and the entrance (see HomeSequence + the `hero-in` rules in globals.css)
// only ever animates opacity/filter/transform on markup that already exists.
// Nothing is injected by JS, so SEO and LCP are untouched.
export function Hero({ hero }: { hero: Dictionary["hero"] }) {
  const lede = hero.lede.split(" ");
  return (
    <header className="hero">
      <p className="eyebrow">{hero.eyebrow}</p>
      <h1 className="name">
        <span className="nw">Alberto</span>
        <br />
        <span className="nw">
          Marocco<em>.</em>
        </span>
      </h1>
      {/* The spaces are real text nodes *between* the spans, not inside them:
          trailing whitespace inside an inline-block is trimmed, which would
          glue every word together. */}
      <p className="lede">
        {lede.map((word, i) => (
          <Fragment key={i}>
            {i > 0 ? " " : null}
            <span className="w">{word}</span>
          </Fragment>
        ))}
      </p>
    </header>
  );
}
