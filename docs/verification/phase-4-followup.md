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

## 4. Deployed URL attempt (blocked, needs human)

`https://streamtrust.vercel.app/` landing is current, but **every API
route returns empty HTTP 500** (probed `/api/health` and
`POST /api/assessments` on 2026-09-30) — the production deployment has
no working database (likely missing/invalid `DATABASE_URL`), and with
no DB there is no photo storage, no suggestions, and no place a
`NIM_API_KEY` could take effect. This agent has no Vercel access, so it
cannot set env vars or run migrations.

To unblock, a human with Vercel access must, in the project Settings →
Environment Variables (Production):

1. `DATABASE_URL` = Turso `libsql://…` URL
2. `DATABASE_AUTH_TOKEN` = Turso token
3. `NIM_API_KEY` = NIM key (server-side only, never `NEXT_PUBLIC_`)
4. `AI_MODEL` = `meta/llama-3.2-11b-vision-instruct`
5. `AI_PROVIDER` = `nim`
6. Apply the Drizzle migrations in `src/server/db/migrations/` to the
   Turso database once (e.g. a one-off `drizzle-kit migrate` run
   against it), redeploy, and confirm `/api/health` returns
   `{"status":"ok","db":"up",…}`.

After that, say the word and the deployed-URL suggest timing run will
be executed and pasted here.
