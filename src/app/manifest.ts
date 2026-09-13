import type { MetadataRoute } from "next";

import { SITE_NAME } from "@/lib/seo";

// A web app manifest so an "add to home screen" gets the site's name, colours
// and mark instead of a screenshot and the URL. `display: browser` on purpose:
// this is a site, not an app — no standalone window, no offline claim. Static
// (no request-time API), so it is generated once at build; the description is
// in the site's default language.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Alberto Marocco",
    description:
      "Creative technologist & full-stack developer a Torino — interfacce web e visual generative in tempo reale.",
    lang: "it",
    start_url: "/",
    display: "browser",
    background_color: "#0a0a0c",
    theme_color: "#0a0a0c",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
