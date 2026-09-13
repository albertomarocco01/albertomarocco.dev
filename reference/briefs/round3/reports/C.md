# Report — package C (copy, SEO, config, docs, covers) · round 3

Brief: `../C-copy-seo-config.md`. Audit ids from `../audit-2026-09-13.md`.
Baseline `8896be7`. Two sessions: the first did the audit-verify pass and C1,
C2 (MediaPipe), C3, C5 and left the docs half-updated when the machine ran
out of memory at ~18:54; the second (this report) verified and split that WIP,
then worked through the rest. Everything below is committed with a pathspec
limited to the files C owns; `tsc` clean and `eslint` zero on them at every
commit.

## What changed (commit → items)

| commit | items | what |
|---|---|---|
| `7dd55cf` | C1 · B5 | P.IVA placeholder gone from the footer; `footer.vat` optional, "NEED REAL VALUES" in DECISIONS. |
| `1e9125c` | C2 · S6, S15 | MediaPipe payloads under `public/mediapipe/1.0.1/`; never-requested `vision_wasm_module_internal.*` deleted; header on `/mediapipe/:version/:path*`. (D/E moved their constants: `5e84cb6`, `cfd8aa1`.) |
| `50d08f3`, `adce0ea` | C3 · B3 | `pageMetadata()` in `lib/seo.ts`; `/graphic-designs` and the wall page use it. B and D/E/F do the other pages. |
| `1e6aa7d` | C5 · B14 | `viewportFit: "cover"`. |
| `9f14f65` | C2 · B4, S7, S15 | Covers moved to `src/assets/covers/` as static imports (hashed URLs); vortex cover is a real 800 × 1000 capture (37 KB); `sizes` follows the card; lazy below the fold; three cover header blocks deleted from `next.config.ts`. |
| `70a3253` | C4 · B2 | `app/not-found.tsx` in the site's voice, EN + IT (`notFound` dictionary block), locale from the cookie, no three. |
| `96e343d` | C10 · I26 | `Referrer-Policy` + `X-Content-Type-Options` on every response; the no-op `Permissions-Policy` blocks removed (and why the inverse is impossible). |
| `85e3c1f` | C10 · I12, I22, I5 | Immersive `loading.tsx` is an async Server Component (right language from the first byte, still prefetched); both fallbacks use `var(--mono)`; straight apostrophe in the EN error copy. |
| `c193d38` | C9 · S14, I8 | OG image font vendored (`src/assets/fonts/fraunces-300-latin.ttf`, 25 KB) and read with `fs`; PNG pixel-identical (mean abs diff 0); alt uses `SITE_NAME`. |
| `b154d83` | C6, C7, C8 · I8, I11, I25 | Layout + robots read `SITE_URL`/`SITE_NAME` from `lib/seo.ts`; JSON-LD bare email + `addressLocality` by locale; "webgpu" keyword dropped. |
| `839308a` | C8 · I25 | `sitemap.ts` per-route `lastModified` table; `manifest.ts`; `apple-icon.tsx` (the `icon.svg` mark at 180 px). |
| `9419695` | C10 · I12 | `persistLocale()` in `lib/locale.ts` adds `Secure` on https (A wires the toggle to it — request below). |
| `4609b5c` | C8 · I27 | `toretto-raw.png` → `reference/WorkPhotos/`. |
| `663137d` | C6, C7 · I1, I2, I5, I7, I9, I10 | Title rule (`gd.metaTitle` "Merge · Graphic Designs"), "Merge — Graphic Designs" as the one name (teaser included), "graphic designs" plural, IT "chi sono", where/dove, `it / en` order, /about description rewritten, curly apostrophe fixed, nine dead keys deleted from both dictionaries and the type. |
| this commit | C8, C11 · I24, I12 | DECISIONS (drift fixed: Next 16.3, postprocessing in two demos, field constants, gate gone, Instagram handle, Studio — next, web rows, cue ownership; a "Round 3 — C" section with the brand rule, the title rule, the immutable rule + folder list, the hreflang limit, AVIF measurement, OG font recipe), README (stack, tree, before-launch; lucide dropped), this report. |

Verified in the browser (session `C-r3`, desktop 1440 × 900 and iPhone 14 390 × 844): the 404 in both layouts with a clean console; the home teaser "Merge — Graphic Designs" has no overflow in its one-line window at either width; the phone topbar with "chi sono" stays inside 390 px; `/graphic-designs` phone covers get the full 800 px source into a 309 css px box (2.6×), desktop gets the 256 w variant for a 218 px box; the vortex capture was taken with a real GPU (`--use-angle=d3d11`). Titles and `og:*` checked with `curl` in both locales; the prefetch payload (`RSC: 1` + `Next-Router-Prefetch: 1`) carries the localized loading word; the OG PNG before/after compared with sharp.

## Left, and why

- **C2 archive exceptions (I27, second half).** The `src/Merge Designs/` lines in `.gitignore`, `eslint.config.mjs`, `tsconfig.json` stay: the 64 MB untracked folder is on disk, the exclusions are what keep it out of the build, and moving a folder the dev server watches on Windows is a lock away from another crash. Documented in DECISIONS; move it by hand with the server down.
- **C3 other pages.** The four (site) pages are B's, the four remaining demo `page.tsx` are D/E/F's (the wall is done). Not touched, per the ownership rule.
- **C6 demo `metaTitle`s and descriptions** are in D/E/F's `copy.ts`; the rule is in DECISIONS.
- **C11 hreflang** — documented as a structural limit, not fixable with a cookie locale.
- **C10 AVIF** — measured and left off (larger output than WebP on these sources, 3–6× the encode time); numbers in DECISIONS.
- **C10 cookie `Secure`** — the helper is committed; the call site is `LocaleToggle.tsx` (A). Request below.
- **JetBrains Mono not vendored** — nothing renders it server-side; a font nobody reads is dead weight in git.
- **Second C run** — apply the DECISIONS entries and dictionary requests the other packages hand over; add the `.notfound` CSS once A lands it and remove the 404's inline `cursor` styles.

## Requests sent (to apply by their owners)

- **A** — `src/components/chrome/LocaleToggle.tsx`: replace the local `persistLocale` with `import { persistLocale } from "@/lib/locale"`. **A** — `globals.css`: a `.notfound` block (`cursor: auto` on the root, `cursor: pointer` and a ≥ 44 px hit area on its `.gd-back` links) so the inline styles in `not-found.tsx` can go.
- **B** — `src/lib/work.ts`: two comments point at dictionary keys that no longer exist (`dict.work.sections` at :39, `work.items["merge-graphic-designs"]` at :72).

## New tunables

- `COVER_SIZES` in `(site)/graphic-designs/page.tsx` — the `sizes` string; change it only with the `.gd-demo` grid.
- `ROUTES[].modified` in `app/sitemap.ts` — bump a route's date when it really changes.
- `src/assets/covers/<id>.webp` — overwrite to re-shoot a cover (800 × 1000, < 120 KB); the URL hash follows.
- `src/assets/fonts/fraunces-300-latin.ttf` — the OG image's glyph set; the re-subset recipe is in DECISIONS.

## Test in two minutes

1. `curl -s http://localhost:3000/graphic-designs | grep -o '<meta property="og:[a-z_:]*" content="[^"]*"'` — the index's own title (`Merge · Graphic Designs — Alberto Marocco.dev`) and url. Same on `/graphic-designs/wall`.
2. `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/nonexistent` → 404; open it in the browser: the site's 404 in the cookie's language (add `-b locale=en` to curl for the English one), wordmark, two links, footer.
3. `/graphic-designs`: every cover's `src` is `/_next/image?url=%2F_next%2Fstatic%2Fmedia%2F<name>.<hash>.webp…`; on the iPhone viewport `img.naturalWidth × density ≥ 2 × box` (the full 800 px source lands in a 309 px box).
4. `curl -sI http://localhost:3000/ | grep -i -E "referrer|x-content"` → both headers; `curl -sI http://localhost:3000/mediapipe/1.0.1/hand_landmarker.task` → `immutable`.
5. `curl -s http://localhost:3000/sitemap.xml` → ten URLs with per-route dates; `/manifest.webmanifest` → JSON; `/apple-icon` → 180 × 180 PNG; `/opengraph-image` → the card (no network at build: `src/assets/fonts/`).
6. Home in Italian: topbar reads `siti · graphic designs · xperiments · chi sono`; teaser reads `Merge — Graphic Designs` on one line at 390 px.
