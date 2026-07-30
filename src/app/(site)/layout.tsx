import { AppProvider } from "@/components/providers/AppProvider";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { Glow } from "@/components/chrome/Glow";
import { Grain } from "@/components/chrome/Grain";
import { Cursor } from "@/components/chrome/Cursor";
import { Shell } from "@/components/chrome/Shell";
import { Loader } from "@/components/chrome/Loader";
import { FieldMount } from "@/components/canvas/FieldMount";
import { BubbleControls } from "@/components/canvas/BubbleControls";
import { getDictionary, getLocale } from "@/lib/i18n";

// The full site chrome — loading veil, custom cursor, Lenis smooth-scroll, the
// shared WebGL field, grain and the topbar shell — lives here, NOT in the root
// layout. That keeps it scoped to the main site (this route group) so immersive
// routes like (immersive)/xperiments/* can own the viewport without inheriting
// the cursor:none design system, Lenis (which would corrupt their absolute
// coordinate physics) or the field canvas. Route groups don't affect URLs.
export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  return (
    <>
      {/* No-JS fallback: without hydration the veil would never dissolve and
          the hero entrance would never be played, so hide the one and settle
          the other on its revealed state. */}
      <noscript>
        <style>{`.loader{display:none!important}.hero .eyebrow,.hero .name .nw,.hero .lede .w{opacity:1!important;filter:none!important;transform:none!important;animation:none!important}`}</style>
      </noscript>
      <AppProvider>
        <Glow />
        <FieldMount />
        <BubbleControls />
        <Loader tag={dict.loader.tag} />
        <SmoothScroll>
          <Shell dict={dict} locale={locale}>
            {children}
          </Shell>
        </SmoothScroll>
        <Grain />
        <Cursor />
      </AppProvider>
    </>
  );
}
