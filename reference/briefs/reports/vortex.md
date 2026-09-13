# Report — Image Vortex · `/graphic-designs/vortex`

The web port of the kiosk "Vortice di Immagini": 54 prints on four turning
rings; a card opens a carousel of eight, an image opens the gallery. Shipped
in round 1 (`8c3dc0d`, `src/components/vortex/**` with the route folder
`src/app/(immersive)/graphic-designs/vortex/`), moved to `/graphic-designs`
in round 2; in round 3 the chrome package moved its stylesheet out of
`globals.css` into `src/components/vortex/vortex.css` (`9021b23`), after which
the file belongs to this demo. No report was written before this one.

## Round 3 — the 2026-09-13 audit (package E)

Files under `src/components/vortex/**` and the route folder. Verified headless
on the dev server with `agent-browser` on the real GPU (integrated AMD,
`--use-angle=d3d11`), desktop 1440 × 900 and the iPhone 14 viewport. Console
clean on every run. Baseline `8896be7`.

### What changed — commit → items

| commit | items | what |
|---|---|---|
| `cdabc8c` | **E8** · B8, I18 · **E9** · B20, I16 · **E11** · I17, I22 | Escape, Backspace and ArrowLeft ignore `repeat` and Alt/Ctrl/Meta: a held Escape stepped gallery → carousel → idle → exit, Alt+← (browser back) stepped the demo. The WebGL probe is the shared `hasWebGL2()` (three r186 is WebGL2-only; the old probe accepted WebGL1 and sent such a browser to the generic error page) and releases its context. The no-WebGL / context-lost messages are `role="alert"`, mono register (`.vortex-fallback`), no "Inter". `vortex.css`: `.vortex-frame` sized in `100dvh` with `100vh` as fallback, `touch-action: pan-y pinch-zoom`, amber focus ring on exit/back instead of `outline: none`, 44 px targets on coarse pointers. One veil for every wait: the `dynamic()` chunk fallback shows the site's loading tag instead of a black div, and `VortexVeil` (replacing drei's `<Loader>`) lifts once the first ring has landed and never returns. On unmount the experience disposes every tracked texture and clears `useLoader`'s cache (`utils/textures.js`). The rewrite of `VortexExperience.jsx` had dropped A's `import "./vortex.css"` — restored in the same commit. |
| `5ef5c9c` | **E10** · S2, B24 | Every card is its own Suspense boundary, the first ring waits for the canvas's first frame, and each further ring mounts once the loader has gone quiet after the one before, on `requestIdleCallback`, fading in (`useRingStage`, read in the DOM root — a `useProgress` subscriber inside the r3f root was updated mid-render of a suspending card). Warm entry from the index: two tasks of 223 + 274 ms → five of 62–102 ms. `GalleryScene` reuses two module-level vectors per frame; the carousel's highlight and selector tweens and a card's hover tweens are killed on unmount. |
| `5792230` | **E11** · I3, I1, I5, I10 · item 12 · B3 | Exit "← exit the demo" / "← esci dalla demo" (was "✕"); `metaTitle` "Image Vortex" (the template adds the site name); the step-back label keeps "← vortex" in Italian too; straight apostrophe; `Locale` from `@/lib/locale`; `pageMetadata()` in `page.tsx` for an own Open Graph card. |

Also verified: `/graphic-designs` → card → vortex → exit ×3 leaves no
`.vortex-immersive`, no canvas of the demo; JS heap 31 → 33 MB across the
rounds (textures released on exit); from the gallery, Escape + five repeat
events → carousel only, Alt+← → nothing, ArrowLeft → vortex; iPhone 14 frame
390 × 520 centred; served head: `<title>Image Vortex — Alberto Marocco.dev</title>`,
own `og:*` and canonical; with `getContext("webgl2")` stubbed to null the stage
shows `copy.noWebgl` as a `role="alert"` with no canvas and the exit link still
there; with `--force-prefers-reduced-motion` the same key flow runs as cuts.

### What was left, and why

- **`100dvh` verified by reading**: headless Chrome has no dynamic toolbar, so
  the frame measures the same with `vh` and `dvh` here; the rule is the two
  line vh/dvh pair the brief asked for.
- **The veils keep inline styles** (`VEIL_STYLE` in `VortexVeil.jsx`): the
  chunk fallback renders before the chunk that carries `vortex.css`, so a class
  would not be styled yet. The no-WebGL message did move to a class.
- **`utils/reducedMotion.js` stays the local hook**: it initialises lazily
  from `matchMedia`, so the A5 concern (a first render in motion mode) does not
  apply; switching to `@/lib/use-reduced-motion` was not in the brief.
- **The "IMG #n" badge** in the gallery moved from 8 px "Inter" to 12 px
  `var(--mono)` while its font was being changed (I13 floor); nothing else of
  the gallery's HUD was touched.
- **Performance numbers are this machine's**, dev server (unminified three,
  React dev): the production build the director measured (647 ms) will land
  lower still. Long tasks were read with a `PerformanceObserver` installed on
  the index before the client navigation.

### New tunables

`utils/useOuterRings.js` — `useRingStage`: the idle timeout after the loader
goes quiet (`requestIdleCallback` timeout 900 ms; 250 ms `setTimeout` where
there is no idle callback). `components/VortexCard.jsx`: late cards fade in
over 0.9 s (a cut under reduced motion). `scene.config.js` is unchanged; the
rings mount in `rings.layers` order.

### How to test it in two minutes

1. Open `/graphic-designs/vortex`: the loading tag, then the inner ring, the
   other three arriving over the next second. `← esci dalla demo` top-left,
   "pick a card" bottom-centre.
2. **Enter** → the carousel; **Enter** → the gallery; hold **Escape** → the
   carousel, and only the carousel; **Alt+←** → nothing; **←** → the vortex.
3. Phone viewport: the ring fills the width in a 3:4 frame, centred; a swipe on
   the cards does not scroll the page, pinch still zooms.
4. Enter and exit three times from the index; the console stays clean and the
   heap comes back down.
5. Reduced motion: every choreography is a cut, the rings stand still.
