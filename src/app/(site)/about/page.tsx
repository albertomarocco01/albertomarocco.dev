import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";

import { CONTACT } from "@/lib/contact";
import { InstagramGlyph } from "@/components/chrome/InstagramGlyph";
import { AboutFigure } from "@/components/about/AboutFigure";
import { AboutSequence } from "@/components/about/AboutSequence";
import { getDictionary, getLocale, type AboutPanelText } from "@/lib/i18n";
import laurea from "@/assets/about/laurea.webp";
import calisthenics from "@/assets/about/calisthenics.webp";

// `generateMetadata` rather than a static object: the title and description come
// from the active dictionary, so they have to be resolved per request. The route
// is already dynamic (the root layout awaits `cookies()`).
export async function generateMetadata(): Promise<Metadata> {
  const { about } = getDictionary(await getLocale());
  return {
    title: about.metaTitle,
    description: about.metaDescription,
    alternates: { canonical: "/about" },
  };
}

// `--i` staggers the copy reveal (globals.css): each line composes a beat after
// the one above it, in any panel.
const stagger = (i: number) => ({ "--i": i }) as CSSProperties;

const PANEL_IDS = ["01", "02", "03"] as const;

/** Eyebrow, headline (with its italic run) and body of one panel. */
function PanelCopy({
  text,
  as: Heading,
  id,
  children,
}: {
  text: Pick<AboutPanelText, "eyebrow" | "headline" | "body" | "meta">;
  as: "h1" | "h2";
  id: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="about-copy">
      <span className="about-eyebrow rv" style={stagger(0)}>
        {text.eyebrow}
      </span>
      <Heading id={id} className="about-headline rv" style={stagger(1)}>
        {text.headline.pre}
        <em>{text.headline.em}</em>
        {text.headline.post}
      </Heading>
      <p className="about-body rv" style={stagger(2)}>
        {text.body}
      </p>
      {text.meta && (
        <span className="about-meta rv" style={stagger(3)}>
          {text.meta}
        </span>
      )}
      {children}
    </div>
  );
}

// About, as three full-height panels the visitor steps through one gesture at
// a time (AboutSequence.tsx): the degree and the tech path beside the
// graduation cut-out; the calisthenics athlete + coach beside the competition
// cut-out (mirrored: figure left); then the contacts, every one of them in
// plain sight. No footer here — the contact panel *is* the page's close, and
// every other page's footer points at it (Footer.tsx). Both photos are painted
// by the shared WebGL field so its orbs pass in front of the person as well as
// behind (AboutFigure.tsx). Everything here is static server HTML: the driver
// only toggles classes.
export default async function About() {
  const dict = getDictionary(await getLocale());
  const { about, footer } = dict;
  const { path, discipline, contact } = about.panels;
  return (
    <>
      <main className="about-stage">
        <div className="about-track">
          {/* 01 — the degree + the tech path. `is-active` is the driver's; on
              a fresh load it lands once the veil lifts. */}
          <section className="about-panel" aria-labelledby="about-path">
            <div className="about-inner">
              <PanelCopy text={path} as="h1" id="about-path">
                {/* The panel says what the work is; these are the doors to it.
                    The topbar carries the same two routes, but a claim in the
                    copy should be checkable from where it is made. */}
                <div className="about-links rv" style={stagger(4)}>
                  <Link className="about-cta" href="/websites">
                    {path.links.websites}
                    <span className="arrow" aria-hidden="true">
                      →
                    </span>
                  </Link>
                  <Link className="about-cta" href="/xperiments">
                    {path.links.xperiments}
                    <span className="arrow" aria-hidden="true">
                      →
                    </span>
                  </Link>
                </div>
              </PanelCopy>
              <AboutFigure
                image={laurea}
                alt={path.figureAlt}
                bottom={0.08}
                preload
              />
            </div>
            <span className="about-cue rv" style={stagger(5)} aria-hidden="true">
              {about.scrollCue}
              <span className="arrow">↓</span>
            </span>
          </section>

          {/* 02 — the athlete and the coach. Mirrored: figure left, copy
              right, with what the coaching covers and a way down to the
              contacts. */}
          <section
            className="about-panel about-panel--mirror"
            aria-labelledby="about-discipline"
          >
            <div className="about-inner">
              <AboutFigure
                image={calisthenics}
                alt={discipline.figureAlt}
                bottom={0.3}
              />
              <PanelCopy text={discipline} as="h2" id="about-discipline">
                <div className="about-coaching rv" style={stagger(4)}>
                  <span className="a-label">{discipline.coachingLabel}</span>
                  <dl className="about-list">
                    {discipline.coaching.map((row) => (
                      <div className="about-list-row" key={row.term}>
                        <dt>{row.term}</dt>
                        <dd>{row.detail}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="about-links rv" style={stagger(5)}>
                  {/* A real anchor: the driver maps the hash to the third
                      panel (and pins the stage), the fallback document simply
                      jumps. */}
                  <a className="about-cta" href="#contact">
                    {discipline.cta}
                    <span className="arrow" aria-hidden="true">
                      →
                    </span>
                  </a>
                  {/* The team, off-site. */}
                  <a
                    className="about-cta about-cta--out"
                    href={CONTACT.baldisthenics}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {CONTACT.baldisthenicsLabel}
                    <span className="arrow" aria-hidden="true">
                      ↗
                    </span>
                  </a>
                </div>
              </PanelCopy>
            </div>
          </section>

          {/* 03 — the contacts. `id="contact"` is what the footer's link and
              the panel above point at; the driver reads the same hash. */}
          <section
            id="contact"
            className="about-panel about-panel--contact"
            aria-labelledby="about-contact"
          >
            <div className="about-inner">
              <PanelCopy text={contact} as="h2" id="about-contact" />
              <div className="contact-block">
                <ul className="contact-list">
                  <li className="contact-row rv" style={stagger(3)}>
                    <span className="contact-key">{contact.labels.email}</span>
                    <a className="contact-val" href={`mailto:${CONTACT.email}`}>
                      {CONTACT.email}
                    </a>
                  </li>
                  <li className="contact-row rv" style={stagger(4)}>
                    <span className="contact-key">{contact.labels.phone}</span>
                    <a
                      className="contact-val"
                      href={`tel:${CONTACT.tel}`}
                      aria-label={`${footer.phoneLabel} ${footer.phone}`}
                    >
                      {footer.phone}
                    </a>
                  </li>
                  <li className="contact-row rv" style={stagger(5)}>
                    <span className="contact-key">{contact.labels.instagram}</span>
                    <a
                      className="contact-val ig-link"
                      href={CONTACT.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {CONTACT.instagramHandle}
                      <InstagramGlyph />
                    </a>
                  </li>
                  <li className="contact-row rv" style={stagger(6)}>
                    <span className="contact-key">{contact.labels.where}</span>
                    <span className="contact-val contact-val--still">
                      {contact.where}
                    </span>
                  </li>
                </ul>
                <span className="about-meta rv" style={stagger(7)}>
                  {contact.note}
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* 01 / 02 / 03 — where you are, and a way to jump. Shown only while
            the driver owns the page (`html.about-live`). */}
        <nav className="about-pager" aria-label={about.pagerAria}>
          {PANEL_IDS.map((label, i) => (
            <button
              type="button"
              key={label}
              aria-current={i === 0 ? "true" : undefined}
            >
              {label}
            </button>
          ))}
        </nav>
        <AboutSequence />
      </main>
    </>
  );
}
