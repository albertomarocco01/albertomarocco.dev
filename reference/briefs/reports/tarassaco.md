# Report — Tarassaco · Dandelion Wind · `/graphic-designs/tarassaco`

Rounds 1 and 2 shipped the port (the Vite + Tailwind app rebuilt over a hand
written stylesheet scoped under `.tarassaco`, MediaPipe self-hosted, a `dt`
based physics loop, the keyboard fallback) and its move to
`/graphic-designs/tarassaco`; no report was written then — this file starts
at round 3.

## Round 3 — the 2026-09-13 audit (package E)

Files only under `src/app/(immersive)/graphic-designs/tarassaco/**`, plus
`package.json` / `package-lock.json` for one removed dependency (E5).
Verified headless on the dev server with `agent-browser`: real GPU flags for
the sensor path, a fake camera for face mode, `--force-prefers-reduced-motion`
for the still path, desktop 1440 × 900 and the iPhone 14 viewport (390 × 844,
dpr 3). Console clean on every run. Baseline `8896be7`.

### What changed — commit → items

| commit | items | what |
|---|---|---|
| `cfd8aa1` | C's move | MediaPipe wasm + model read from `/mediapipe/1.0.1/` (landed before the crash). |
| `e0e0e6c` | **E1** · B9, I20, I22 | The gate is never a dead end. The 9 s `SENSOR_TIMEOUT_MS` is armed by the click, not after `getUserMedia` resolves, so a prompt left open (Firefox, Safari) ends in the dialog. `start()` runs synchronously inside the click (`getUserMedia` and `AudioContext.resume()` in the gesture); the dialog offers *continua senza* (auto-focused) and *riprova*, and an attempt counter drops what a superseded attempt resolves late; a grant that arrives after the dialog still hands the wind to the sensors. Space is not `preventDefault`-ed while a control has focus, so the dialog's button activates on Space. `facingMode: "user"`. FaceLandmarker tries the GPU delegate, then CPU (`hasWebGL2()` picks); a `detect()` that throws drops to the microphone. Press-and-hold on the stage is the touch equivalent of holding Space (`touch-action: pinch-zoom`, no callout). A HUD line names what drives the wind (*fotocamera + microfono* / *fotocamera (cpu) + microfono* / *microfono* / *senza sensori*) and how to blow without sensors, by pointer type. |
| `322a7f6` | **E2** · B9 layout | The stage is `position: fixed; inset: 0; overflow: hidden` like the other four demos. Under 640 px the dandelion is 200 px and hangs 24 px off the column, the poem is 13 px / 1.7 and starts under the exit link, the tutorials' mini dandelion drops to the bottom centre. Every number the flower and the poem's exclusion zone share lives in `tarassaco.config.ts`; the exclusion height now includes the *soffia* hint (the first full-width row used to run through it). `PretextLayout` measures the container's computed font and re-measures on `document.fonts.ready`. |
| `d15b235` | **E3** · I17, I20 | `role="application"` + `aria-label` from `copy.aria`. A `contextLost` string: the one context this demo can lose is the face tracker's GPU delegate — when `detect()` throws the HUD's `aria-live` slot says *fotocamera persa — solo microfono*. Own reduced-motion path (snapshot hook from `@/lib`): intro bar full at once, tutorials whole at once, the wind settles each word and seed once (a 0.5 s transition 60 px downwind) instead of integrating it, the drift home is a cut, pulses and the gate spinner stop. |
| `5fd876a` | **E4** · I3, I22 (+ I14, I15 on this demo's controls) | The `.vortex-exit` idiom copied into `tarassaco.css`; the gate reads like Mani's (*attiva fotocamera e microfono*, *avvio in corso…*), lowercase mono, hairline; the consent line is `.tara-privacy` instead of sixteen inline style properties; dialog titles, hints and the cover's sub-line lowercase; body copy in the site serif at 300. `var(--serif)` / `var(--mono)` everywhere "Inter" and `ui-monospace` were. The four controls get the 2 px amber focus ring; the exit link grows to a 44 px target on coarse pointers. `Locale` from `@/lib/locale`. Cover title lifted to 7.5rem, clear of the three-line notice. |
| `52f663e` | **E5** · I22 | The three gate glyphs are inline SVGs (18 px, 2 px round strokes); `lucide-react` is gone from `package.json` and the lockfile — it was the site's only use. |
| `0e0f475` | **E6** · S12 | The seeds are particles on one 2D canvas covering the viewport (`WindParticle`: `set()` per frame, `ease()` for recovery and the still path); a word flies once, as one CSS transition, the moment the wind front reaches it (distance, lift, spin and duration from the blow's force over its mass); the front advances 90 px/frame so the launch reads as a sweep. Measured, iPhone viewport, 3 s of synthetic blowing in the poem: p95 frame time 33.3 → 17.0 ms, dropped frames 19 → 3 (the three at the launch), no long tasks; desktop the same. Seeds drawn in flight (508 → 82 painted pixels over 300 ms) and back after recovery. |
| `09b3618` | **E7** · I7, B24, B3 (item 12) | `pageMetadata()` in `page.tsx` (own og:title / og:url / og:description / canonical / Twitter card); `metaTitle` "Tarassaco · Dandelion Wind"; descriptions EN 158 / IT 154 characters (were 178 / 196); `IntroScene` clears its 50 ms measure timer on unmount. |

Also verified: `/graphic-designs` → card → demo → exit ×3 leaves no
`.tarassaco`, no `<video>`, no `loading` class on `<html>`; JS heap 21 → 25 MB
flat; the keyboard-only path walks gate → intro → west → east → poem.

### What was left, and why

- **No `noWebgl` message** — a deliberate exception to I17, decided by the
  director: this demo draws no WebGL of its own; `hasWebGL2()` only picks the
  MediaPipe delegate, and without WebGL2 the wind runs on the CPU delegate or
  the microphone. `copy.ts` carries no dead key for it.
- **The cover title stays bottom-centre** (I22 lists "title bottom-centre vs
  top" as drift). E4 did not ask to move it and the bottom seat is the piece's
  own cover — it sits above the consent notice; the top band already holds the
  exit link and, on phones, would hold the title of the running scene.
- **CPU delegate path** verified by reading, not in the browser: headless
  Chrome has WebGL2, so the GPU delegate always builds here.
- **Coarse-pointer rules** (44 px exit, the touch hint) verified by reading the
  stylesheet: the iPhone emulation has no touch media (`pointer: coarse` is
  false).
- **Short phones**: on a viewport under ~700 px tall the poem's tail clips
  under the HUD (`overflow: hidden`); the header, the flower and the first
  lines always show. Nothing scrolls, by design.
- **The words no longer accelerate for as long as you blow** — E6 asked for
  one transition per word; a loud blow flies farther and faster (force scales
  the flight), but the flight is decided when the front reaches the word.
- **Performance numbers are this machine's** (integrated AMD, dev server, the
  iPhone viewport at dpr 3), not an iPhone's; the director re-measures on the
  production build.

### New tunables

`tarassaco.config.ts` (new): `PHONE_MAX_WIDTH` 640 (keep equal to the
`max-width: 640px` block in `tarassaco.css`), `FLOWER_SIZE_DESKTOP` 450 /
`FLOWER_SIZE_PHONE` 200, `FLOWER_OFFSET_DESKTOP` {−96, −48} /
`FLOWER_OFFSET_PHONE` {−40, −24}, `EXCLUSION_PAD` 30, `HINT_CLEARANCE` 48,
`MIN_TEXT_WIDTH_DESKTOP` 200 / `MIN_TEXT_WIDTH_PHONE` 176.

`hooks/useWindPhysics.ts` (top block): `SENSOR_TIMEOUT_MS` 9000,
`REDUCED_SETTLE_PX` 60 / `REDUCED_SETTLE_MS` 500, `WIND_FRONT_SPEED` 90 px per
60 Hz frame (was a literal 180), `WORD_FLY_PX` 700, `WORD_FLY_MS` 1800,
`RECOVERY_SETTLE_MS` 3000 — keep equal to the 3 s of `.physics-recover` in
`tarassaco.css`, which drives the words' identical drift.

### How to test it in two minutes

1. Open `/graphic-designs/tarassaco`, deny the camera → the dialog; press
   **Space** → it activates *continua senza*; the intro bar fills; hold Space →
   the word flies, the west tutorial types itself; hold Space twice more → the
   poem. The HUD reads *senza sensori · tieni premuto spazio per soffiare*.
2. Reload, click the gate and leave the prompt unanswered → after 9 s the same
   dialog (*i sensori non rispondono*), *riprova* asks again.
3. Allow camera and microphone → the HUD says *microfono*, then *fotocamera +
   microfono* once the model is up; blow, or turn your head and blow.
4. iPhone viewport: nothing scrolls, the poem wraps the smaller flower, the
   hint reads *tieni il dito sullo schermo per soffiare*; press and hold → the
   wind.
5. Reduced motion: the bar is full at once, a press settles words and seeds in
   half a second, they cut back after two seconds of silence.
6. Escape, or the exit link, at any scene. Enter three times; the console
   stays clean.
