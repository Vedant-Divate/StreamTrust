# Phase 7 verification — Insights dashboard & demo data

## What was built

- `src/server/insights/aggregate.ts`: pure `computeAgreement` math
  (overall + per-indicator rates, overrides, band crosstab) over joined
  rows, plus a thin DB fetch scoped to **submitted** assessments
  (D-04: draft sources are placeholders). Demo filter exclude/include/
  only; default exclude.
- `GET /api/insights?demo=…`: public aggregates only (no assessment,
  volunteer, or location data leaves the endpoint); 400 on bad mode.
- `/insights` UI: summary cards, two CSS-bar charts (no chart
  dependency), override table, demo checkbox + unmissable dashed badge
  with the synthetic-data notice; shareable `?demo=include` state;
  honest empty state.
- `scripts/seed-demo.ts` (`pnpm seed:demo`): 10 synthetic submitted
  assessments (36 accepted, 13 overridden, 11 human-only rows),
  `(Demo)`-prefixed sites, mock provider rows. **Idempotent**: fixed
  `demo-*` ids deleted children-first and re-inserted — two
  consecutive runs left exactly 10 assessments / 60 entries / 60
  suggestions (verified by direct DB count).

## Commands run and output (abbreviated, real)

$ pnpm verify (final run)
$ tsc --noEmit / $ eslint — 0 errors, 1 warning (known `_input` note)
$ vitest run — Test Files 25 passed (25), Tests 139 passed (139)
incl. insights.test.ts (4: 66.7% overall from known rows, null-rate
empty case, per-indicator overrides, band crosstab)
incl. api/insights.test.ts (2: exclude/include/only end to end, bad mode 400)
$ next build — insights page + route registered
$ pnpm seed:demo (twice)
Seeded 10 demo assessments (idempotent, demo-only).
Seeded 10 demo assessments (idempotent, demo-only).

## Manual check — screenshots at 375 px

- `phase-7-included.png`: dashed **Demo data — synthetic, not real
  observations** badge, checkbox checked, **73.1% / 52 compared /
  14 changed**, per-question and per-band bars, override table.
- `phase-7-excluded.png`: no badge, unchecked box, **66.7% / 3
  compared / 1 changed** — real rows left over from earlier e2e runs,
  genuinely different numbers proving the filter works (and that
  excludable real data flows through the same math).
- Cross-check: demo alone is 36/49 = 73.5%; plus the 3 real pairs
  (2/3) gives 38/52 = 73.1% — the dashboard figure reconciles exactly.
- (A dark circular artifact bottom-left in the shots also appears on
  static pages: a headless-Chromium capture artifact, not app UI.)

## Deviations from PROJECT.md

- Dashboard scoped to submitted assessments (D-04 in questions.md):
  drafts would corrupt override counts with placeholder sources.
- Plain CSS bars instead of Recharts — explicitly allowed ("or plain
  CSS bars"), zero new dependencies.
- No separate `test(insights)` commit: aggregation tests shipped inside
  the two feature commits, same coverage.

## Commits in this phase

- 0ba994c feat(insights): add aggregation queries for agreement and overrides
- 59b6714 feat(api): add insights route
- 686acda feat(scripts): add demo data seed script
- 7cc5733 feat(insights): add dashboard ui with demo data toggle
