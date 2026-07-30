import type { Metadata } from "next";

import { WorkRows } from "@/components/work/WorkRows";
import { Footer } from "@/components/Footer";
import { getDictionary, getLocale } from "@/lib/i18n";

// `generateMetadata` rather than a static object: the title and description come
// from the active dictionary, so they have to be resolved per request. The route
// is already dynamic (the root layout awaits `cookies()`).
export async function generateMetadata(): Promise<Metadata> {
  const { websites } = getDictionary(await getLocale());
  return {
    title: websites.metaTitle,
    description: websites.metaDescription,
    alternates: { canonical: "/websites" },
  };
}

// The websites section of the work, on its own route. It used to be the first
// block stacked under the hero; the home page is the opening alone now.
export default async function Websites() {
  const dict = getDictionary(await getLocale());
  const { websites } = dict;
  return (
    <>
      <main className="page">
        {/* No mono section label above the title: on this page it would repeat
            the <h1> verbatim. /graphic-designs keeps one because there the two
            say different things. */}
        <header className="page-head">
          <h1 className="page-title">{websites.title}</h1>
          <p className="page-lede">{websites.lede}</p>
        </header>
        <WorkRows section="websites" items={dict.work.items} />
      </main>
      <Footer footer={dict.footer} />
    </>
  );
}
