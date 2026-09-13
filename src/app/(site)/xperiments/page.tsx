import type { Metadata } from "next";

import { WorkRows } from "@/components/work/WorkRows";
import { Footer } from "@/components/Footer";
import { getDictionary, getLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

// `generateMetadata` rather than a static object: the title and description come
// from the active dictionary, so they have to be resolved per request. The route
// is already dynamic (the root layout awaits `cookies()`). `pageMetadata` also
// writes the Open Graph / Twitter card, so a shared link previews this page and
// not the home (a page's `openGraph` replaces the layout's, it is not merged).
export async function generateMetadata(): Promise<Metadata> {
  const { xperiments } = getDictionary(await getLocale());
  return pageMetadata({
    title: xperiments.metaTitle,
    description: xperiments.metaDescription,
    path: "/xperiments",
  });
}

// The generative work, on its own route, in the (site) group: the rows here host
// the live WebGL aura, which needs the shared field canvas the site chrome
// mounts. The merge demos that used to hang below it moved in round 2 and now
// split the same way under /graphic-designs: the index in (site), the demos in
// (immersive)/graphic-designs/*, which need a bare viewport. Route groups don't
// affect URLs, and only pages resolving to the *same* path would collide, so
// the two halves coexist. Old /xperiments/<id> links redirect (next.config.ts).
export default async function Xperiments() {
  const dict = getDictionary(await getLocale());
  const { xperiments } = dict;
  return (
    <>
      <main className="page">
        {/* No mono section label above the title — it would repeat the <h1>. */}
        <header className="page-head">
          <h1 className="page-title">{xperiments.title}</h1>
          <p className="page-lede">{xperiments.lede}</p>
        </header>
        <WorkRows section="experiments" items={dict.work.items} />
      </main>
      <Footer footer={dict.footer} />
    </>
  );
}
