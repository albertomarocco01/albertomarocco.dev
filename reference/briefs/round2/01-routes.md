# 01 — Routes: the five demos live under `/graphic-designs/*`

**Model: Sonnet 5 · effort high.** First of round 2; nothing else runs
alongside it.

## Why

The index at `/graphic-designs` ("Merge — Graphic Designs") lists five demos,
but each opens at `/xperiments/<id>`. The URL says they belong to
`/xperiments`, which is a different page — the generative rows. Alberto:
"sono tutti merge graphic". The URL has to say so.

## Do

1. `git mv "src/app/(immersive)/xperiments" "src/app/(immersive)/graphic-designs"`
   — the whole folder, `error.tsx` and `loading.tsx` included. Rename those
   two components `DemoError` / `DemoLoading` and fix their comments (they say
   "xperiments" and "both demos"; there are five).
2. Every reference. `grep -rn "xperiments/" src next.config.ts README.md DECISIONS.md`
   and go through each hit:
   - `(site)/graphic-designs/page.tsx` — the five `href`s and the comment
     above `DEMOS`.
   - the five `page.tsx` — `alternates.canonical` → `/graphic-designs/<id>`.
   - `sitemap.ts` — the five URLs.
   - `next.config.ts` — the two `Permissions-Policy` header `source`s
     (`/graphic-designs/tarassaco`, `/graphic-designs/hands`). Add
     `redirects()`: `/xperiments/:id(vortex|tarassaco|darkroom|hands|wall)` →
     `/graphic-designs/:id`, `permanent: true`, so links already shared keep
     working. Read
     `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/redirects.md`
     first — Next 16 syntax, not the one you remember.
   - comments in `(site)/xperiments/page.tsx`, `(site)/layout.tsx`,
     `components/chrome/Shell.tsx`, `globals.css` (the Vortex block header),
     `components/vortex/VortexExperience.jsx`, `lib/dictionary.ts` — make
     them true. The route-group explanation in `(site)/xperiments/page.tsx`
     is still right; its sibling is now `(immersive)/graphic-designs/*`.
   - `README.md` — the `app/(immersive)/…` line in the tree.
   - `reference/briefs/00-shared-rules.md` — one line at the top: routes
     moved in round 2, see `round2/01-routes.md`. Leave the historical
     reports untouched.
   - Exit links and `router.push("/graphic-designs")` are already right.
3. Confirm the two route groups do not collide: `(site)/graphic-designs/page.tsx`
   serves `/graphic-designs`; `(immersive)/graphic-designs/<id>/page.tsx`
   serves `/graphic-designs/<id>`. It is the same arrangement `/xperiments`
   had. If Next complains, stop and report — do not invent a third path.

## Verify

- `npx tsc --noEmit`; `npm run lint` — no new findings against `e858585`;
  `npm run build`.
- Real browser: `/graphic-designs` → each of the five cards → the demo opens
  at `/graphic-designs/<id>` → exit returns to the index. `/xperiments/wall`
  → 308 → `/graphic-designs/wall`. `/xperiments` still shows the rows.
  `curl -I` on `/graphic-designs/hands` shows `Permissions-Policy: camera=(self)`;
  on `/graphic-designs` it is absent. Hands and Tarassaco still get the
  camera (the header moved with them).

## Commit

`refactor(routes): merge demos live under /graphic-designs/*` — body names
the redirect. A second commit only if `AGENTS.md` was re-generated.
