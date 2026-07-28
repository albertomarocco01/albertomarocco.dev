import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Merge — Graphic Designs",
  description:
    "Selected graphic work, merged into interactive demos. Open one to explore it in the browser.",
  alternates: { canonical: "/graphic-designs" },
};

// The merge-designs index. Each entry opens a chrome-less immersive demo under
// /xperiments/*. Add to this list as new merged sets ship — the page scales.
const DEMOS = [
  {
    id: "vortex",
    href: "/xperiments/vortex",
    title: "Image Vortex",
    meta: "interactive · webgl · 2026",
    desc: "A rotating vortex of graphic work. Pick a card, spin the carousel of selections, then open the scattered gallery.",
    cover: "/vortex/images/img_001.webp",
  },
  {
    id: "tarassaco",
    href: "/xperiments/tarassaco",
    title: "Tarassaco — Dandelion Wind",
    meta: "interactive · breath + face · 2026",
    desc: "Blow into your microphone and an editorial poem scatters like dandelion seeds — breath and face tracked live, entirely in your browser.",
    cover: "/tarassaco/cover.svg",
  },
];

export default function GraphicDesigns() {
  return (
    <main className="gd">
      <Link href="/" className="gd-back">
        ← back
      </Link>
      <header className="gd-head">
        <span className="sect-label">
          <span>graphic design</span>
        </span>
        <h1 className="gd-title">Merge — Graphic Designs</h1>
        <p className="gd-lede">
          Selected graphic work, merged into interactive demos. Open one to
          explore it.
        </p>
      </header>
      <ul className="gd-demos">
        {DEMOS.map((d, i) => (
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
                <span className="gd-demo-title">{d.title}</span>
                <span className="gd-demo-meta">{d.meta}</span>
                <span className="gd-demo-desc">{d.desc}</span>
                <span className="gd-demo-cta">
                  enter demo
                  <span className="arrow" aria-hidden="true">
                    →
                  </span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
