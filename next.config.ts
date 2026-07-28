import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // The Tarassaco experiment needs camera + microphone. The browser default
        // Permissions-Policy must explicitly allow this origin (`(self)`), and we
        // scope the header to this route only so the rest of the site keeps the
        // default policy. Note: this header is served by the Next/Vercel server —
        // a separate static-export host (e.g. a plain .it host) would need the
        // same header set at the web-server/CDN level instead.
        source: "/xperiments/tarassaco",
        headers: [
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self)",
          },
        ],
      },
      // Content-addressed static payloads that never change without a rename:
      // the MediaPipe wasm + face model (~13MB) and the vortex image set (~3MB).
      // Without this they ship as `public, max-age=0` and get revalidated on
      // every visit to the two demos.
      {
        source: "/mediapipe/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/vortex/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
