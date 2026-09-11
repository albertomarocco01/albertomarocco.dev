import Link from "next/link";
import type { Ref } from "react";
import { CONTACT } from "@/lib/contact";
import type { WallCopy } from "../copy";
import { TOUR } from "../wall.config";

const COUNT = TOUR.stations.length;
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The tour's card: one station at a time — a mono index, a serif title, two
 * or three mono lines on a soft dark pool, the pager under them, and on the
 * last station the call to commission a loop. Bottom-left over the spec line;
 * centred on a phone (wall.css).
 *
 * `station` is the card's content and `on` its visibility: App turns it off
 * the moment a step is taken (the old words fade out) and back on, with the
 * new station, once the camera has landed. The live region reads the station
 * out when it comes on. Focus lands on the card itself when the tour opens
 * (`tabIndex` −1), so the keys read in `aria` work from there.
 */
export function Tour({
  ref,
  copy,
  station,
  on,
  onNext,
  onBack,
  onClose,
}: {
  ref: Ref<HTMLElement>;
  copy: WallCopy;
  station: number;
  on: boolean;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const text = copy.tour.stations[TOUR.stations[station].id];
  const last = station === COUNT - 1;

  return (
    <section
      ref={ref}
      className={`wall-tour${on ? " is-on" : ""}`}
      tabIndex={-1}
      aria-label={copy.tour.aria}
    >
      <span className="wall-tour-index">
        {pad(station + 1)} / {pad(COUNT)}
      </span>
      <h2 className="wall-tour-title">{text.title}</h2>
      <p className="wall-tour-text">
        {text.lines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </p>
      {last && (
        <Link href={CONTACT.contactHref} className="wall-tour-cta">
          {copy.tour.cta}
        </Link>
      )}
      <div className="wall-tour-nav">
        {!last && (
          <button type="button" className="wall-key" onClick={onNext}>
            {copy.tour.next}
          </button>
        )}
        {station > 0 && (
          <button type="button" className="wall-key" onClick={onBack}>
            {copy.tour.back}
          </button>
        )}
        <button type="button" className="wall-key" onClick={onClose} aria-label={copy.tour.closeAria}>
          {copy.tour.close}
        </button>
      </div>
      <span className="wall-sr" aria-live="polite">
        {on ? `${copy.tour.station} ${station + 1} ${copy.tour.of} ${COUNT} · ${text.title}` : ""}
      </span>
    </section>
  );
}
