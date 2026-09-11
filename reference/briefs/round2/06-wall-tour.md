# 06 — Parete · round 2c: "what is a LED wall" — the guided tour

**Model: Fable 5.1 · effort high.** After 05.
Folder: the wall. Read the round-2 sections of `reports/wall.md`,
`components/CameraRig.tsx`, `App.tsx`, `components/Hud.tsx`, `copy.ts`,
`wall.css`. Also `src/lib/contact.ts` (`CONTACT.contactHref`) and the `/about`
copy in `src/lib/dictionary.ts` for Alberto's voice.

Alberto: a section that explains, quickly, what a LED wall is for whoever
does not know — "una sorta di pubblicità". Pressing a label somewhere in the
room, the camera goes there and walks you through what it is, how it works,
when and how it is used. Wording, order and staging are ours to decide.

## 1. The entry point

An in-scene mono label, billboarded, standing to the right of the wall at eye
height, ~1.5 m from its edge: `what is a led wall? →` / `cos'è un led wall? →`.
drei `<Html>` (self-contained, allowed) or a DOM element positioned from the
camera each frame — whichever stays crisp and clickable. `--ink-dim`, hover →
`--ink`, a real `<button>`; in the Tab order after the pager; key `i` too.
Hidden while the tour runs and while the camera is inside 1.5 m of the wall.

## 2. The tour

Six stations. Each = a camera pose (`setLookAt`, 1.4 s on the signature
ease; a cut under reduced motion) + a text card + optional staging. The card:
DOM, bottom-left above the spec line (centred on phones), serif title, two or
three mono lines in `--ink` on a soft dark pool; fades in 300 ms after the
camera settles; a mono pager `03 / 06` with `next →`, `← back`, `× close`.
Navigation: wheel or a vertical swipe → next / previous; `↓` `↑` `Space` →
next / previous; `Esc` closes the tour — **the second `Esc` exits the demo**
(say so in `aria`); `← →` keep switching the loop so the colours can be
tried mid-tour. The pager and the palette row stay; the idle drift is off
while touring. Add `flyTo(pose, animate)` to the rig; the tour state
(`tour: number | null`) lives in `App.tsx`.

Stations — staging first, then the content. The final copy is yours, EN + IT
in `copy.ts`; keep only figures you can defend and prefer a qualitative line
to a number you are not sure of.

1. **front, 7 m** — *What it is.* A wall built from LED cabinets; each
   cabinet a grid of lamps; one image across all of them; brighter than any
   projector, in daylight too.
2. **close, 0.9 m, lower-left** — *Pitch.* The distance between lamps, in
   millimetres — here 2.6. It sets how close you can stand before the image
   turns to dots: roughly the pitch, read in metres. Staging: a 2 s pulse of
   the dot contrast, or the wipe from 05.
3. **oblique, 4 m** — *Cabinets.* 500 mm modules, 12 × 6 here; any size,
   any shape — a corner, a column, a floor; assembled in hours; seams that
   vanish at distance.
4. **back, 5 m** — *Behind it.* Ground support, power and data daisy-chained,
   one processor fed by a laptop. Staging: the back light from 04 ×2 for
   this station only.
5. **wide, 12 m, a little high** — *Where.* Stages and events, product
   launches, retail windows, studios — and what Alberto adds: content made
   *for* the wall, generative, live, never a video file. Staging: switch the
   loop to the next palette on arrival.
6. **front, 7 m** — *Commission a loop.* One line and a CTA
   `commission a loop →` / `commissiona un loop →` to `CONTACT.contactHref`
   (internal link, same tab).

Voice: the site's — precise, quiet; Italian that reads as Italian. No
exclamation marks, no "amazing", no bullet lists in the cards.

## 3. State and a11y

The label and the cards are real DOM; focus moves to the card on open and
back to the label on close; the live region announces `station n of 6 ·
title`. Touch: `next →` is a 44 px target; inside the tour the wheel belongs
to the tour, not the dolly. Reduced motion: cuts, no fades. Software path:
works, still.

## 4. Keep

Everything from 04 and 05. The cover is re-captured in 07.

## Verify (add to the report)

Open by click, by `i`, by keyboard; all six stations forward and back with
wheel, keys, swipe; a loop switch mid-tour; `Esc` closes, then exits; a phone
viewport; reduced motion; exit / re-enter ×3.

## Commit

`feat(wall): guided "what is a led wall" tour`.
