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
      <Footer footer={dict.footer} curtain />
      <HomeSequence />
    </>
  );
}
