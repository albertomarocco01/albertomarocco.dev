import { Fragment } from "react";
import type { CSSProperties } from "react";
import type { Dictionary } from "@/lib/i18n";
import { NameMelt } from "@/components/canvas/NameMelt";

// Static, server-rendered hero — zero 3D, the LCP-critical layer. Copy comes in
// as a prop so the component stays a server component (no client JS).
//
// The words are wrapped in spans *on the server*: the full text is in the SSR
// HTML, and the entrance (see HomeSequence + the `hero-in` rules in globals.css)
// only ever animates opacity/filter/transform on markup that already exists.
// Nothing is injected by JS, so SEO and LCP are untouched.
//
// `--i` is the word's phase in the water drift (globals.css): a negative
// animation-delay per index makes the motion flow along the line instead of
// bobbing in lockstep.
const phase = (i: number) => ({ "--i": i }) as CSSProperties;

export function Hero({ hero }: { hero: Dictionary["hero"] }) {
  const eyebrow = hero.eyebrow.split(" ");
  const lede = hero.lede.split(" ");
  return (
    <header className="hero">
      {/* Per-word spans: the reveal (`hero-reveal`, fill: both) animates
          opacity/filter/transform on the <p> itself, the water drift animates
          transform on the words inside — the two never share a box. */}
      <p className="eyebrow">
        {eyebrow.map((word, i) => (
          <Fragment key={i}>
            {i > 0 ? " " : null}
            <span className="ew" style={phase(i)}>
              {word}
            </span>
          </Fragment>
        ))}
      </p>
      <h1 className="name">
        <span className="nw">Alberto</span>
        <br />
        <span className="nw">
          Marocco<em>.</em>
        </span>
        {/* Client overlay for the cursor liquid-melt. Renders nothing on the
            server and nothing at all until the shared field is ready, so the
            h1 above stays the untouched LCP element. */}
        <NameMelt />
      </h1>
      {/* The spaces are real text nodes *between* the spans, not inside them:
          trailing whitespace inside an inline-block is trimmed, which would
          glue every word together. */}
      <p className="lede">
        {lede.map((word, i) => (
          <Fragment key={i}>
            {i > 0 ? " " : null}
            {/* .w is the compose target (HomeSequence reveals them one by one,
                and its transition owns opacity/filter/transform); .wv inside
                carries the water drift, so the two never fight. */}
            <span className="w">
              <span className="wv" style={phase(i)}>
                {word}
              </span>
            </span>
          </Fragment>
        ))}
      </p>
    </header>
  );
}
