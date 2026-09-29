# Phase 0 verification — Foundations & assumption resolution

## What was built

- Empty Next.js 16 App Router shell (`src/app`, `@/*` alias) with Tailwind v4,
  strict TypeScript, flat ESLint config, Prettier, Vitest + Playwright configs.
- husky pre-commit (lint-staged) + commit-msg (commitlint) hooks enforced.
- shadcn/ui base initialised (components.json, base button primitive).
- `.env.example` with every key from PROJECT.md Section 17.1 (placeholders).
- `docs/decisions/ADR-0001-single-nextjs-app.md`,
  `docs/decisions/ADR-0002-versions.md`, `docs/questions.md` (A-1..A-8 + D-01).
- One intentional fix: scaffold `layout.tsx` used `LayoutProps<"/">`, which
  fails `tsc --noEmit` before typegen; replaced with explicit
  `{ children: React.ReactNode }`.

## Commands run and output (abbreviated, real)

$ node --version; pnpm --version
v24.14.0
12.6.0

$ pnpm verify
$ pnpm typecheck && pnpm lint && pnpm test && pnpm build
$ tsc --noEmit
(no errors)
$ eslint
(no errors)
$ vitest run
RUN v5.0.2 C:/Users/Vedant/Desktop/Github/StreamTrust
✓ tests/unit/smoke.test.ts (1 test) 4ms
Test Files 1 passed (1)
Tests 1 passed (1)
$ next build
▲ Next.js 16.3.6 (Turbopack)
✓ Compiled successfully in 959ms
Route (app)
┌ ○ /
└ ○ /_not-found
○ (Static) prerendered as static content

$ git commit --allow-empty -m "bad message format test"
husky - commit-msg script failed (code 1)
✖ subject may not be empty [subject-empty]
✖ type may not be empty [type-empty]
(no commit created — hook rejects bad messages as required)

$ git log --oneline
2b90933 docs(decisions): add ADR-0001 and ADR-0002
f79c12b docs(project): add PROJECT.md and AGENTS.md
7d07059 chore(repo): add shadcn ui base with button primitive
c6e985e chore(repo): configure eslint, prettier, husky, commitlint
585f892 chore(repo): scaffold Next.js app with TypeScript and Tailwind

(Note: two further commit attempts with body lines >100 chars were also
rejected by commitlint during this phase; messages were rewrapped and
committed successfully.)

## Manual check

Production server smoke test on the built shell:

$ pnpm start
▲ Next.js 16.3.6

- Local: http://localhost:3000
  ✓ Ready in 552ms

$ Invoke-WebRequest http://localhost:3000
StatusCode: 200

Default Next landing (retitled "StreamTrust") renders; server stopped and
port 3000 confirmed free afterwards.

## Live URL

https://streamtrust.vercel.app/ — empty shell deployed on Vercel (Hobby),
confirmed serving the StreamTrust-titled landing with HTTP 200 on 2026-09-29.
D-01 resolved: local `main` pushed to `github.com/Vedant-Divate/StreamTrust`
and imported with Framework preset Next.js, all build settings default.

## Section 4 resolutions

- A-1 vocabulary: UNRESOLVED, using Section 7.1 (no official protocol found).
- A-2 FHIR sandbox: UNRESOLVED, using public HAPI R4 (configurable).
  Session 4 mentions an OAH-FHIR IG + sandbox; URL not retrievable.
- A-3 deadline: CONFLICT — rules header says Oct 4, 2026 @ 9pm PDT, submit
  page + updates say Sep 30, 2026 @ 9pm PDT. Keeping conservative default
  Sep 30, 21:00 PDT (Oct 1, 09:30 IST). Human must confirm on dashboard.
- A-4 team: RESOLVED — Rules: "Open to individuals or teams".
- A-5 original work: RESOLVED — repo created 2026-09-29, honest history.
- A-6 AI disclosure: default kept; final README wording in Phase 9.
- A-7 India prize eligibility: UNRESOLVED, does not block building.
- A-8 real data: UNRESOLVED, own photos + labelled synthetic demo data.
- Full lines in docs/questions.md.

## Deviations from PROJECT.md

- Toolchain file names follow the scaffold, recorded in ADR-0002 (flat
  `eslint.config.mjs` instead of `.eslintrc.cjs`; no `tailwind.config.ts`
  under Tailwind v4; `postcss.config.mjs`).
- Node v24.14.0 used instead of suggested Node 22 LTS (build machine
  default; recorded in ADR-0002).
- shadcn CLI defaulted to Base UI primitives instead of Radix (recorded in
  ADR-0002; both are accessible primitives).
- Empty shell live at https://streamtrust.vercel.app/ (Vercel Hobby, Next.js
  preset, default build settings, no env vars). D-01 resolved.

## Commits in this phase

- 585f892 chore(repo): scaffold Next.js app with TypeScript and Tailwind
- c6e985e chore(repo): configure eslint, prettier, husky, commitlint
- 7d07059 chore(repo): add shadcn ui base with button primitive
- f79c12b docs(project): add PROJECT.md and AGENTS.md
- 2b90933 docs(decisions): add ADR-0001 and ADR-0002
