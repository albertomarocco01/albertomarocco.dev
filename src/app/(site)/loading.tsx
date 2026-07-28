/**
 * Every route here is dynamic — `getLocale()` reads a cookie in the root layout,
 * which opts the whole tree out of static rendering. Per the Next docs, a
 * dynamic route without `loading.tsx` is not prefetched at all: `<Link>` waits
 * for a full server response before anything moves. With this file present the
 * shared layout and this fallback are prefetched, so a click navigates
 * immediately and the page streams in behind it.
 *
 * Deliberately near-empty: the site chrome (topbar, field, grain) is in the
 * layout and stays put across the transition, so a skeleton here would flash
 * content that is about to be replaced.
 */
export default function SiteLoading() {
  return <div className="wrap" aria-busy="true" style={{ minHeight: "60vh" }} />;
}
