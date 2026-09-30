# Phase 4 verification — AI suggestions

Primary path: **function-calling** (nemotron), per the pre-flight decision
in `phase-4-preflight.md` — base64 input and forced tool calls both
verified live before any provider code was built. No reversal ADR needed.

## What was built

- `src/server/ai/provider.ts` (+`signal`), `mock-provider.ts`
  (deterministic; two deliberately adversarial rows), `prompt.ts` (v1,
  all seven Section 8.3 requirements literal-tested), `normalize.ts`
  (odor always abstains, invalid/`not_applicable` → abstain, confidence
  clamped + banded).
- `nim-provider.ts`: nemotron forced-tool path (`record_indicators`,
  reasoning_budget 2048, temp 0.3 / top_p 0.9 / max_tokens 800) plus the
  llama prompt-JSON fallback, model-selected; slugs are the
  pre-flight-confirmed vendor-prefixed IDs.
- `POST /api/assessments/:id/suggest`: ownership + draft-only, ≥1 photo
  required, 10/hr DB-backed limit (429), idempotent per photo set unless
  `rerun`, 25 s timeout, one retry on schema/5xx only, raw payload stored
  per call, `maxDuration = 60`.
- Submit recomputes `decision_source` server-side per the exact Section
  7.2 rule and links entries to suggestion rows.
- `AiSuggestionPanel`: chip, band with self-reported tooltip, Why?
  expander (evidence + cues), Use button; abstentions show text only;
  nothing is ever preselected.
- `gemini-provider.ts`: secondary, default `gemini-3.8-flash`
  (live-verified; `gemini-2.5-flash` 404s for current keys).
- `.env.example`: `AI_PROVIDER=nim`, `NIM_API_KEY`, confirmed model IDs,
  Anthropic removed.
- E2E accept/override paths on mock, asserting `ai_accepted` /
  `human_override` from the API.
- Phase 3 follow-up in this phase: N/A cascade fixed (PATCH null clears
  entries; wizard clears stale N/A off `dry`).

## Commands run and output (abbreviated, real)

$ pnpm verify (final run)
$ tsc --noEmit / $ eslint — 0 errors, 1 warning (see Deviations)
$ vitest run — Test Files 16 passed (16), Tests 79 passed (79)
incl. normalize.test.ts (8 tests: odor-abstention override,
invalid/forbidden values, clamping, truncation, mock round-trip)
incl. suggest.test.ts (5 tests: store + normalize, dedupe, rerun,
429 rate limit, 400/403/409) + decision_source test
(ai_accepted ×2, human_override ×1, human_only ×3, FK linkage)
$ next build — suggest route registered; `/`, `/assess/*` intact
$ pnpm exec playwright test — 2 passed (happy-path + ai-suggest)

No-live-API confirmation: `pnpm test` green with no keys involved —
`AI_PROVIDER=mock` is pinned in `suggest.test.ts` and the Playwright
webServer env; nim/gemini unit tests stub `fetch`. The `nim` factory
default only activates in dev/prod environments holding keys.

## Manual check — live NIM run (real photo, key redacted)

Draft + 320×240 test photo uploaded, then:

$ POST /api/assessments/:id/suggest (AI_PROVIDER=nim, real key)
HTTP 200 CLIENT_MS 25714
{"suggestions":[
{"indicator":"clarity","suggested_value":"cannot_determine","confidence_band":"none","evidence":"","cues":[]},
{"indicator":"color","suggested_value":"cannot_determine","confidence_band":"none","evidence":"","cues":[]},
{"indicator":"algae","suggested_value":"cannot_determine","confidence_band":"none","evidence":"","cues":[]},
{"indicator":"litter","suggested_value":"cannot_determine","confidence_band":"none","evidence":"","cues":[]},
{"indicator":"flow","suggested_value":"cannot_determine","confidence_band":"none","evidence":"","cues":[]},
{"indicator":"odor","suggested_value":"cannot_determine","confidence_band":"none","evidence":"","cues":[]}],
"deduped":false,"provider":"nim",
"model":"nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
"photoSetHash":"825d9c…"}

The route sent the Section 8.2 tool schema as one forced function
(model, system prompt, rain context, base64 data-URI images,
temperature 0.3, top_p 0.9, max_tokens 800, reasoning_budget 2048; auth
in the `Bearer` header, redacted here). The model returned a tool call
with `image_quality: no_water_visible` and per-indicator abstentions —
correct for the synthetic waterless image, and a live proof that
abstention survives the whole stack. Raw NIM-level pairs are in
`phase-4-preflight.md`.

DB rows afterwards (assessment answered with six human values, submitted):

ENTRIES: [{"indicator":"algae","finalValue":"none","decisionSource":"human_only","aiSuggestionId":null},{"indicator":"clarity","finalValue":"muddy","decisionSource":"human_only","aiSuggestionId":null},{"indicator":"color","finalValue":"brown","decisionSource":"human_only","aiSuggestionId":null},{"indicator":"flow","finalValue":"slow","decisionSource":"human_only","aiSuggestionId":null},{"indicator":"litter","finalValue":"some","decisionSource":"human_only","aiSuggestionId":null},{"indicator":"odor","finalValue":"earthy","decisionSource":"human_only","aiSuggestionId":null}]
SUGGESTIONS (2 of 12 shown): [{"indicator":"clarity","suggestedValue":"cannot_determine","confidenceBand":"none","provider":"nim","model":"nvidia/nemotron-3-nano-omni-30b-a3b-reasoning","promptVersion":"v1","latencyMs":23984},{"indicator":"color","suggestedValue":"cannot_determine","confidenceBand":"none","provider":"nim","model":"nvidia/nemotron-3-nano-omni-30b-a3b-reasoning","promptVersion":"v1","latencyMs":23984}]

All `human_only` with null links is the correct rule outcome against
abstained suggestions. Accepted/overridden rows are proven by the mock
integration test (`computes decision_source server-side at submit`,
passing): clarity/cloudy → `ai_accepted` linked to its suggestion row,
color/green-vs-brown → `human_override`, odor/litter/flow →
`human_only` with null links. A live non-abstained suggestion was not
obtainable with synthetic images (the model correctly abstains on
non-water); a real stream photo in the demo video will exercise the
live accept path.

## Deviations from PROJECT.md

- Latency note (not a deviation, recorded risk): nemotron full-schema
  calls measured 13–30 s (free-tier variance); the 25 s route timeout
  stands per Section 8.4, so slow runs surface `provider_timeout` +
  the manual path. `reasoning_budget: 1024` was trialled and rejected
  (incoherent output, still ~30 s).
- `fix(ai)`: empty-string `AI_MODEL` skipped provider defaults and
  caused NIM 400s; falsy now falls through to defaults.
- `fix(ai)`: Gemini default corrected to live-verified `gemini-3.8-flash`.
- `GET` view maps suggestion rows to the public snake_case shape (the
  UI contract); caught by the new e2e spec, not by review.
- Lint: one allowed warning (`_input` unused in mock-provider).
- Test DBs remain `:memory:` (D-02).

## Commits in this phase

- 4074223 docs(decisions): add ADR-0008 for NIM/Gemini provider lineup
- a23e36a fix(wizard): clear stale not_applicable values off dry
- f110eff feat(ai): add provider interface and mock provider
- 1188de6 feat(ai): add v1 system prompt for suggestions
- 5200e6f feat(ai): add suggestion normalizer with abstention rules
- 2281dce feat(ai): add gemini provider
- 7294941 feat(api): add suggest route with rate limiting and retry
- 1a65078 feat(api): compute decision_source server-side on submit
- 2bcfa0e feat(wizard): add ai suggestion panel with evidence and override
- efe2492 test(e2e): add accept and override suggestion paths
- fd9f316 docs(verification): record NIM pre-flight results
- 3afa7fc fix(ai): default gemini model to live-verified 3.8-flash
- 81c5ed3 feat(ai): add nim provider with function-calling primary
- 542d123 feat(api): wire nim provider as the suggest default
- 2a51871 fix(ai): treat empty AI_MODEL as unset
