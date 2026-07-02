import type { MetadataRoute } from "next";

const SITE = "https://albertomarocco.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: SITE, lastModified, changeFrequency: "monthly", priority: 1 },
    {
      url: `${SITE}/graphic-designs`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE}/xperiments/vortex`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${SITE}/xperiments/tarassaco`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.6,
    },
  ];
}
