# Merge demos — round 2 · shared rules

Round 2 revises the five demos on the "Merge — Graphic Designs" index after
Alberto's first walkthrough. **One Claude Code session per brief**, run in the
order below; each session commits its own work. `reference/briefs/00-shared-rules.md`
still applies in full (ground truth reading order, conventions, art direction,
fallbacks, performance, verification) except where this file says otherwise.

| # | brief | owns | after |
|---|---|---|---|
| 01 | `01-routes.md` | shared files (routes, config, sitemap) | — |
| 02 | `02-darkroom.md` | `(immersive)/graphic-designs/darkroom/` | 01 |
| 03 | `03-hands.md` | `…/hands/` | 01 |
| 04 | `04-wall-room.md` | `…/wall/` | 01 |
| 05 | `05-wall-loops.md` | `…/wall/` | 04 |
| 06 | `06-wall-tour.md` | `…/wall/` | 05 |
| 07 | `07-release.md` | whole tree | all of the above |

02, 03 and 04 may run **in parallel** (three sessions, same tree, one dev
server) — they own disjoint folders. 04 → 05 → 06 are strictly sequential:
same folder.

## What changed since round 1

- **Routes.** After 01, the demos live at `/graphic-designs/<id>` and in
  `src/app/(immersive)/graphic-designs/<id>/`. If 01 has not landed yet the
  folder is still `(immersive)/xperiments/` — check with `ls` before you read.
- **Git is allowed.** One session per brief: commit at the end (rules below).
  Never push.
- **`npm run build` is allowed** at the end of a session when no sibling
  session is running (01 and 07 always; 02/03/04 only if you are alone).
  Otherwise `npx tsc --noEmit` + eslint on your folder.
- **The dev server.** The user runs one `npm run dev`. Its port drifts (other
  projects squat 3000/3001): probe 3000–3003 and match on the page `<title>`,
  never assume. Never start a second one.
- **Browser checks.** The `agent-browser` skill is available and preferred
  for driving the real page; the CDP Python recipe in 00-shared-rules §6.3
  still works if you need raw control.

## Audit first — every brief

Before changing behaviour:

1. Read the demo's round-1 brief (`reference/briefs/0N-<id>.md`), its build
   report (`reference/briefs/reports/<id>.md`), then the whole folder.
2. `npx tsc --noEmit`; `npx eslint "<your folder>"`.
3. Open the demo in the real browser and exercise every path in the report's
   "How to test it in two minutes". Console open.
4. List every defect you find — a crash, a leak, a stuck state, a dead input,
   a listener left behind, a wrong locale string, an a11y regression. Fix the
   real ones **first, in their own commit** (`fix(<id>): …`), before the
   feature work. If a fix genuinely needs a shared file, do it and say so in
   the report.

## Ownership

Your folder, `public/<id>/`, `reference/briefs/reports/<id>.md`. Shared files
(`src/lib`, `src/components`, `globals.css`, `(site)/**`, `next.config.ts`,
`sitemap.ts`, `package.json`, the dictionary) only where your brief lists
them. Never another demo's folder.

## Definition of done

- tsc clean; eslint zero findings on your folder; no new dependency unless
  the brief allows it; no CDN, no runtime fetch outside `/public`.
- Every path in the report still works: happy path, keyboard-only, reduced
  motion, a phone viewport with touch, the no-WebGL message, exit and
  re-enter ×3 with no leak and a clean console.
- EN + IT in `copy.ts` for every new string; the Italian reads as written by
  an Italian.
- Append a **"Round 2"** section to `reference/briefs/reports/<id>.md`: what
  changed and why, new tunables (name + file), new known limits, how to test
  it in two minutes.
- Commit: Conventional Commits, subject ≤ 60 chars, body says *why*; only the
  files you touched. Leave `AGENTS.md` churn out of your commits unless it is
  the only way to a clean tree.

## The bar

Unchanged: the existing site. Nothing may read as "default" or as a UI kit.
One accent (amber), mono lowercase HUD, serif titles, slow settling motion on
`cubic-bezier(0.22, 1, 0.36, 1)`. Before calling it done, open
`/graphic-designs`, click your card and ask whether a studio would put this on
its homepage.
