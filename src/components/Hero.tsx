import { Fragment } from "react";
import type { Dictionary } from "@/lib/i18n";
import { NameMelt } from "@/components/canvas/NameMelt";

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
      {/* The inner span is the water-filter target (globals.css). It cannot go
          on the <p> itself: the entrance (`hero-reveal`, fill: both) animates
          `filter` there, which would both suppress a static url() filter and —
          with url() in the keyframes — turn the blur reveal into a discrete
          jump. The span is outside that animation, so the two never meet. */}
      <p className="eyebrow">
        <span>{hero.eyebrow}</span>
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
            {/* Per-word spans exist for the scrubbed compose (HomeSequence
                reveals them one by one). The water tremble no longer needs
                them: the displacement filter sits on the .lede block itself,
                one continuous noise field across the whole paragraph. */}
            <span className="w">{word}</span>
          </Fragment>
        ))}
      </p>
    </header>
  );
}
