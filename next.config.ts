import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No `X-Powered-By: Next.js` on every response — a header nobody reads.
  poweredByHeader: false,
  // Pin the workspace root to this app. Left to inference, Turbopack walks up
  // looking for a lockfile and can adopt a stray one (an accidental
  // `npm install` in the user profile left a package-lock.json there), after
  // which server-external packages stop resolving — `next dev` died with
  // "Cannot find module '@vercel/analytics/next'" despite the package sitting
  // in this project's node_modules. Under `npm run …` the cwd is always this
  // app, so this pins the root regardless of what lives above it.
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        // The Tarassaco experiment needs camera + microphone. The browser default
        // Permissions-Policy must explicitly allow this origin (`(self)`), and we
        // scope the header to this route only so the rest of the site keeps the
        // default policy. Note: this header is served by the Next/Vercel server —
        // a separate static-export host (e.g. a plain .it host) would need the
        // same header set at the web-server/CDN level instead.
        source: "/graphic-designs/tarassaco",
        headers: [
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self)",
          },
        ],
      },
      {
        // Mani — Hands reads the webcam only (no microphone). Same scoping.
        source: "/graphic-designs/hands",
        headers: [{ key: "Permissions-Policy", value: "camera=(self)" }],
      },
      // Static payloads that never change without a rename (DECISIONS: "immutable
      // means renamed, never overwritten"): the MediaPipe wasm + models under a
      // folder named after the pinned @mediapipe/tasks-vision version (bump the
      // package → copy into a new folder), and the vortex image set. Without
      // this they ship as `public, max-age=0` and get revalidated on every visit.
      {
        source: "/mediapipe/:version(\\d+\\.\\d+\\.\\d+)/:path*",
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
      // The demo covers need no rule: they are static imports
      // (src/assets/covers → /_next/static/media/<hash>), which Next already
      // serves immutable under a content hash.
    ];
  },
  async redirects() {
    return [
      {
        // The five merge demos opened under /xperiments/<id> until round 2
        // (2026-09), which put them under the generative rows' route. They
        // belong to /graphic-designs; links already shared keep working. The
        // id list is explicit so /xperiments itself — still the rows — and
        // any future /xperiments/* page are left alone.
        source: "/xperiments/:id(vortex|tarassaco|darkroom|hands|wall)",
        destination: "/graphic-designs/:id",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
