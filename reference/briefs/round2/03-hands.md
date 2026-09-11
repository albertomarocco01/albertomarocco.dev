# 03 — Mani · round 2

**Model: Fable 5.1 · effort xhigh.** After 01.
Folder: `src/app/(immersive)/graphic-designs/hands/` (or `…/xperiments/hands/`).
Read `02-hands.md`, `reports/hands.md`, then the whole folder —
`engine/world.ts` and `engine/hand.ts` are where the new behaviour lives;
`hooks/usePointerHands.ts`, `hooks/useKeyboardHands.ts`, `App.tsx`,
`copy.ts`, `hands.css`, `hands.config.ts` follow.

Alberto's verdict: hold / tear / push stay exactly as they are ("il resto mi
piace così"). Three additions, one explanation, and the audit.

## 0. Audit (00-shared.md)

Test with the real webcam if one is attached; otherwise the synthetic-hands
route in the report. Suspects: a reticle left lit after the camera stops; a
pinch that flickers at the threshold; the mouse hover reticle vanishing after
the first click; the legend timer surviving unmount.

## 1. Hover — the prints answer the hand and the mouse before anything is pressed

Today in pointer mode a hovering mouse moves the reticle and nothing else;
with the camera a hand near a print does nothing until it pinches. Wanted: a
print near the hand or the pointer answers — lifts, turns towards it, grows a
touch — so the visitor knows it can be taken.

- Implement **once** in `world.ts`, per present hand (camera or pointer — the
  `HandState` is the same object): for each whole body within `HOVER.radius`
  (≈ 1.6 × its half-diagonal) of the index tip, blend towards a target: z
  +0.25, scale ×1.05, a tilt of up to 5° towards the tip (the card faces the
  hand), drift damped ×0.5. Smooth falloff with distance, critically damped
  like the hold; releases when the hand leaves the radius. Held cards and
  halves are unaffected. No hover on touch (`lastDevice === "touch"`).
- Tunables in `hands.config.ts` under `HOVER`. Reduced motion: the lift
  only, no tilt.

## 2. Close the hand on a print → it opens

Alberto: "chiudendo la mano l'immagine si apre, le altre spariscono con un
bell'effetto, l'altra viene messa in primo piano con una didascalia casuale".

**Gesture** (`hand.ts`): a **fist** — the four fingers curled, each tip nearer
the wrist than its PIP (`d(tip, wrist) < d(pip, wrist) × 0.95`, the mirror of
`fingersOpen`), 4 consecutive detections to enter, 6 to leave, never within
`PUSH_MIN_PRESENCE_MS` of the hand appearing. While the fist holds, the pinch
detector is suppressed (a fist also brings thumb and index together) and a
push can never fire (its palm-open test is the inverse — keep it that way).
On fist-enter, the nearest whole body within `HOLD_RADIUS_FACTOR` ×
half-diagonal of the palm centre — or the body this hand is already holding
— is **opened**. Feedback: the reticle becomes a filled dot while the fist
holds. Verify the ratio and the frame counts on the real webcam; they are
the two knobs.

**Focus mode** (`world.ts`: `focus: Body | null`, events `opened` /
`closed`):
- the chosen print flies to the centre on the hold spring, rises to z ≈ 1.2,
  rotation → 0, aspect-fit to ~62 % of the viewport height as seen at that z
  (≤ 70 % of the width);
- the others leave with the effect: each drifts outward from the centre with
  a small spin while fading to 0 over ~700 ms, staggered by distance (nearest
  first); their physics pause; nothing is disposed;
- a caption fades in under the print ~500 ms after it settles: DOM, mono
  lowercase, `--ink-dim`, letter-spaced, one line, drawn at random from
  `copy.captions` — write ~14 new one-liners in the voice of the Vortex
  captions (`…/vortex/copy.ts`: "memory develops in the dark") but about
  hands, holding, closing; English in both locales, like the Vortex; never
  the same one twice in a row;
- while focused: hold / tear / push on other prints are off; the reticles and
  the hover on the focused print still work.

**Close it** — "dando una sorta di schiaffo": an open-palm sweep — the
existing push detector, any direction, with a lower speed threshold in focus
mode (`PUSH_SPEED × 0.75`) and no cooldown — sends the print off in the sweep
direction, fading over ~500 ms; the others come back where they were (fade in,
physics resume); the dismissed print rejoins the drift whole at a free spot
after ~1 s. Only the sweep closes it: nothing closes by accident.

**Pointer / touch / keyboard parity — all mandatory:**
- mouse: a click (press → release < 250 ms, < 6 px) on a print opens it;
  in focus, a quick flick anywhere (pointer speed over a threshold while
  pressed) or a double-click closes it;
- touch: a tap opens, a swipe closes;
- keyboard: Enter on the Tab-focused print opens it; **Escape closes the
  focus first — the second Escape exits the demo** (say so in `aria`);
  Backspace closes too;
- the live region: `print n of total · opened` / `closed` (`srOpened` /
  `srClosed` in `copy.ts`).

## 3. Explain it — the legend is not enough

The legend (`pinch to hold · two hands to tear · open palm to push`, 4 s) is
too brief for five gestures, and Alberto says the open gesture is not
understood. Wanted: after the gate, an **onboarding card** bottom-centre over
the dark pool — three lines max, mono, that stays until the first gesture
succeeds or 10 s, whichever first:

```
pinch a print to hold it · close your hand on it to open it
swipe your open hand to close it · two hands to tear · open palm to push
```
IT: `pizzica una stampa per tenerla · chiudi la mano su di essa per aprirla` /
`spazza con la mano aperta per chiuderla · due mani per strappare · palmo
aperto per spingere`. Pointer and touch get their own wording (`click to open
· flick to close`, `tap to open · swipe to close`). `?` re-shows it. The
first time a print opens, a contextual hint `swipe to close` / `spazza per
chiudere` shows for 3 s under the caption, once per session. Every string in
`copy.ts`, EN + IT; the legend still breaks only at its separators.

## 4. Keep

Hold, tear, push, the gate and its fallbacks, the reticles, the 14 prints.
The cover is re-captured in 07.

## Verify (add to the report)

Camera: hover → fist → open → caption → sweep → closed → prints back. Pointer:
hover, click, flick, double-click. Touch viewport: tap, swipe. Keyboard: Tab,
Enter, Escape twice. Reduced motion. Exit / re-enter ×3, camera light off,
no leaks. Confirm a fist never fires a push or a pinch, and a pinch never
opens.

## Commit

`feat(hands): hover, close-to-open with captions, sweep to close, onboarding`
— after the audit-fixes commit, if any.
