# ADR-0009: Suggest timeout 40 s, maxDuration 120 s

- Status: accepted
- Date: 2026-09-30
- Phase: 4 (follow-up)

## Context

PROJECT.md Section 8.4 specifies a 25 s timeout for AI suggestion calls
with one retry on schema failure or 5xx. Live Phase 4 evidence showed
`nemotron-3-nano-omni-30b-a3b-reasoning` on the NIM free tier swinging
13–30 s per full-schema call — roughly a coin flip against 25 s — while
`llama-3.2-11b-vision-instruct` answered the same shape in ~6 s.

## Decision

- Raise the per-attempt suggest timeout from 25 s to 40 s. The retry
  policy itself is unchanged (one retry on schema-validation failure or
  5xx only; timeouts are not retried).
- Set `maxDuration = 120` on the suggest route: covers two full 40 s
  attempts plus overhead. Verified against the real platform limit —
  Vercel Hobby allows 300 s default and maximum for functions (docs
  pages `functions/configuring-functions/duration`,
  `functions/limitations`, `plans/hobby`, all current as of 2026-09-30)
  — so 120 s fits with wide margin and no plan change is needed. (The
  Phase 9 gate in Section 5.1 re-confirms this at submission time.)

## Consequences

- Fewer spurious `provider_timeout` failures on slow free-tier runs;
  worst-case billed duration on Hobby rises, irrelevant at hackathon
  scale.
- Section 8.4's "Timeout 25 s" now reads 40 s for the suggest route via
  this ADR (source-of-truth hierarchy: latest accepted ADR wins).
