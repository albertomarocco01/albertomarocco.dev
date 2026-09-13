import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

type Entry = {
  path: string;
  /** ISO date of the last change to what the route shows — bump it by hand */
  modified: string;
  changeFrequency: "monthly" | "yearly";
  priority: number;
};

// `lastModified` per route, kept by hand: a `new Date()` at build stamped all
// ten URLs as changed on every deploy, which tells a crawler nothing. Bump a
// route's date when its content or behaviour really changes (a copy edit, a
// re-shot cover, a demo revision) — not for a chrome or dependency change that
// touches every page. Seeded from `git log -1` of each route's folder.
const ROUTES: Entry[] = [
  { path: "", modified: "2026-09-02", changeFrequency: "monthly", priority: 1 },
  { path: "/websites", modified: "2026-09-13", changeFrequency: "monthly", priority: 0.8 },
  { path: "/graphic-designs", modified: "2026-09-13", changeFrequency: "monthly", priority: 0.8 },
  { path: "/xperiments", modified: "2026-09-11", changeFrequency: "monthly", priority: 0.8 },
  { path: "/about", modified: "2026-09-02", changeFrequency: "yearly", priority: 0.7 },
  { path: "/graphic-designs/vortex", modified: "2026-09-11", changeFrequency: "yearly", priority: 0.6 },
  { path: "/graphic-designs/tarassaco", modified: "2026-09-13", changeFrequency: "yearly", priority: 0.6 },
  { path: "/graphic-designs/darkroom", modified: "2026-09-11", changeFrequency: "yearly", priority: 0.6 },
  { path: "/graphic-designs/hands", modified: "2026-09-13", changeFrequency: "yearly", priority: 0.6 },
  { path: "/graphic-designs/wall", modified: "2026-09-13", changeFrequency: "yearly", priority: 0.6 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map(({ path, modified, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(modified),
    changeFrequency,
    priority,
  }));
}
