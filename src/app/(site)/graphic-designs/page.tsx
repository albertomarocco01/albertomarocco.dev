import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";

import { Footer } from "@/components/Footer";
import { getDictionary, getLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

// The covers are imported, not served from /public: a static import gives every
// file a content-hashed URL under /_next/static/media/, so the year-long
// `immutable` cache is safe (a re-shot cover is a new URL, not a stale hit —
// the three 2026 covers had been overwritten in place under that header) and
// next/image knows the intrinsic size. Re-shoot a cover: overwrite the file
// here, the hash does the rest. Vortex is an 800 × 1000 capture of the running
// piece, like the others (was img_001.webp cropped by object-fit).
import vortexCover from "@/assets/covers/vortex.webp";
import tarassacoCover from "@/assets/covers/tarassaco.svg";
import darkroomCover from "@/assets/covers/darkroom.webp";
import handsCover from "@/assets/covers/hands.webp";
import wallCover from "@/assets/covers/wall.webp";

// `generateMetadata` rather than a static object: the title and description come
// from the active dictionary, so they have to be resolved per request. The route
// is already dynamic (the root layout awaits `cookies()`).
export async function generateMetadata(): Promise<Metadata> {
  const { gd } = getDictionary(await getLocale());
  return pageMetadata({
    title: gd.metaTitle,
    description: gd.metaDescription,
    path: "/graphic-designs",
  });
}

// The merge-designs index. Each entry opens a chrome-less immersive demo under
// /graphic-designs/* — (immersive)/graphic-designs/<id>, beside this (site)
// page; see (site)/xperiments/page.tsx for why the two groups don't collide.
// Add to this list as new merged sets ship — the page scales.
// Structural only: the title/meta/description of each card live in the
// dictionary, keyed by `id` (dict.gd.demos), the same split as lib/work.ts.
const DEMOS: { id: string; href: string; cover: StaticImageData }[] = [
  { id: "vortex", href: "/graphic-designs/vortex", cover: vortexCover },
  { id: "tarassaco", href: "/graphic-designs/tarassaco", cover: tarassacoCover },
  // The three 2026 demos (briefs in reference/briefs/). Each owns its route
  // folder; the cover file lives in src/assets/covers/<id>.webp.
  { id: "darkroom", href: "/graphic-designs/darkroom", cover: darkroomCover },
  { id: "hands", href: "/graphic-designs/hands", cover: handsCover },
  { id: "wall", href: "/graphic-designs/wall", cover: wallCover },
];

// What the cover box really measures, per breakpoint (globals.css .gd-demo):
// under 560 px the card is one column and the cover spans it (viewport minus
// the wrap's and the card's padding — 88vw is the safe ceiling); up to 785 px
// the cover column is 28vw (clamp(120px, 28vw, 220px) hits 220 there); above,
// 220 px. The old "40vw" served 156 px into a 309-css-px box on a phone.
const COVER_SIZES = "(max-width: 560px) 88vw, (max-width: 785px) 28vw, 220px";

export default async function GraphicDesigns() {
  const dict = getDictionary(await getLocale());
  const { gd } = dict;
  return (
    <>
      <main className="gd">
        {/* No "← back": the topbar carries every route now, this one included. */}
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
                    {/* `sizes` lets the optimizer pick the variant the box really
                        needs (COVER_SIZES); the SVG cover has nothing to optimize
                        and is passed through instead. The first cover is above
                        the fold and measures as the LCP element, so it gets a
                        preload link in <head> (`preload`, not `priority` — the
                        latter is deprecated as of Next 16) and no `loading`; the
                        rest are lazy: the third card onward sits below a 900 px
                        fold and the browser's own distance threshold still
                        fetches the nearer ones before they scroll in. */}
                    <Image
                      src={d.cover}
                      alt=""
                      aria-hidden="true"
                      fill
                      sizes={COVER_SIZES}
                      preload={i === 0}
                      loading={i === 0 ? undefined : "lazy"}
                      unoptimized={d.cover.src.endsWith(".svg")}
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
      <Footer footer={dict.footer} />
    </>
  );
}
