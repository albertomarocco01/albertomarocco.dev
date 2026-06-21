import { Fragment } from "react";

// Slow mono marquee carrying real info. Two identical halves so the
// -50% translate loops seamlessly. Pauses under reduced motion (CSS). Items
// come in as a prop (the active dictionary's ticker), keeping this a server
// component.
export function Ticker({ items }: { items: string[] }) {
  const half = items.flatMap((item) => [item, "·"]);
  const track = [...half, ...half];
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {track.map((item, i) => (
          <Fragment key={i}>
            <span>{item}</span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
