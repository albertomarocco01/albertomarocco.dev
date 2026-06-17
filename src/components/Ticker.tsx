import { Fragment } from "react";
import { TICKER_ITEMS } from "@/lib/work";

// Slow mono marquee carrying real info. Two identical halves so the
// -50% translate loops seamlessly. Pauses under reduced motion (CSS).
export function Ticker() {
  const half = TICKER_ITEMS.flatMap((item) => [item, "·"]);
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
