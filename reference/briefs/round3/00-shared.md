# Round 3 — shared rules (audit fixes)

Round 3 fixes what the 2026-09-13 audit found (`audit-2026-09-13.md`, same
folder — read it first, all of it: your brief cites its item ids). Six work
packages, **one Claude Code session per package**, same working tree, one dev
server, one director session (`alberto-marocco-cb`, reachable with
`SendMessage`). `reference/briefs/00-shared-rules.md` and
`round2/00-shared.md` still apply (ground truth reading order, art direction,
fallbacks, verification, "audit first") except where this file says otherwise.

| pkg | brief | owns | session |
|---|---|---|---|
| A | `A-chrome.md` | chrome, providers, `globals.css` | `alberto-marocco-2b` |
| B | `B-site.md` | site pages, home/about/work components, canvas | `alberto-marocco-f7` |
| C | `C-copy-seo-config.md` | dictionary, metadata, config, docs, covers | `alberto-marocco-ce` |
| D | `D-hands-darkroom.md` | `hands/`, then `darkroom/` | `alberto-marocco-7e` |
| E | `E-tarassaco-vortex.md` | `tarassaco/`, then `vortex/` + `components/vortex/` | `alberto-marocco-0f` |
| F | `F-wall.md` | `wall/` | first of D/E to finish |

All six run **in parallel**. Baseline commit: `8896be7`.

## Ownership — a hard boundary

Exact paths per package are in each brief. Three shared files have a single
owner, and everyone else sends the owner a request instead of editing:

- `src/app/globals.css` → **A** only.
- `src/app/layout.tsx`, `src/lib/dictionary.ts`, `next.config.ts`,
  `src/app/(site)/graphic-designs/page.tsx`, `README.md`, `DECISIONS.md` → **C** only.
- `src/lib/*` helpers not listed in a brief → **B** (ask first).

A request is a `SendMessage` to the owner's session name with the exact diff
(or the exact CSS rules) and one line of why. Owners apply requests in their
own commits and reply "done" (or push back). Keep going with everything that
does not depend on it.

## Git

- Never `git add -A`, `git add .`, `git commit -a`, `git stash`, `git checkout
  --`/`git restore` on files you do not own, never `git push`, never rebase.
- Several sessions share ONE index. Stage only right before committing, and
  commit **with a pathspec limited to your own files**:
  `git commit -F msg.txt -- <your paths>`. Delete with `git rm` only in that
  same step. Never commit `AGENTS.md`.
- Conventional Commits, subject ≤ 60 chars, body says *why*; one commit per
  logical fix (bugs first, `fix(<scope>): …`; then perf `perf(<scope>): …`;
  then copy/docs). Small commits beat one big one.
- After each commit, `git status --short` must show nothing of yours.

## Dev server, browser, build

- The user runs one `npm run dev`. Its port drifts: probe 3000–3003 and match
  on the page `<title>` ("Alberto Marocco.dev"), never assume. Never start a
  second one, never stop it.
- `npx tsc --noEmit` before every commit (whole project — a sibling's mid-edit
  error takes the overlay down for everyone; if the error is in a folder you
  do not own, wait and retry, do not chase it).
- `npx eslint <your folders>` zero findings.
- **No `npm run build`** — the director runs it at the end. (A production build
  is what the audit measured; the director re-measures.)
- Browser checks with the `agent-browser` skill, in your **own named
  session**: `export AGENT_BROWSER_SESSION=<pkg>-<something>`. Rules that
  bit last time: run `open` alone (do not chain), site pages take ~8 s to lift
  the veil, `wait --load networkidle` never settles on the dev server (use
  `wait --fn`), `eval --stdin` hangs (use `eval -b "$(printf %s "$JS" |
  base64 -w0)"`), use `errors --json`. Desktop 1440×900 and
  `set device "iPhone 14"` (390×844, no touch media — touch CSS is verified by
  reading, touch events by synthetic `TouchEvent`).

## Definition of done (per package)

- Every item in your brief either fixed (commit hash) or explicitly left with
  a reason, in your report. Nothing outside the brief changed without saying
  so.
- tsc clean; eslint zero on your folders; no new dependency unless the brief
  allows it; art direction unchanged (amber accent, mono lowercase HUD, serif
  titles, `cubic-bezier(0.22, 1, 0.36, 1)`).
- Verified in the real browser, desktop + iPhone viewport, console clean;
  demos: enter/exit ×3, keyboard-only, reduced motion, no-WebGL path.
- EN + IT for every string; Italian that reads as written by an Italian.
- Report: demos append a **"Round 3"** section to
  `reference/briefs/reports/<id>.md`; A/B/C write
  `reference/briefs/round3/reports/<pkg>.md`. Format: what changed (commit →
  items), what was left and why, new tunables, how to test in two minutes.

## Talk to the director

`SendMessage` to `alberto-marocco-cb`, short, at three moments:

1. **After the audit-verify pass** (first 20–30 min): which items you
   confirmed, which you could not reproduce, what you will fix in what order,
   any cross-owner request you sent.
2. **When done**: commit hashes with one line each, what is left, the report
   path.
3. **When blocked** (sibling error, missing decision, a request not answered).

Do not wait for a reply to keep working unless the message says you must.
The director reviews every commit, re-runs the audit probes and may send you
follow-ups; a follow-up is part of your package.
