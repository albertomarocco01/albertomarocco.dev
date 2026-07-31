import Script from "next/script";
import { Hero } from "@/components/Hero";
import { Teasers } from "@/components/home/Teasers";
import { HomeSequence } from "@/components/home/HomeSequence";
import { Footer } from "@/components/Footer";
import { getDictionary, getLocale } from "@/lib/i18n";

// The home page is the first impact and nothing else, and it is exactly one
// viewport: the name on the left, the three section teasers on the right, the
// footer waiting as a curtain below the bottom edge. Nothing stacks below the
// fold because there is no fold — the page never scrolls, and consumed scroll
// intent drives the whole sequence instead (HomeSequence.tsx). Everything that
// used to live here has its own route: /websites, /graphic-designs,
// /xperiments, /about.
export default async function Home() {
  const dict = getDictionary(await getLocale());
  return (
    <>
      {/* Old bookmarks and shared links — `/#work`, `/#about` — used to be
          sections of this page and are routes of their own now. A fragment never
          reaches the server, so no `next.config` redirect can catch them: it has
          to be done in the browser. Deliberately an inline script rather than an
          effect, so it runs while the document is still parsing — before React
          loads, before the veil animates, and with no dependency on when the
          router becomes usable (a `router.replace()` from a mount effect turned
          out not to navigate here at all). `location.replace`, so the dead
          anchor doesn't end up in the back history. */}
      <Script
        id="hash-redirect"
        dangerouslySetInnerHTML={{
          __html:
            'var t={"#work":"/websites","#about":"/about"}[location.hash];if(t)location.replace(t);',
        }}
      />
      <main className="home">
        <Hero hero={dict.hero} />
        <Teasers home={dict.home} />
      </main>
      {/* The water: three SVG displacement filters, one per text scale, that
          globals.css applies to every home text (the "type reflected on still
          water" tremble). Three defs and not one because feDisplacementMap's
          `scale` is absolute px — the amplitude that reads as water on the
          display serif would chew the 11px mono to pieces, so each scale gets
          its own turbulence frequency and amplitude, tuned to its font size.
          The SMIL <animate> drifts the noise field at low Hz: no JS, no main
          thread, and a hidden tab paints nothing. Server-rendered so the
          filters exist before hydration; they cost nothing until a stylesheet
          rule actually references them (all applications are scoped to
          `html.home-live` + no-preference, so first paint and reduced motion
          never touch them). */}
      <svg className="water-defs" aria-hidden="true" focusable="false" width="0" height="0">
        <filter id="water-l" x="-15%" y="-40%" width="130%" height="180%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="1" seed="7">
            <animate
              attributeName="baseFrequency"
              values="0.012 0.02;0.017 0.027;0.012 0.02"
              dur="9s"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="2.6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="water-m" x="-15%" y="-25%" width="130%" height="150%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.032" numOctaves="1" seed="3">
            <animate
              attributeName="baseFrequency"
              values="0.02 0.032;0.027 0.041;0.02 0.032"
              dur="8s"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="1.7" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="water-s" x="-20%" y="-60%" width="140%" height="220%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.035 0.05" numOctaves="1" seed="11">
            <animate
              attributeName="baseFrequency"
              values="0.035 0.05;0.045 0.063;0.035 0.05"
              dur="7s"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="1.0" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <Footer footer={dict.footer} curtain />
      <HomeSequence />
    </>
  );
}
