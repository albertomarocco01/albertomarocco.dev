import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { getDictionary, getLocale } from "@/lib/i18n";

// `generateMetadata` rather than a static object: the title and description come
// from the active dictionary, so they have to be resolved per request. The route
// is already dynamic (the root layout awaits `cookies()`).
export async function generateMetadata(): Promise<Metadata> {
  const { gd } = getDictionary(await getLocale());
  return {
    title: gd.metaTitle,
    description: gd.metaDescription,
    alternates: { canonical: "/graphic-designs" },
  };
}

// The merge-designs index. Each entry opens a chrome-less immersive demo under
// /xperiments/*. Add to this list as new merged sets ship — the page scales.
// Structural only: the title/meta/description of each card live in the
// dictionary, keyed by `id` (dict.gd.demos), the same split as lib/work.ts.
const DEMOS = [
  {
    id: "vortex",
    href: "/xperiments/vortex",
    cover: "/vortex/images/img_001.webp",
  },
  {
    id: "tarassaco",
    href: "/xperiments/tarassaco",
    cover: "/tarassaco/cover.svg",
  },
];

export default async function GraphicDesigns() {
  const { gd } = getDictionary(await getLocale());
  return (
    <main className="gd">
      <Link href="/" className="gd-back">
        {gd.back}
      </Link>
      <header className="gd-head">
        <span className="sect-label">
          <span>{gd.label}</span>
        </span>
        <h1 className="gd-title">{gd.title}</h1>
        <p className="gd-lede">{gd.lede}</p>
      </header>
      <ul className="gd-demos">
        {DEMOS.map((d, i) => {
          const text = gd.demos[d.id];
          return (
            <li key={d.id}>
              <Link href={d.href} className="gd-demo">
                <span className="gd-demo-cover">
                  {/* Was a CSS background-image, so the 197KB source webp was
                      served untouched into a ~220px box. `sizes` lets the
                      optimizer pick a sensibly small variant; the SVG cover has
                      nothing to optimize and is passed through instead.
                      The first cover is above the fold and measures as the LCP
                      element, so it gets a preload link in <head>. `preload`, not
                      `priority` — the latter is deprecated as of Next 16. Only
                      the first: preloading both would compete for bandwidth with
                      the actual LCP. */}
                  <Image
                    src={d.cover}
                    alt=""
                    aria-hidden="true"
                    fill
                    sizes="(max-width: 720px) 40vw, 220px"
                    preload={i === 0}
                    unoptimized={d.cover.endsWith(".svg")}
                    style={{ objectFit: "cover" }}
                  />
                </span>
                <span className="gd-demo-body">
                  <span className="gd-demo-title">{text.title}</span>
                  <span className="gd-demo-meta">{text.meta}</span>
                  <span className="gd-demo-desc">{text.desc}</span>
                  <span className="gd-demo-cta">
                    {gd.cta}
                    <span className="arrow" aria-hidden="true">
                      →
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
