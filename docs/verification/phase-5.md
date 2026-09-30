# Phase 5 verification — Validation rule engine

## What was built

- `src/domain/rules/`: all 11 Section 9 rules as pure functions —
  `missing` (R-MISSING), `dry-bed` (R-DRY-WATER + R-NA-WITHOUT-DRY),
  `observed-time` (R-FUTURE-TIME, 5-min skew), `location` (R-LOCATION),
  `consistency` (3 warnings), `informational` (R-MUDDY-RAIN,
  R-AI-OVERRIDE-HIGH), `photos` (R-NO-PHOTO) — plus `index.ts`
  (`runAllRules`, `KNOWN_RULE_IDS`). No R-STANDING-FAST (not in spec).
- `POST /api/assessments/:id/validate`: pure, returns `RuleResult[]`,
  writes nothing (verified: entry count unchanged after a call).
- Submit gating (server-side): completeness (400) → any error (422
  `validation_failed`) → every fired warning acknowledged (422
  `unacknowledged_warnings` with the missing list) → decision_source +
  finalize. `photo_waiver` travels in validate/submit payloads only
  (D-03: no schema column exists for it).
- `POST /api/assessments/:id/acks`: per-warning "I understand,
  continue" stored in `warning_acks` (draft only, 201).
- Review UI: blocking red errors, per-warning ack buttons with
  acknowledged state, dismissible blue info, photo waiver checkbox,
  server rejection messages surfaced on submit.
- E2E `smell-warning.spec.ts`: trigger R-SMELL-CLEAN → ack → submit →
  done. Full suite: 3/3 green.

## Commands run and output (abbreviated, real)

$ pnpm verify (final run)
$ tsc --noEmit / $ eslint — 0 errors, 1 warning (known `_input` note)
$ vitest run — Test Files 19 passed (19), Tests 115 passed (115)
incl. rules/errors.test.ts (14: fires/doesn't-fire per error rule,
dry-bed backstop cases, 5-min skew boundary ±1 s, location bounds)
incl. rules/warnings-info.test.ts (15: fires/doesn't-fire per rule,
both smells, override accept/abstain/medium-band negatives, waiver)
incl. api/validate.test.ts (4: smell warning, dry error + purity,
waiver on/off, 403/404) + submit gating tests (422 error, 422
unacked → 201 ack → 200 submit)
$ next build — validate + acks routes registered
$ pnpm exec playwright test — 3 passed (happy-path, ai-suggest, smell-warning)

## Manual check — live curl sequences on pnpm dev

(a) Submit with an error present (direct PATCH bypassing the UI —
flow=dry with clarity=clear):

SUBMIT 422
{"error":{"code":"validation_failed","message":"Fix these problems first.","details":[{"ruleId":"R-DRY-WATER","severity":"error","indicators":["clarity","color","algae"],"message":"You said there's no water, so water-appearance questions don't apply. Please check."}]}}

(b) Submit with an unacknowledged warning (smell-clean combo, waiver set):

SUBMIT 422
{"error":{"code":"unacknowledged_warnings","message":"Acknowledge these warnings first.","details":{"missing":["R-SMELL-CLEAN"]}}}

(c) Acknowledge, then submit:

ACK 201 {"ack":{"id":"8f02be9b-…","assessmentId":"28f1527a-…","ruleId":"R-SMELL-CLEAN","note":null,"createdAt":"2026-09-30T10:54:01.581Z"}}
SUBMIT 200 {"assessment":{…,"status":"submitted",…}}

All real output; IDs abbreviated here, full in the transcript above.

## Deviations from PROJECT.md

- Shared `src/server/validation/build-input.ts` assembler used by
  validate + submit. Addendum (Section 12): no existing structure slot
  fits a cross-route read-only helper, so it lives under `src/server/`
  next to the routes it serves.
- R-DRY-WATER implemented exactly as specified (clarity/color/algae
  only — odor excluded per the table, even on a dry bed).
- R-NA-WITHOUT-DRY also fires when flow itself is unanswered alongside
  an N/A value (flow ≠ dry, strictly read).
- 422 (not 400/409) for rule blocks: `validation_failed` for errors,
  `unacknowledged_warnings` with the missing list.
- Acks endpoint chosen over submit-payload acks (explicit per-warning
  action, independently testable).
- Test DBs remain `:memory:` (D-02); photo waiver unpersisted (D-03).

## Commits in this phase

- 5a59fc1 feat(rules): add error-severity rules with unit tests
- ae554ba feat(rules): add warning and info rules with unit tests
- 755a18e feat(api): add validate route
- e2efb0e feat(api): enforce rule gating on submit
- f541133 feat(review): add warning acknowledgement flow
- b1c0d7c test(e2e): add smell-clean acknowledge and submit path
