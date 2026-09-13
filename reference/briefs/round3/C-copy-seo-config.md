# C — Copy, SEO, config, docs, covers

**Session `alberto-marocco-ce` · Opus 5 · effort high.** Read
`00-shared.md`, then `audit-2026-09-13.md`, then this file.

## Owns

- `src/lib/dictionary.ts`, `src/lib/i18n.ts`, `src/lib/locale.ts`,
  `src/lib/use-locale.ts`, `src/lib/boundary-copy.ts`, `src/lib/contact.ts`
- `src/app/layout.tsx`, `src/app/not-found.tsx` (new), `src/app/sitemap.ts`,
  `src/app/robots.ts`, `src/app/opengraph-image.tsx`, `src/app/icon.svg`,
  `src/app/apple-icon.*` (new), `src/app/manifest.ts` (new, optional)
- `src/app/(site)/graphic-designs/page.tsx`, `src/app/(site)/layout.tsx`
  (metadata only — A owns its providers markup; coordinate)
- `src/app/(immersive)/layout.tsx`, `src/app/(immersive)/graphic-designs/loading.tsx`,
  `src/app/(immersive)/graphic-designs/error.tsx`
- `next.config.ts`, `README.md`, `DECISIONS.md`, `reference/briefs/**` (docs only),
  `public/mediapipe/**`, `public/<id>/cover.webp` → `src/assets/covers/**`,
  `toretto-raw.png`, `.gitignore`, `eslint.config.mjs`, `tsconfig.json`
- `src/lib/seo.ts` (new) if you want a per-route metadata helper.

Not yours: demo `copy.ts` files (D/E/F fix their own strings — the audit
already lists them per demo), `globals.css` (send A), the demo hooks that
hold the MediaPipe path (see C2).

## Audit-verify first

`curl -sI` the covers, the wasm and a demo page against the dev server;
`npx next info`; open `/nonexistent` and share-preview a demo URL (read the
`og:*` tags in the served HTML with `curl`). Report to the director.

## Fix, in this order (each its own commit)

1. **C1 · B5** — P.IVA. We do not have the real number. Remove the
   placeholder from the rendered footer (keep the `footer.vat` key optional
   / empty so the layout is unchanged) and add a "NEED REAL VALUES" line in
   DECISIONS for Alberto. Never invent a number.
2. **C2 · B4, S6, S15** — content-addressed static payloads.
   - Covers: move `public/{darkroom,hands,wall}/cover.webp` to
     `src/assets/covers/<id>.webp` and import them in
     `(site)/graphic-designs/page.tsx` (static import → hashed filename,
     intrinsic size); do the same for the vortex cover (crop `img_001.webp`
     to 800×1000 offline into `src/assets/covers/vortex.webp` < 120 KB, or
     capture a real frame) and tarassaco (`public/tarassaco/cover.svg` →
     assets). Delete the three `/darkroom|hands|wall/:path*` header blocks.
     While there: **S7** fix `sizes` to the real card layout (full card
     width under 560 px, 28vw to 720, 220 px above) and make covers below
     the fold `loading="lazy"`. Ask A for CSS only if the card layout must
     change.
   - MediaPipe: move `public/mediapipe/{wasm,*.task}` under
     `public/mediapipe/1.0.1/` (the `@mediapipe/tasks-vision` version);
     `git mv` file by file (the dev server locks directories on Windows —
     see `git-mv` note in round2 reports). Delete the never-requested
     `vision_wasm_module_internal.{js,wasm}`. Header `source` →
     `/mediapipe/:version/:path*`. Then **immediately** `SendMessage` D
     (`alberto-marocco-7e`, `hands/hooks/useHandTracker.ts`) and E
     (`alberto-marocco-0f`, `tarassaco/hooks/useWindPhysics.ts:199`) the new
     base path — they change the constant in their own commit; until they
     do their demos 404 on the wasm, so do this move early.
   - Vortex images stay in place; write the rule in DECISIONS: "anything
     under an `immutable` header is renamed when it changes, never
     overwritten" and list the folders.
3. **C3 · B3** — per-route Open Graph. Every `page.tsx` (site and demo)
   must resolve `openGraph.title/description/url` and `twitter.*` to its
   own values. Cleanest: a `src/lib/seo.ts` `pageMetadata({title, description,
   path})` that returns `title`, `description`, `alternates.canonical`,
   `openGraph`, `twitter`; root layout keeps `metadataBase`, `siteName`,
   images. Demo `page.tsx` files are D/E/F's folders — send each of them the
   3-line change and let them commit it, or, if they are already done, do
   it yourself with a pathspec commit that names only those `page.tsx`
   files and say so.
4. **C4 · B2** — `src/app/not-found.tsx` in the site's voice: wordmark,
   "404 — questa pagina non esiste / this page does not exist" from a new
   dictionary key, a link home and one to `/graphic-designs`, locale from
   the cookie like the layout. Minimal chrome, no three. Send A the CSS
   (`.notfound` block) or reuse existing page classes.
5. **C5 · B14** — `viewport: { …, viewportFit: "cover" }` in
   `src/app/layout.tsx`; message A ("safe-area now live") when committed.
6. **C6 · I7, I8** — titles and descriptions. Title template stays; page
   titles lose their inner " — " where it would produce three segments
   (e.g. "Camera Oscura · Darkroom"), or the demos' `metaTitle` drops the
   subtitle: decide one rule, apply to the dictionary side, tell D/E/F the
   rule for their `copy.ts`. Descriptions ≤ 160 chars for the dictionary
   ones. Brand: one spelling — decide "Alberto Marocco.dev" (title) vs
   "albertomarocco.dev" (wordmark/footer/OG) and document which is used
   where. Domain in one constant (`src/lib/site.ts` or `seo.ts`) used by
   layout, sitemap, robots.
7. **C7 · I1, I2, I9, I10** — naming and dead keys in `dictionary.ts`:
   "Merge — Graphic Designs" everywhere (teaser included, or "Merge" alone
   on the home teaser if the em dash fights the serif — say which);
   "graphic designs" plural everywhere; IT "siti web" in nav? — keep "siti"
   short in the nav but make `work.sections.websites` match the h1 casing;
   IT "about" stays as a brand word only if you write that decision in
   DECISIONS, otherwise "chi sono"; delete the dead keys (and from the
   `Dictionary` type); "based in"/"dove", "en / it" order, duplicate
   description openings, JSON-LD bare email, `addressLocality` by locale.
8. **C8 · I25, I24, I27** — `sitemap.ts` `lastModified` from a per-route
   constant map (update on real changes) or `git log -1 --format=%cI` of the
   route folder at build; `manifest.ts` + `apple-icon.tsx` (ImageResponse
   from the same mark as `icon.svg`); drop the "webgpu" keyword; DECISIONS
   and README drift list in I24 (Next version, postprocessing used, field
   constants, no gate, P.IVA, handle, work rows, README tree/stack, providers
   location); `reference/briefs/00-shared-rules.md` gets a top note that
   routes moved (do not rewrite history in round-1 briefs); `git mv
   toretto-raw.png reference/` (or delete if `src/assets/work/toretto-blend.webp`
   is the only consumer — check git log for its origin).
9. **C9 · S14** — `opengraph-image.tsx`: load the fonts from the local
   `next/font` files or vendor a `.ttf` under `src/assets/fonts/` read with
   `fs`; no network at build. Same visual.
10. **C10 · I12, I26** — `loading.tsx`/`error.tsx` (immersive) read the
    locale from the cookie on the server (`loading.tsx` can be async) so
    there is no wrong-language flash; cookie gets `Secure` when
    `location.protocol === "https:"`; fix the Permissions-Policy comment
    (header is a no-op — keep or drop, say which); add
    `Referrer-Policy: strict-origin-when-cross-origin` and
    `X-Content-Type-Options: nosniff` in `headers()`; enable
    `images.formats: ["image/avif", "image/webp"]` only if build time stays
    reasonable (note it).
11. **C11 · I12 hreflang** — not fixable with a cookie locale; write the
    limitation in DECISIONS (crawlers index IT only) and stop there.

## Test in two minutes (put it in the report)

`curl -s <dev>/graphic-designs/hands | grep og:` shows the demo's own
title/url. `/nonexistent` renders the site 404 in the cookie's language.
Covers on `/graphic-designs` load from `/_next/static/media/…` with a hash;
phone viewport covers have natural width ≥ 2× the css box. Hands and
Tarassaco still load the wasm from the versioned path (after D/E commit).
`npx next build` is the director's — do not run it.

Report: `reference/briefs/round3/reports/C.md`.
