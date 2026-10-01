/**
 * The streaming fallback between (site) routes. Every route is prerendered
 * (one copy per locale, served through src/proxy.ts), so `<Link>` usually has
 * the whole page prefetched and this never shows; it covers a click that beats
 * the prefetch, where the navigation moves at once and the page streams in
 * behind it. The Loader's navigation sweep holds on `aria-busy` below until the
 * real page has replaced it.
 *
 * Deliberately near-empty: the site chrome (topbar, field, grain) is in the
 * layout and stays put across the transition, so a skeleton here would flash
 * content that is about to be replaced.
 */
export default function SiteLoading() {
  return <div className="wrap" aria-busy="true" style={{ minHeight: "60vh" }} />;
}
