import type { Metadata } from "next";

import { WorkRows } from "@/components/work/WorkRows";
import { Footer } from "@/components/Footer";
import { getDictionary, getLocale } from "@/lib/i18n";

// `generateMetadata` rather than a static object: the title and description come
// from the active dictionary, so they have to be resolved per request. The route
// is already dynamic (the root layout awaits `cookies()`).
export async function generateMetadata(): Promise<Metadata> {
  const { xperiments } = getDictionary(await getLocale());
  return {
    title: xperiments.metaTitle,
    description: xperiments.metaDescription,
    alternates: { canonical: "/xperiments" },
  };
}

// The generative work, on its own route. This index deliberately lives in the
// (site) group while its children — /xperiments/vortex, /xperiments/tarassaco —
// stay in (immersive): the rows here host the live WebGL aura, which needs the
// shared field canvas the site chrome mounts, while the demos need a bare
// viewport. Route groups don't affect URLs, and only pages resolving to the
// *same* path would collide, so the two halves of /xperiments/* coexist.
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
