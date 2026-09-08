# Merge demos — shared rules for the three build sessions

Three new demos are being built **in parallel**, each by its own Claude Code
session, in the **same working tree** (`C:\Users\Utente\Desktop\albertomarocco.dev`).
A fourth session — the **director**, `albertomarocco-dev-b1` in `ListAgents` —
owns every shared file, reviews the tree, runs the final build and commits.

| # | id | route | brief |
|---|----|-------|-------|
| 01 | `darkroom` | `/xperiments/darkroom` | `01-darkroom.md` |
| 02 | `hands` | `/xperiments/hands` | `02-hands.md` |
| 03 | `wall` | `/xperiments/wall` | `03-wall.md` |

Image Vortex and Tarassaco stay exactly as they are. When all three ship, the
"Merge — Graphic Designs" index holds five demos.

## 1. Ground truth — read before writing any code, in this order

1. `AGENTS.md`, then the Next 16 guides it points to under
   `node_modules/next/dist/docs/01-app/` — at minimum
   `02-guides/lazy-loading.md` (the `ssr: false` rule) and the metadata guide.
   This Next is not the one you know; heed deprecation notices.
2. `DECISIONS.md` — *Stack / versions*, *Art direction / type*, *Rendering
   architecture*, *Verification*, *Bundle / payload hygiene*.
3. `reference/albertomarocco-build-spec.md` — §3 non-negotiable principles, §5
   design tokens, §6 interaction spec.
4. The two shipped demos, as the pattern to copy rather than reinvent:
   - `src/app/(immersive)/xperiments/tarassaco/` — `page.tsx`, `client.tsx`,
     `copy.ts`, `App.tsx`, `components/GateScene.tsx`,
     `hooks/useWindPhysics.ts` (sensor gate inside the click, permission
     fallbacks, MediaPipe init + teardown, keyboard mode, console-noise filter).
   - `src/components/vortex/VortexExperience.jsx` and
     `components/VortexScene.jsx` (WebGL detection, `webglcontextlost`, DPR cap,
     exit link, deterministic keyboard flow).
   - `src/app/globals.css` — the `:root` tokens and `.vortex-immersive` /
     `.vortex-exit`.
5. Your own route folder, already scaffolded by the director:
   `src/app/(immersive)/xperiments/<id>/` — `page.tsx`, `client.tsx`,
   `copy.ts`, `App.tsx`, `<id>.css`. **Keep `page.tsx` and `client.tsx` as they
   are** (they *are* the convention). Replace `App.tsx`, grow `copy.ts` and
   `<id>.css`, add `components/`, `hooks/`, `<id>.config.ts` as you need.
6. The archive you are merging: `public/vortex/images/img_001…054.webp` — 54
   prints: black-and-white flash photography, collage with orange handwriting,
   portraits covered with tape. **Look at them** (Read the files) and choose
   your subset deliberately. Reference them in place
   (`/vortex/images/img_0NN.webp`); never copy them into your folder.

## 2. Ownership — a hard boundary

You may create or edit **only**:

- `src/app/(immersive)/xperiments/<id>/**`
- `public/<id>/**` (your cover and any small static asset you add)
- `reference/briefs/reports/<id>.md` (your final report)

You must **not** touch: `src/lib/**`, `src/components/**`, `src/app/globals.css`,
`src/app/(site)/**`, `src/app/layout.tsx`, `sitemap.ts`, `robots.ts`,
`next.config.ts`, `package.json` / `package-lock.json`, `DECISIONS.md`,
`README.md`, `AGENTS.md`, the other demos, `public/mediapipe/**`,
`public/vortex/**`.

The director has already added, for each demo: the `gd.demos.<id>` copy in
`src/lib/dictionary.ts` (EN + IT), the card on `/graphic-designs` (pointing at
`public/<id>/cover.webp`), the sitemap entry, and the `Permissions-Policy`
header where a sensor is needed. Importing from shared modules is fine
(`@/components/canvas/aura-material`, `@/lib/locale`, `@/lib/use-locale`, …).
**Never import `@/lib/dictionary` or `@/lib/i18n` from a client file** — the
copy comes down from `page.tsx` as a prop.

If you believe a shared file needs a change (a dependency, a header, a token,
a card text): do not make it. Send the director the exact request with
`SendMessage` (`to: albertomarocco-dev-b1`), including the proposed diff, and
continue with everything that does not depend on it. The other two sessions
are `albertomarocco-dev-*` too — you never need to talk to them.

## 3. No git

No `git add`, `commit`, `stash`, `checkout`, `restore` or `push`, ever. The
director reviews the whole tree and commits.

## 4. Dev server, build, typecheck, lint

- The user runs **one** `npm run dev` in a separate terminal:
  `http://localhost:3000`. **Never start another** — Next 16 holds a
  dev-server singleton lock and a second instance fights it. If it is not
  running, ask the user to start it. Turbopack HMR picks up your edits.
- **Do not run `npm run build`.** Three concurrent builds collide in `.next`;
  the director builds the final tree.
- Typecheck: `npx tsc --noEmit` (must be clean).
- Lint your own folder only: `npx eslint "src/app/(immersive)/xperiments/<id>"`
  — zero errors. Next 16's `react-hooks` compiler rules flag some imperative
  three.js patterns; prefer restructuring (refs, `useFrame`, module-scope
  helpers for DOM writes) over disabling. A per-line disable needs a one-line
  reason. `npm run lint` on the whole repo has ~33 pre-existing findings in the
  older demos; they are not yours to fix.

## 5. Conventions — copy the shipped demos

- **Files.** `page.tsx` (server: `generateMetadata` from copy, canonical) →
  `client.tsx` (`"use client"`, `next/dynamic` with `ssr: false`) → `App.tsx`
  (the experience) + `components/`, `hooks/`, `<id>.config.ts` (every tunable
  as a named constant, one file), `<id>.css` (scoped under the `.<id>` root
  class, restores `cursor: auto`). Nothing else at the route folder's top level.
- **Copy.** Every visitor-facing string lives in `copy.ts`, typed once, EN + IT
  with compiler-enforced parity. The piece's name is a title and stays as-is in
  both locales. HUD labels are lowercase mono, few words. The Italian must read
  as written by an Italian, not translated word by word.
- **Art direction.** Near-black (`#000` … `#0a0a0c`), off-white `--ink`
  `#c7c4bc`, `--ink-dim` `#85827b`, hairlines `rgba(199,196,188,.09)`, **one
  accent** — amber `rgba(176,120,70,.55)` — used with restraint. Fonts through
  the CSS variables the root layout sets: `var(--serif)` (Fraunces) for a
  title, `var(--mono)` (JetBrains Mono) for everything else. Slow, settling
  motion — `cubic-bezier(0.22, 1, 0.36, 1)`, long durations, no bounce. No
  award-site tropes, no stock imagery, no UI kit, no Tailwind. The demo must
  feel made by the same hand as the rest of the site.
- **Chrome.** Persistent exit link top-left — `← exit the demo` /
  `← esci dalla demo` — to `/graphic-designs` (the scaffolded `.<id>-exit`
  mirrors `.vortex-exit`). The title is a cover label for the idle/gate state
  only and must not survive into the running demo. An `aria-label` on the stage
  describing the interaction and the keys.
- **Fallbacks — all mandatory.** No WebGL → message + exit link.
  `webglcontextlost` → message + exit (see `VortexScene.jsx`).
  `prefers-reduced-motion` → no continuous animation, still fully usable.
  A keyboard-only path for everything. Touch works. A sensor denied, absent or
  timing out → pointer / keyboard mode; the gate is never a dead end.
- **Performance.** DPR ≤ 1.5. Render only while the tab is visible
  (`document.visibilityState`), pause every loop otherwise. Dispose every GPU
  resource on unmount: render targets, textures, geometries, materials,
  postprocessing composers, MediaPipe tasks, media tracks, rAF handles. No
  runtime network requests except files under `/public`; no drei helper that
  fetches from a CDN (no `<Environment preset>`, no remote GLTF, no
  `useTexture` of a URL outside `/public`). Import what you use, not whole
  libraries for one function.
- **Cover.** Replace `public/<id>/cover.webp` (a dark placeholder) with a real
  capture of the finished piece: 800 × 1000 px, 4:5, dark, under 120 KB. The
  card already points at that exact path — do not rename it.

## 6. Verification — definition of done

1. `npx tsc --noEmit` clean; `npx eslint "src/app/(immersive)/xperiments/<id>"`
   zero errors.
2. Manual test in Chrome at `http://localhost:3000/xperiments/<id>` on the real
   GPU (NVIDIA GTX 1660 SUPER): the happy path; the keyboard-only path; reduced
   motion (DevTools → Rendering → emulate `prefers-reduced-motion`); a phone
   viewport with touch emulation; exit and re-enter three times — watch the
   console and memory, nothing may leak; `/graphic-designs` → your card → the
   demo → exit → the index again.
3. Headless proof (valued; the director repeats it anyway): drive Chrome over
   CDP with a small Python 3.11 script, no dependencies. Launch
   `"C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new
   --enable-gpu --ignore-gpu-blocklist --use-angle=d3d11
   --remote-debugging-port=0 --remote-allow-origins=* --user-data-dir=<a unique
   temp dir>`; read the real port from `<user-data-dir>/DevToolsActivePort`;
   talk to `http://127.0.0.1:<port>/json` (**not** `localhost`, it resolves to
   `::1` here and hangs); navigate the page to `http://localhost:3000/...`
   (**not** `127.0.0.1` — Next refuses cross-origin dev chunks and `ssr:false`
   trees silently never mount); `Page.captureScreenshot`. Use a unique port
   and user-data-dir — the sibling sessions may be doing the same. Software
   WebGL (`--disable-gpu --use-gl=angle --use-angle=swiftshader
   --enable-unsafe-swiftshader`) exercises your no-GPU behaviour.
4. Write `reference/briefs/reports/<id>.md`: what was built; the file map;
   every tunable (name + file); known limits; how to test it in two minutes;
   anything the director must change in a shared file, as an exact diff.

## 7. The bar

The bar is the existing site. Before calling it done, open `/graphic-designs`,
click your card and ask: would a studio put this on its homepage? Is there a
single element that reads as "default"? Fix that first.
