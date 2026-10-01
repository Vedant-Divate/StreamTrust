# Phase 8 verification — Hardening

## What was built

Phase 8 hardening per PROJECT.md Section 14 (items in the order assigned):
eval with explicit odor-abstention check, axe pass, full Section 16
security checklist, live error-state probes, copy re-read, resize
measurement, mock-provider lint cleanup. Prior-session groundwork
(eval script/fixtures, axe spec, ownership + EXIF specs) was re-verified
live in this session; gaps found (odor confirmation, stale label count,
lint warning) were fixed here.

## 1. AI evaluation

Fixtures used as-is: `tests/fixtures/eval/` — 22 openly-licensed photos,
`labels.csv` with 107 data rows, **zero odor rows** (verified:
`odor_rows= 0`), rights in `ATTRIBUTIONS.md`. Run with the shipping
default (`nim`, `meta/llama-3.2-11b-vision-instruct`), never a comparison
candidate. Script: `scripts/eval-ai.ts` (`pnpm eval:ai`, manual, never CI),
one retry on retryable failures mirroring the production route.

```
$ pnpm eval:ai
model=meta/llama-3.2-11b-vision-instruct images=22 labels=107
decided=73 agreed=25 abstained=9 errors=5 odor_abstained=13 odor_omitted=4 odor_checked=17
```

Full output in `docs/verification/eval-results.md` (caveat inline):
**25 of 73 decided agree (34.2%)**; per indicator: clarity 58.8%, algae
37.5%, litter 35.3%, color 29.4%, flow 7.1% (model defaults to
"moderate"). Run-to-run variance is real on this tier — an earlier run
the same day scored 27/54 (50.0%) with 10 prose-errors vs 5 now
(`NIM API error 500` / unparseable JSON on the remainder). Reads as
designed: small sample, team-labelled; a smoke test, not a benchmark.

Odor correctness (explicit, as required): **0 guessed values on all 22
images.** Of 17 images with usable suggestions: 13 explicit abstentions
(normalizer forces `cannot_determine` on any odor row) + 4 omitted rows
(no suggestion stored → UI renders no panel → submit records
`human_only`, same outcome as an abstention; see D-05 in
`docs/questions.md`). 5 errored images produced no output at all. No path
presents a smell guess to the user.

## 2. Accessibility

```
$ pnpm exec playwright test tests/e2e/axe.spec.ts --reporter=list
  ok 4 tests\e2e\axe.spec.ts:52:5 › insights has no serious axe violations (27.7s)
  ok 2 tests\e2e\axe.spec.ts:26:5 › new assessment has no serious axe violations (27.8s)
  ok 1 tests\e2e\axe.spec.ts:21:5 › landing has no serious axe violations (27.8s)
  ok 3 tests\e2e\axe.spec.ts:31:5 › wizard step has no serious axe violations (29.8s)
  4 passed (45.3s)
```

axe (wcag2a/aa, wcag21a/aa) on `/`, `/assess/new`, the wizard step,
`/insights` — **4/4 green, zero serious/critical violations**, so nothing
to fix and nothing excused. Keyboard operability is additionally asserted
in the happy-path e2e (Tab order, Space toggles).

## 3. Security checklist (Section 16, item by item)

- [PASS] No PII collected — volunteers table holds only a UUID;
  Practitioner carries no name (mapper unit-tested); no name/email fields
  anywhere in UI, schemas, or FHIR output.
- [PASS] Location rounded to 4 dp before storage — route `round4`,
  asserted in `assessments.test.ts` ("creates a draft, rounds
  coordinates").
- [PASS] EXIF stripped — proven live this session, not assumed:
  `exif-strip.spec.ts` uploads a 2000px JPEG with a crafted GPS APP1
  segment through the real browser pipeline; stored bytes contain no
  `Exif` header and measure 1600×1200 (`1 passed (20.6s)`).
- [PASS] Consent required — UI checkbox + server `literal(true)` +
  `rejects a payload without consent` (400) test green.
- [PASS] Ownership on every route — negative tests green for all
  post-Phase-2 routes: submit/acks (`rejects anonymous and foreign …
calls`), suggest (`rejects photo-less, cookie-less …`, 403 anon /
  404 stranger), validate (`rejects anonymous and foreign requests`),
  fhir GET (`rejects drafts (409), strangers (404), anonymous (403)`),
  fhir/validate (`rejects anonymous and foreign validation calls`),
  plus photos upload/stream/delete. All in `pnpm test` (145/145).
- [PASS] Rate limiting actually tested — `suggest.test.ts`
  `rate-limits at 10 calls per volunteer per hour` (10×200 then 429
  `rate_limited`) green.
- [PASS] Server-side photo limits — live bypass attempts this session
  against a dev server (direct API calls, no UI):
  PNG-typed bytes → `400 {"code":"invalid_input","message":"Only
image/jpeg is accepted."}`; 608 KB JPEG → `400 {"code":
"invalid_input","message":"Photo must be at most 409600 bytes."}`.
  Fourth-photo cap covered by `rejects a fourth photo` (`photo_limit`).
- [PASS] No secrets in client bundle — grep of the fresh production
  build's `.next/static` for
  `nvapi-|AIza|NIM_API_KEY|GEMINI_API_KEY|DATABASE_AUTH_TOKEN|TURSO_AUTH`:
  **zero matches**; no literal key values in `.next/server` chunks
  either. Only `NEXT_PUBLIC_APP_NAME` (non-secret) reaches the browser.
- [PASS] No secrets committed — `git ls-files` shows only `.env.example`
  for env files; `.env.local` (real keys) is gitignored and untracked;
  no key values in history.
- [PASS] Prompt hygiene — v1 prompt unit-tested (`prompt.test.ts`) for
  all Section 8.3 requirements: no safety/health claims, abstain when
  unsure, visible-only evidence, image text treated as untrusted data.
- [PASS] No AI preselection — wizard renders `AiSuggestionPanel` only for
  existing suggestions and only sets values on explicit clicks
  (`assess/[id]/page.tsx`); accept/override e2e paths prove it.
- [PASS] Disclaimers — both Section 1.6 lines on landing, about, and the
  global footer (every page incl. wizard); demo notice + badge on
  `/insights` when demo data is included. COPY-tested.
- [PASS] HAPI data non-sensitive by construction (rounded coords, no
  names, anonymous volunteer ID) + explicit pre-send notice
  (`COPY.fhirNotice`) on the done page before every validation submit.
- [FAIL — deferred, not fixable in this phase] Frozen-lockfile install in
  CI — no CI workflow exists until Phase 9 (explicitly out of scope);
  `pnpm-lock.yaml` is committed so the Phase 9 workflow can use
  `--frozen-lockfile` directly. Reason recorded here, not silently left.

## 4. Error states (all triggered live, all honest, none crash)

- AI provider down (dev server with invalid NIM key → NIM 401, no retry
  on 4xx): `POST /suggest` → `502 {"code":"provider_failed","message":
"The AI provider failed. Continue manually."}`. Wizard shows
  `COPY.suggestionsFailed` ("The AI is unavailable. Continue manually.")
  via `aria-live`, stays on the step, manual path unaffected.
- FHIR validator down: `fhir.test.ts` `returns 502 when the validator is
unreachable` green; done page catches and shows
  `COPY.fhirValidateError` ("Validation failed. Try again later.").
- DB write failure (dev server against an unmigrated DB file): draft
  create → HTTP 500 with empty body (throw escapes the route; no stack
  trace or internals leak). Wizard/review/done all catch fetch failures
  and render `COPY.loadError` (`role="alert"`) / `COPY.submitError`
  ("Something went wrong. Check your answers and try again.") — never a
  blank screen. Observation (no code change): `/api/health` reports
  `db: up` on an unmigrated file — it checks connectivity, not schema.

## 5. Copy pass

Full re-read of `src/domain/copy.ts` against 11.3 (plain language,
≤8th-grade level; science terms stay in `vocab.ts` tooltips) and 1.6
(both disclaimers + demo notice): **no changes needed.** The one stale
line found (`doneText` promising the FHIR view "in a later step") was
already fixed in `670c360`. Disclaimer rendering verified by grep:
landing, about, layout footer (all pages), insights demo badge.

## 6. Performance sanity

Real 3000×2000 JPEG through the real browser uploader (temporary spec,
deleted after the run, never committed):

```
RESIZE_MEASURE sent=101026 stored=14235 dims=1600x1067 reduction=85.9%
```

Client resize genuinely reduces upload size (1600px cap + 0.82 JPEG
re-encode); EXIF goes with it (re-encode by construction, proven in §3).
`1 passed (35.8s)`.

## 7. Housekeeping

The pre-existing `mock-provider.ts` `_input` lint warning is gone:
deterministic fixture takes no parameter now
(`refactor(ai): remove unused suggest parameter from mock provider`),
call sites updated, `pnpm lint` reports **zero warnings**. It will not
survive into Phase 9's CI setup.

## Commands run and output (abbreviated, real)

$ pnpm verify (before every commit; final run)
$ tsc --noEmit # clean
$ eslint # zero errors, zero warnings
$ vitest run # Test Files 25 passed, Tests 145 passed
$ next build # Compiled successfully, all routes listed

$ pnpm exec playwright test tests/e2e/axe.spec.ts --reporter=list
4 passed (45.3s)
$ pnpm exec playwright test tests/e2e/exif-strip.spec.ts --reporter=list
1 passed (20.6s)

## Manual check

Live probes (throwaway scripts in the OS temp dir, never committed):
AI-down 502, PNG/oversize 400s, DB-down 500, resize 85.9% — outputs
pasted in §§3/4/6 above. No screenshots: all evidence is API/test output.

## Deviations from PROJECT.md

- None requiring an ADR. D-05 (omitted odor row → human_only) logged in
  `docs/questions.md` as a documented-default judgment, not a spec change.

## Commits in this phase (this session)

- `ccbfda5` refactor(ai): remove unused suggest parameter from mock provider
- `3aa72db` test(ai): track odor abstention in eval script and refresh results
- this commit — gate rewritten with this session's live evidence
- Prior-session Phase 8 groundwork already on main: `b256b84`,
  `8d3ce1b`, `1590b84`, `8cf8df8`, `d317e6e`, `41e94dc`, `a8639fb`,
  `d453364`, `8ae10f5`, `3e799eb`, `670c360`, `23a08a9` (gate stub
  rewritten by this file).
