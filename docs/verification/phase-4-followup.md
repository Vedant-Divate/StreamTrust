# Phase 4 follow-up — timeout, default model, deployed-URL attempt

## 1. Timeout + platform limit (done)

Vercel docs checked live on 2026-09-30 (`functions/configuring-functions/
duration`, `functions/limitations`, `plans/hobby` — all agreeing):
**Hobby = 300 s default and maximum** for fluid-compute functions. So the
new 40 s per-attempt timeout plus `maxDuration = 120` (covers two full
attempts + overhead) fits with wide margin; no plan change needed. The
Phase 9 gate re-confirms this at submission time. Retry policy unchanged
(one retry on schema failure or 5xx; timeouts not retried). Recorded in
ADR-0009.

## 2. Default model (done)

`AI_MODEL` default is now `meta/llama-3.2-11b-vision-instruct`
(prompt-JSON path) in `.env.example` and `NimProvider`; nemotron stays
one explicit `AI_MODEL` away. ADR-0008 carries a dated Update section;
architecture unchanged. Verified by `nim-provider.test.ts` (default +
both paths, stubbed fetch) in `pnpm verify` (80/80).

## 3. Live timing with the new default (localhost, real key)

Draft + 320×240 test photo + `POST /suggest` against local dev with
`AI_PROVIDER=nim`, empty `AI_MODEL` (→ llama default):

- DRAFT 201, UPLOAD 201 (320×240 parsed server-side)
- SUGGEST **200 in 14,975 ms**: 5 suggestions
  (clarity/clear/high, color/colorless/high, litter/none/medium,
  flow/moderate/medium, odor/cannot_determine/none),
  `provider: nim`, `model: meta/llama-3.2-11b-vision-instruct`,
  `deduped: false`

That is ~25 s of margin under the 40 s ceiling. Honesty note: values
were confabulated onto a synthetic bands pattern (not water) — this run
proves the path and the timing, not accuracy. Accuracy is measured on
real photos by the Phase 8 eval set, not here.

## 4. Deployed URL run (done 2026-09-30, after env was configured)

The block cleared the same day: Turso env vars were set in Vercel,
the 9 tables were migrated to Turso (verified via `sqlite_master`),
and the deployment picked up the env (no code change needed).
`/api/health` now returns `{"status":"ok","db":"up","aiProvider":"nim",…}`.

Full live flow on `https://streamtrust.vercel.app` (real key, new
llama default, timings are client-measured):

- DRAFT 201 (`84aae4df-…`), UPLOAD 201 (320×240 parsed)
- SUGGEST **200 in 32,477 ms**: 6 suggestions
  (clarity/clear/high, color/green/medium, algae/none/medium,
  litter/none/medium, flow/moderate/low, odor/cannot_determine/none),
  `provider: nim`, `model: meta/llama-3.2-11b-vision-instruct`,
  `deduped: false`
- PATCH 200 (accepted clarity=clear, overrode the rest), SUBMIT 200
- Final rows: clarity `ai_accepted`, algae `ai_accepted`, litter
  `ai_accepted`, color `human_override`, flow `human_override`, odor
  `human_only` — every `ai_accepted`/`human_override` row links to its
  suggestion row; `human_only` links null. Exactly the Section 7.2 rule.

Two things this run proves at once: the new default completes with
margin under the 40 s ceiling (7.5 s to spare), and it would have
timed out under the old 25 s ceiling — the ADR-0009 raise was
necessary, not just precautionary. (An earlier 18.7 s run the same
morning shows the usual free-tier variance in both directions.)

Cleanup note: one orphan draft from the blocked-probe phase remains in
the Turso DB (`d7cedc88-…`, suggestions stored, no entries, never
submitted; owner cookie unknown). It carries no entries so it cannot
pose as a completed record; delete it via the Turso dashboard if a
pristine prod DB is wanted before demo traffic.
