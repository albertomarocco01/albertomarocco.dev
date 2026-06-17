import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://albertomarocco.dev/sitemap.xml",
    host: "https://albertomarocco.dev",
  };
}
