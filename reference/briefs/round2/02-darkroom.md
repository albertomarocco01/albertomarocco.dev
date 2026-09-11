# 02 — Camera Oscura · round 2

**Model: Fable 5.1 · effort high** (fallback: Opus 5 · high). After 01.
Folder: `src/app/(immersive)/graphic-designs/darkroom/` (or
`…/xperiments/darkroom/` if 01 has not landed). Read `01-darkroom.md`,
`reports/darkroom.md`, then the folder — `components/darkroom-engine.ts` is
the piece; `tray-bus.ts`, `Hud.tsx`, `App.tsx`, `darkroom.config.ts`,
`shaders.ts` are where the changes land.

Alberto's verdict: "mi piace". Three changes, one thing to make perceptible,
and the audit.

## 0. Audit (00-shared.md)

Suspects to check explicitly: the autonomous current never visibly starting
while the mouse rests over the tray (a resting mouse must not count as input —
§3); the HUD flicking between `fixed` and the drain; `THREE.Clock` deprecation
noise is R3F's, not ours — leave it.

## 1. The handover: a finished print gives way to the next one at once

Today: coverage ≥ 0.85 → `fixing` (1.2 s ease to 1) → `fixed` held 2.5 s →
`draining` 1.6 s of rising black → the next print loads into a black tray →
the idle hint. About 5.5 s in which nothing new happens.

Wanted: once the print is complete, the next one appears right away — not a
cut, an effect — and the handover reads as one gesture: **≤ 2 s** from
"complete" to "the next print is in the tray and answers the hand".

- `DEVELOP.fixedHold` → ≈ 0.4 s (enough to register that it is done);
  `fixEase` may stay.
- Replace drain-to-black-then-load with a **cross-dissolve** in the composite
  pass: the finished print sinks — darkens and loses its grain over ~1.2 s,
  still refracting under the moving liquid — while the fresh tray with the
  next print's latent (undeveloped) state comes up underneath. Mechanically:
  the next print's texture is bound and the exposure / dye buffers are reset
  at the *start* of the transition instead of its end, and the composite
  blends `old, developed` → `new, latent` on the drain ramp (`u_drain` can
  stay the driver). The new print's idle clock and hint start when the
  dissolve ends. The next print is already preloaded so there is no wait; if
  it is not loaded yet, keep today's waiting drain — never a stall, never a
  frozen tray.
- Manual ← / → use the same dissolve (a shorter ramp is fine). A command
  mid-dissolve re-targets as today.
- Brush path (reduced motion): a cut is right there; keep it.
- The handover is a phase like the others: sub-stepped, interruptible, and a
  resize in the middle of it must not break the exposure remap.

## 2. Only the photograph: no bottom HUD

Remove the two HUD corners (`print 03 / 12`, `developing 42 %` / `fixed`)
from the running demo. What stays on screen: the tray, the exit link top-left
(`← exit the demo` / `← esci dalla demo`, locale-driven as now), and — on the
very first idle state only — the title cover and the centred `stir the
developer` hint, which still fade on the first input. Keep the `sr-only` live
region that announces a fix. On the brush path keep the `next print →` control
— it is the only way to advance there — but show it only once the print is
fixed. Drop `print` / `developing` from `copy.ts` if nothing else reads them;
keep `fixed` for the live region. (In `next dev` the Next dev-tools badge sits
bottom-left; that is not ours and is absent in production.)

## 3. Left alone, it develops by itself — perceptibly

The autonomous current exists (`AUTO`) but Alberto did not see it: it starts
at 15 % after 6 s and needs ~9 s to show 4 %. Wanted: leave the tray alone
and, after a short while, the print starts to come up on its own, slowly, all
the way — "si colora da sola piano piano".

- Start: `AUTO.idleDelay` 6 → 3 s, `AUTO.strength` 0.15 → ~0.4,
  `AUTO.rampTime` 36 → ~20 s. Target with no input at all: a visible ghost
  within ~5 s of the current starting, the print fixed in 25–30 s. Tune by
  eye on the real GPU; it must look like a tray left to develop, never like a
  fast-forward.
- **A resting pointer must not reset the idle clock.** Today every
  `pointermove` pokes the bus and the OS emits micro-moves. In `App.tsx`'s
  `onMove`, skip the bus write when the pointer has moved less than ~2 px
  from the last position you wrote. Verify: park the mouse over the tray and
  do not touch it — the current starts and finishes the print.
- On a print the visitor has stirred and then abandoned, the same delay
  applies (already so — confirm it survives your changes).

## Verify (add to the report)

Mouse happy path; no-input path with the mouse parked over the tray; ← / →
during a dissolve; brush path still cuts and shows its control only when
fixed; a phone viewport; exit / re-enter ×3; console clean.

## Commit

`feat(darkroom): dissolve into the next print, no HUD, self-developing tray`
— after the audit-fixes commit, if any.
