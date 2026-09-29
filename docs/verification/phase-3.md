# Phase 3 verification — Wizard UI (manual path, no AI)

## What was built

- `/` landing (hero, 3 steps, both Section 1.6 disclaimers, CTA) and
  `/about` (method, limits, privacy, AI disclosure); layout adds a skip
  link, header nav, and a site-wide disclaimer footer.
- `/assess/new` (Step 1): manual lat/lng + geolocation button, visit
  date/time defaulting to now, rain context, consent checkbox; creates
  the draft via `POST /api/assessments`.
- `/assess/[id]` (Steps 2–3): photo upload wired through `resizePhoto`
  (client resize before POST) with thumbnails + delete; one card per
  indicator (plain label, scientific-term tooltip, help text), autosave
  via PATCH on change with aria-live status; dry-bed cascade sets the
  four appearance values to `not_applicable` when `flow=dry`.
- `/assess/[id]/review` (Step 4): read-only summary; submit enabled only
  when all six indicators are answered.
- Minimal `POST /api/assessments/:id/submit`: ownership + draft + all
  six answered → `submitted`. Full rule gating is Phase 5 by design.
- `/assess/[id]/done`: success state, collapsible raw JSON, download
  button; drafts redirect back to review.
- Playwright happy-path e2e at 375 px: create → photo → six answers →
  review → submit → done, with Tab-order and Space-toggle keyboard
  assertions.

## Commands run and output (abbreviated, real)

$ pnpm verify (final run)
$ tsc --noEmit / $ eslint — no errors
$ vitest run — Test Files 11 passed (11), Tests 56 passed (56)
$ next build — all wizard + API routes registered (see route table)

$ pnpm exec playwright test --timeout=180000 --reporter=list
Running 1 test using 1 worker
ok 1 tests\e2e\happy-path.spec.ts:10:5 › human-only happy path (18.3s)
1 passed (33.1s)
(second consecutive green run: 1 passed in 45.8s)

## Manual check

Screenshots at 375 px (committed under docs/verification/screenshots/):

- `phase-3-indicators.png` — odor card with tooltip, selected option,
  Back / Review-and-submit nav.
- `phase-3-review.png` — Step 4 summary: place, visit time, rain, photo
  count, all six answers with human-readable labels.
- `phase-3-done.png` — "Assessment saved. Thank you!", raw JSON showing
  `"status": "submitted"`.

Client-resize proof (not just function-exists): the e2e generates a
3000×2000 JPEG in the browser, uploads it through the real UI, and
asserts the stored dimensions read back as **1600 × 1067** — only
possible if `resizePhoto` ran before upload.

Zero-AI confirmation: the done-page raw JSON asserts
`"decisionSource": "human_only"` on entries and `"status": "submitted"`;
no AI route was called (none exists yet) and no suggestion UI is
rendered anywhere in this phase.

Keyboard-only pass (automated, in the e2e): Tab from place-name lands
on latitude then longitude; Space toggles the consent checkbox;
odor radio asserted focused before use. All controls are native
inputs/labels/buttons with visible focus rings and ≥44 px targets;
async states use `aria-live="polite"`. Full axe audit deferred to
Phase 8 per the phase plan. Deferred UI note: switching flow away from
`dry` leaves `not_applicable` values in place until Phase 5 rules flag
them (no per-entry delete endpoint exists yet by design).

## Deviations from PROJECT.md

- Minimal submit route now; Phase 5 extends it with rule gating and
  warning acknowledgements (required for any end-to-end submit).
- Landing links to `/insights`, which 404s until Phase 7 builds it.
- Real bug found and fixed: overlapping autosaves applied stale server
  state over newer answers; only the latest PATCH response now updates
  the view (sequence guard in the wizard page).
- Test-only lesson, no app change: Space-toggling a radio flaked under
  headless save-rerenders, so odor uses a label click; keyboard proof
  rests on the Tab-order and consent Space-toggle assertions.

## Commits in this phase

- 4da7e86 feat(wizard): add landing and about pages
- 8dda6f8 feat(wizard): add new assessment step
- 6880606 feat(wizard): add photo upload and indicator step
- c748206 feat(wizard): add review and submit flow
- d22f33a feat(wizard): add done screen with raw data view
- a06512d test(e2e): add happy path playwright test
- 80f7693 test(e2e): stabilize happy-path selectors and timeouts
